/**
 * Wet Processing & Claims Verification Service
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { v4 as uuidv4 } from 'uuid';

export class WetProcessingService {
  static async dispatchToWetProcessing(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { loomOutputs: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    if (!order.loomOutputs || order.loomOutputs.length === 0) {
      throw new Error(`No loom output found for order ${request.orderTokenId}`);
    }

    const phaseValidation = await StateMachine.validatePhasePrerequisites('WET_PROCESSING', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    const dispatchTrackId = `DYE-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const wetProcessingLog = await prisma.wetProcessingLog.create({
      data: {
        orderTokenId: request.orderTokenId,
        dispatchTrackId,
        dispatchedToMill: new Date(),
        dispatchedAt: new Date(),
        inputTotalWeight: request.inputTotalWeight,
        status: 'PENDING',
      },
    });

    await prisma.orderToken.update({
      where: { id: request.orderTokenId },
      data: {
        status: 'WET_PROCESSING_INPROGRESS',
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        wetProcessingLogId: wetProcessingLog.id,
        dispatchTrackId: wetProcessingLog.dispatchTrackId,
        status: wetProcessingLog.status,
        inputTotalWeight: Number(wetProcessingLog.inputTotalWeight),
        dispatchedAt: wetProcessingLog.dispatchedAt,
        message: 'Fabric dispatched to dyehouse for wet processing',
      },
    };
  }

  static async logQualityTest(request) {
    const wetProcessingLog = await prisma.wetProcessingLog.findUnique({
      where: { id: request.wetProcessingLogId },
    });

    if (!wetProcessingLog) {
      throw new Error(`Wet processing log ${request.wetProcessingLogId} not found`);
    }

    const existingTest = await prisma.qualityTestLog.findFirst({
      where: {
        wetProcessingLogId: request.wetProcessingLogId,
        testType: request.testType,
      },
    });

    let qualityTest;
    if (existingTest) {
      qualityTest = await prisma.qualityTestLog.update({
        where: { id: existingTest.id },
        data: {
          result: request.result,
          notes: request.notes || existingTest.notes,
          testedBy: request.testedBy,
          testedAt: new Date(),
        },
      });
    } else {
      qualityTest = await prisma.qualityTestLog.create({
        data: {
          wetProcessingLogId: request.wetProcessingLogId,
          testType: request.testType,
          result: request.result,
          notes: request.notes,
          testedBy: request.testedBy,
          testedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      data: {
        qualityTestId: qualityTest.id,
        testType: qualityTest.testType,
        result: qualityTest.result,
        testedAt: qualityTest.testedAt,
        testedBy: qualityTest.testedBy,
        message: `Quality test ${request.testType} recorded`,
      },
    };
  }

  static async completeWetProcessing(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const wetProcessingLog = await prisma.wetProcessingLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
      include: { qualityTests: true },
    });

    if (!wetProcessingLog) {
      throw new Error(`Wet processing log not found for order ${request.orderTokenId}`);
    }

    const inputWeight = Number(wetProcessingLog.inputTotalWeight);
    const outputWeight = request.outputTotalWeight;
    const weightLossPercentage = ProductionValidator.calculateWeightLoss(inputWeight, outputWeight);

    const toleranceValidation = ProductionValidator.validateWeightLossTolerance(
      weightLossPercentage
    );

    const isWithinTolerance = toleranceValidation.isValid;
    const newStatus = isWithinTolerance ? 'PASSED' : 'FAILED';

    const updatedLog = await prisma.wetProcessingLog.update({
      where: { id: wetProcessingLog.id },
      data: {
        outputTotalWeight: request.outputTotalWeight,
        weightLossPercentage: weightLossPercentage,
        isWithinTolerance,
        status: newStatus,
        returnedAt: request.returnedAt,
        returnedFrom: request.returnedFrom,
      },
    });

    let claimDispute = null;

    if (!isWithinTolerance) {
      claimDispute = await prisma.claimDispute.create({
        data: {
          orderTokenId: request.orderTokenId,
          wetProcessingLogId: updatedLog.id,
          reason: `Weight loss ${weightLossPercentage}% is outside the 9-11% tolerance window`,
          weightLossPercentage: weightLossPercentage,
          expectedTolerance: '9% - 11%',
          claimStatus: 'OPEN',
        },
      });

      await prisma.orderToken.update({
        where: { id: request.orderTokenId },
        data: {
          status: 'FAILED',
        },
      });
    } else {
      await prisma.orderToken.update({
        where: { id: request.orderTokenId },
        data: {
          status: 'SURFACE_DECORATION_INPROGRESS',
        },
      });
    }

    const response = {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        wetProcessingLogId: updatedLog.id,
        inputTotalWeight: inputWeight,
        outputTotalWeight: request.outputTotalWeight,
        weightLossPercentage,
        isWithinTolerance,
        status: updatedLog.status,
        qualityTests: updatedLog.qualityTests.map((test) => ({
          testType: test.testType,
          result: test.result,
        })),
        returnedAt: updatedLog.returnedAt,
        message: toleranceValidation.message,
      },
    };

    if (claimDispute) {
      response.data.claimDispute = {
        claimDisputeId: claimDispute.id,
        claimStatus: claimDispute.claimStatus,
        message: `ALERT: Automated financial claim dispute created. Weight loss outside tolerance window.`,
      };
    }

    return response;
  }

  static async getProcessingStatus(orderTokenId) {
    const wetProcessingLog = await prisma.wetProcessingLog.findFirst({
      where: { orderTokenId },
      include: {
        qualityTests: true,
        claimDispute: true,
      },
    });

    if (!wetProcessingLog) {
      return {
        success: false,
        error: 'WET_PROCESSING_LOG_NOT_FOUND',
        message: `No wet processing log found for order ${orderTokenId}`,
      };
    }

    return {
      success: true,
      data: {
        orderTokenId,
        wetProcessingLogId: wetProcessingLog.id,
        dispatchTrackId: wetProcessingLog.dispatchTrackId,
        status: wetProcessingLog.status,
        inputTotalWeight: Number(wetProcessingLog.inputTotalWeight),
        outputTotalWeight: wetProcessingLog.outputTotalWeight ? Number(wetProcessingLog.outputTotalWeight) : null,
        weightLossPercentage: wetProcessingLog.weightLossPercentage
          ? Number(wetProcessingLog.weightLossPercentage)
          : null,
        isWithinTolerance: wetProcessingLog.isWithinTolerance,
        qualityTests: wetProcessingLog.qualityTests.map((test) => ({
          testId: test.id,
          testType: test.testType,
          result: test.result,
          notes: test.notes,
          testedBy: test.testedBy,
          testedAt: test.testedAt,
        })),
        claimDispute: wetProcessingLog.claimDispute
          ? {
              claimDisputeId: wetProcessingLog.claimDispute.id,
              claimStatus: wetProcessingLog.claimDispute.claimStatus,
              reason: wetProcessingLog.claimDispute.reason,
              weightLossPercentage: Number(wetProcessingLog.claimDispute.weightLossPercentage),
              expectedTolerance: wetProcessingLog.claimDispute.expectedTolerance,
            }
          : null,
        dispatchedAt: wetProcessingLog.dispatchedAt,
        returnedAt: wetProcessingLog.returnedAt,
      },
    };
  }

  static async getMandatoryQualityTests(wetProcessingLogId) {
    const mandatoryTests = ['COLOR_FASTNESS', 'SHRINKING', 'GASOLINE_SMELL'];

    const tests = await prisma.qualityTestLog.findMany({
      where: {
        wetProcessingLogId,
      },
    });

    const testStatus = mandatoryTests.map((testType) => {
      const test = tests.find((t) => t.testType === testType);
      return {
        testType,
        recorded: !!test,
        result: test?.result || null,
        testedAt: test?.testedAt || null,
      };
    });

    const allTestsCompleted = testStatus.every((t) => t.recorded);

    return {
      success: true,
      data: {
        wetProcessingLogId,
        allTestsCompleted,
        testStatus,
        message: allTestsCompleted ? 'All mandatory quality tests completed' : 'Some quality tests are pending',
      },
    };
  }
}
