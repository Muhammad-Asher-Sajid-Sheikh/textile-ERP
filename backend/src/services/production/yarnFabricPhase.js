/**
 * Yarn & Fabric Phase Service
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';

export class YarnFabricPhaseService {
  static async initiateYarnTwisting(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    if (!order.techPack) {
      throw new Error(`Tech Pack not found for order ${request.orderTokenId}`);
    }

    if (!order.techPack.requiresYarnTwisting) {
      return {
        success: true,
        data: {
          orderTokenId: request.orderTokenId,
          yarnTwistingStatus: 'NOT_REQUIRED',
          message: 'Yarn twisting not required per Tech Pack specifications',
        },
      };
    }

    let loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!loomLog) {
      loomLog = await prisma.loomOutputLog.create({
        data: {
          orderTokenId: request.orderTokenId,
          yarnTwistingStatus: 'PENDING',
          vendorId: request.twistingVendorId,
          dispatchedToVendor: new Date(),
          weavingStatus: 'PENDING',
          rollPieceCount: 0,
          totalMassWeight: 0,
          fabricDensityGsm: 0,
          totalLength: 0,
          poYieldTargetWeight: 0,
        },
      });
    } else {
      loomLog = await prisma.loomOutputLog.update({
        where: { id: loomLog.id },
        data: {
          yarnTwistingStatus: 'PENDING',
          vendorId: request.twistingVendorId,
          twistingLogDetails: request.dispatchDetails || null,
        },
      });
    }

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        loomLogId: loomLog.id,
        yarnTwistingStatus: loomLog.yarnTwistingStatus,
        dispatchedToVendor: loomLog.dispatchedToVendor,
        message: 'Yarn twisting initiated - awaiting vendor processing',
      },
    };
  }

  static async completeYarnTwisting(request) {
    const loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!loomLog) {
      throw new Error(`Loom output log not found for order ${request.orderTokenId}`);
    }

    const updated = await prisma.loomOutputLog.update({
      where: { id: loomLog.id },
      data: {
        yarnTwistingStatus: 'COMPLETED',
        twistingCompletedAt: request.twistingCompletedAt,
        twistingLogDetails: request.notes || loomLog.twistingLogDetails,
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        yarnTwistingStatus: updated.yarnTwistingStatus,
        twistingCompletedAt: updated.twistingCompletedAt,
        message: 'Yarn twisting completed',
      },
    };
  }

  static async dispatchToWeaving(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const phaseValidation = await StateMachine.validatePhasePrerequisites('YARN_WEAVING', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    let loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (loomLog) {
      loomLog = await prisma.loomOutputLog.update({
        where: { id: loomLog.id },
        data: {
          weavingStatus: 'INPROGRESS',
          vendorId: request.vendorId,
          dispatchedToVendor: new Date(),
        },
      });
    } else {
      loomLog = await prisma.loomOutputLog.create({
        data: {
          orderTokenId: request.orderTokenId,
          weavingStatus: 'INPROGRESS',
          vendorId: request.vendorId,
          dispatchedToVendor: new Date(),
          yarnTwistingStatus: 'NOT_REQUIRED',
          rollPieceCount: 0,
          totalMassWeight: 0,
          fabricDensityGsm: 0,
          totalLength: 0,
          poYieldTargetWeight: 0,
        },
      });
    }

    await prisma.orderToken.update({
      where: { id: request.orderTokenId },
      data: {
        status: 'YARN_WEAVING_INPROGRESS',
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        loomLogId: loomLog.id,
        weavingStatus: loomLog.weavingStatus,
        dispatchedToVendor: loomLog.dispatchedToVendor,
        vendorId: request.vendorId,
        message: 'Yarn dispatched to weaving vendor',
      },
    };
  }

  static async logRawFabricOutput(request) {
    const gsmValidation = ProductionValidator.validateGsmValue(request.fabricDensityGsm);
    if (!gsmValidation.isValid) {
      throw new Error(gsmValidation.message);
    }

    let loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!loomLog) {
      throw new Error(`Loom output log not found for order ${request.orderTokenId}`);
    }

    const yieldCompliance = ProductionValidator.validatePoYieldCompliance(
      request.totalMassWeight,
      request.poYieldTargetWeight
    );

    let actualWasteWeight = null;
    let wasteVarianceLogged = false;

    if (!yieldCompliance.isCompliant) {
      actualWasteWeight = yieldCompliance.wasteVariance;
      wasteVarianceLogged = true;
    }

    loomLog = await prisma.loomOutputLog.update({
      where: { id: loomLog.id },
      data: {
        weavingStatus: 'COMPLETED',
        rollPieceCount: request.rollPieceCount,
        totalMassWeight: request.totalMassWeight,
        fabricDensityGsm: request.fabricDensityGsm,
        totalLength: request.totalLength,
        poYieldTargetWeight: request.poYieldTargetWeight,
        actualWasteWeight,
        wasteVarianceLogged,
        returnedAt: request.returnedAt,
        returnedStatus: 'COMPLETED',
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
        loomLogId: loomLog.id,
        weavingStatus: loomLog.weavingStatus,
        fabricMetrics: {
          rollPieceCount: loomLog.rollPieceCount,
          totalMassWeight: Number(loomLog.totalMassWeight),
          fabricDensityGsm: Number(loomLog.fabricDensityGsm),
          totalLength: Number(loomLog.totalLength),
        },
        yieldCompliance: {
          isCompliant: yieldCompliance.isCompliant,
          wasteVariance: yieldCompliance.wasteVariance,
          message: yieldCompliance.message,
          factoryLossLogged: wasteVarianceLogged,
        },
        message: 'Raw fabric output logged successfully',
      },
    };
  }

  static async getPhaseStatus(orderTokenId) {
    const loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId },
    });

    if (!loomLog) {
      return {
        success: false,
        error: 'LOOM_LOG_NOT_FOUND',
        message: `No loom output log found for order ${orderTokenId}`,
      };
    }

    return {
      success: true,
      data: {
        orderTokenId,
        loomLogId: loomLog.id,
        yarnTwistingStatus: loomLog.yarnTwistingStatus,
        twistingCompletedAt: loomLog.twistingCompletedAt,
        weavingStatus: loomLog.weavingStatus,
        fabricMetrics: {
          rollPieceCount: loomLog.rollPieceCount,
          totalMassWeight: Number(loomLog.totalMassWeight),
          fabricDensityGsm: Number(loomLog.fabricDensityGsm),
          totalLength: Number(loomLog.totalLength),
        },
        poYieldTarget: Number(loomLog.poYieldTargetWeight),
        actualWasteWeight: loomLog.actualWasteWeight ? Number(loomLog.actualWasteWeight) : null,
        wasteVarianceLogged: loomLog.wasteVarianceLogged,
        returnedAt: loomLog.returnedAt,
      },
    };
  }
}
