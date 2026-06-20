/**
 * Yarn & Fabric Phase Service
 * Handles 2nd gate: Yarn & Fabric Phase (3rd Party Vendor)
 * - Checks Tech Pack for yarn twisting requirement (2-Ply single yarn)
 * - Routes through twisting vendor if needed
 * - Tracks raw fabric loops: piece counts, mass weight, density (GSM), length (Yards)
 * - Validates output against PO yield targets (waste variance logged as Factory Loss)
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { Decimal } from '@prisma/client/runtime/client.js';

export interface InitiateYarnTwistingRequest {
  orderTokenId: string;
  twistingVendorId: string;
  dispatchDetails?: string;
}

export interface CompleteYarnTwistingRequest {
  orderTokenId: string;
  twistingCompletedAt: Date;
  notes?: string;
}

export interface DispatchToWeavingRequest {
  orderTokenId: string;
  vendorId: string;
  yarnType: string;
  totalYardage: number;
  requiredYarnWeight: number; // in Kg
}

export interface LogRawFabricOutputRequest {
  orderTokenId: string;
  vendorId: string;
  rollPieceCount: number;
  totalMassWeight: number; // in Kg
  fabricDensityGsm: number;
  totalLength: number; // in Yards
  poYieldTargetWeight: number; // in Kg
  returnedAt: Date;
}

export class YarnFabricPhaseService {
  /**
   * Initiates yarn twisting if required by Tech Pack
   */
  static async initiateYarnTwisting(request: InitiateYarnTwistingRequest) {
    // Validate order exists
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

    // Check if yarn twisting is required
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

    // Create or update loom output log with twisting status
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
          totalMassWeight: new Decimal(0),
          fabricDensityGsm: new Decimal(0),
          totalLength: new Decimal(0),
          poYieldTargetWeight: new Decimal(0),
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

  /**
   * Completes yarn twisting process
   */
  static async completeYarnTwisting(request: CompleteYarnTwistingRequest) {
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

  /**
   * Dispatches prepared yarn to weaving vendor
   */
  static async dispatchToWeaving(request: DispatchToWeavingRequest) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    // Validate phase prerequisites
    const phaseValidation = await StateMachine.validatePhasePrerequisites('YARN_WEAVING', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    // Create or update loom output log
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
          totalMassWeight: new Decimal(0),
          fabricDensityGsm: new Decimal(0),
          totalLength: new Decimal(0),
          poYieldTargetWeight: new Decimal(0),
        },
      });
    }

    // Update order status
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

  /**
   * Logs raw fabric output from weaving/knitting vendor
   * Validates against PO yield targets
   */
  static async logRawFabricOutput(request: LogRawFabricOutputRequest) {
    // Validate GSM is within realistic thresholds
    const gsmValidation = ProductionValidator.validateGsmValue(request.fabricDensityGsm);
    if (!gsmValidation.isValid) {
      throw new Error(gsmValidation.message);
    }

    // Update loom output log with fabric metrics
    let loomLog = await prisma.loomOutputLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!loomLog) {
      throw new Error(`Loom output log not found for order ${request.orderTokenId}`);
    }

    // Validate PO yield compliance
    const yieldCompliance = ProductionValidator.validatePoYieldCompliance(
      request.totalMassWeight,
      request.poYieldTargetWeight
    );

    let actualWasteWeight: Decimal | null = null;
    let wasteVarianceLogged = false;

    if (!yieldCompliance.isCompliant) {
      actualWasteWeight = new Decimal(yieldCompliance.wasteVariance);
      wasteVarianceLogged = true;
    }

    loomLog = await prisma.loomOutputLog.update({
      where: { id: loomLog.id },
      data: {
        weavingStatus: 'COMPLETED',
        rollPieceCount: request.rollPieceCount,
        totalMassWeight: new Decimal(request.totalMassWeight),
        fabricDensityGsm: new Decimal(request.fabricDensityGsm),
        totalLength: new Decimal(request.totalLength),
        poYieldTargetWeight: new Decimal(request.poYieldTargetWeight),
        actualWasteWeight,
        wasteVarianceLogged,
        returnedAt: request.returnedAt,
        returnedStatus: 'COMPLETED',
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

  /**
   * Retrieves yarn & fabric phase status for an order
   */
  static async getPhaseStatus(orderTokenId: string) {
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
