/**
 * Wet Processing & Claims Verification Service
 * Handles 3rd gate: Wet Processing & Claims Verification (3rd Party)
 * - Dispatches raw fabric to dyehouses with distinct Digital Track ID
 * - Lab validation: Color Fastness, Shrinking Status, Gasoline Smell/Residue
 * - Weight loss calculation: ((Input - Output) / Input) × 100
 * - Gate logic: 9-11% tolerance window triggers claim disputes if failed
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { Decimal } from '@prisma/client/runtime/client.js';
import { v4 as uuidv4 } from 'uuid';

export interface DispatchToWetProcessingRequest {
  orderTokenId: string;
  millId: string;
  inputTotalWeight: number; // in Kg
  dispatchDetails?: string;
}

export interface LogQualityTestRequest {
  wetProcessingLogId: string;
  testType: 'COLOR_FASTNESS' | 'SHRINKING' | 'GASOLINE_SMELL';
  result: 'PASSED' | 'FAILED';
  notes?: string;
  testedBy: string;
}

export interface CompleteWetProcessingRequest {
  orderTokenId: string;
  outputTotalWeight: number; // in Kg
  returnedAt: Date;
  returnedFrom: string;
}

export class WetProcessingService {
  /**
   * Dispatches raw fabric to dyehouses
   * Generates unique Digital Track ID for tracking
   */
  static async dispatchToWetProcessing(request: DispatchToWetProcessingRequest) {
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

    // Validate phase prerequisites
    const phaseValidation = await StateMachine.validatePhasePrerequisites('WET_PROCESSING', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    // Generate unique Digital Track ID
    const dispatchTrackId = `DYE-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Create wet processing log
    const wetProcessingLog = await prisma.wetProcessingLog.create({
      data: {
        orderTokenId: request.orderTokenId,
        dispatchTrackId,
        dispatchedToMill: new Date(),
        dispatchedAt: new Date(),
        inputTotalWeight: new Decimal(request.inputTotalWeight),
        status: 'PENDING',
      },
    });

    // Update order status
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

  /**
   * Logs quality test results
   * Three mandatory tests: Color Fastness, Shrinking, Gasoline Smell
   */
  static async logQualityTest(request: LogQualityTestRequest) {
    const wetProcessingLog = await prisma.wetProcessingLog.findUnique({
      where: { id: request.wetProcessingLogId },
    });

    if (!wetProcessingLog) {
      throw new Error(`Wet processing log ${request.wetProcessingLogId} not found`);
    }

    // Check if test already exists
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

  /**
   * Completes wet processing and calculates weight loss
   * Triggers claim dispute if weight loss outside 9-11% tolerance
   */
  static async completeWetProcessing(request: CompleteWetProcessingRequest) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    // Get wet processing log
    const wetProcessingLog = await prisma.wetProcessingLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
      include: { qualityTests: true },
    });

    if (!wetProcessingLog) {
      throw new Error(`Wet processing log not found for order ${request.orderTokenId}`);
    }

    // Calculate weight loss percentage
    const inputWeight = Number(wetProcessingLog.inputTotalWeight);
    const outputWeight = request.outputTotalWeight;
    const weightLossPercentage = ProductionValidator.calculateWeightLoss(inputWeight, outputWeight);

    // Validate weight loss tolerance
    const toleranceValidation = ProductionValidator.validateWeightLossTolerance(
      weightLossPercentage
    );

    const isWithinTolerance = toleranceValidation.isValid;
    const newStatus = isWithinTolerance ? 'PASSED' : 'FAILED';

    // Update wet processing log
    const updatedLog = await prisma.wetProcessingLog.update({
      where: { id: wetProcessingLog.id },
      data: {
        outputTotalWeight: new Decimal(request.outputTotalWeight),
        weightLossPercentage: new Decimal(weightLossPercentage),
        isWithinTolerance,
        status: newStatus,
        returnedAt: request.returnedAt,
        returnedFrom: request.returnedFrom,
      },
    });

    let claimDispute = null;

    // Create claim dispute if weight loss outside tolerance
    if (!isWithinTolerance) {
      claimDispute = await prisma.claimDispute.create({
        data: {
          orderTokenId: request.orderTokenId,
          wetProcessingLogId: updatedLog.id,
          reason: `Weight loss ${weightLossPercentage}% is outside the 9-11% tolerance window`,
          weightLossPercentage: new Decimal(weightLossPercentage),
          expectedTolerance: '9% - 11%',
          claimStatus: 'OPEN',
        },
      });

      // Update order status to failed
      await prisma.orderToken.update({
        where: { id: request.orderTokenId },
        data: {
          status: 'FAILED',
        },
      });
    } else {
      // Update order status to next phase
      await prisma.orderToken.update({
        where: { id: request.orderTokenId },
        data: {
          status: 'SURFACE_DECORATION_INPROGRESS',
        },
      });
    }

    const response: any = {
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

  /**
   * Retrieves wet processing status and all quality tests
   */
  static async getProcessingStatus(orderTokenId: string) {
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

  /**
   * Retrieves all mandatory quality tests for a wet processing log
   */
  static async getMandatoryQualityTests(wetProcessingLogId: string) {
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
