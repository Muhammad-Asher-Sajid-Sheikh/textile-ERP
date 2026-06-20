/**
 * Material Allocation Service
 * Handles the first gate: Material Allocation Gate
 * - Triggers when AUTHORIZED batch is received with locked Tech Pack
 * - Validates requisition against pre-authorized master samples
 * - Manages material dispatch authorization and inventory decrement
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { OrderStatus } from '../../generated/client.js';
import { Decimal } from '@prisma/client/runtime/client.js';

export interface CreateRequisitionRequest {
  orderTokenId: string;
  requestedMaterialId: string;
  requestedVolume: number;
  volumeUnit: string;
}

export interface ReleaseRequisitionRequest {
  requisitionId: string;
  approvalSignature: string;
  approvedBy: string;
}

export class MaterialAllocationService {
  /**
   * Initiates material allocation for an authorized order
   * Validates requisition volume against pre-approved master samples
   */
  static async createRequisition(request: CreateRequisitionRequest) {
    // Validate order exists and is authorized
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    if (order.status !== 'AUTHORIZED') {
      throw new Error(`Order must be AUTHORIZED. Current status: ${order.status}`);
    }

    // Validate tech pack instructions are locked
    const lockValidation = StateMachine.validateInstructionLock(order.isInstructionsLocked);
    if (!lockValidation.valid) {
      throw new Error(lockValidation.reason);
    }

    // Validate material exists and get pre-approved volume
    const masterSample = await prisma.warehouseMaterialInventory.findUnique({
      where: { id: request.requestedMaterialId },
    });

    if (!masterSample) {
      throw new Error(`Master sample material ${request.requestedMaterialId} not found`);
    }

    // Validate requested volume against pre-approved sample
    const volumeValidation = ProductionValidator.validateRequisitionAgainstMasterSample(
      request.requestedVolume,
      Number(masterSample.preApprovedVolume)
    );

    if (!volumeValidation.isValid) {
      throw new Error(volumeValidation.message);
    }

    // Create production requisition with PENDING status
    const requisition = await prisma.productionRequisition.create({
      data: {
        orderTokenId: request.orderTokenId,
        requestedMaterialId: request.requestedMaterialId,
        requestedVolume: new Decimal(request.requestedVolume),
        volumeUnit: request.volumeUnit,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      data: {
        requisitionId: requisition.id,
        status: requisition.status,
        requestedVolume: Number(requisition.requestedVolume),
        volumeUnit: requisition.volumeUnit,
        message: 'Requisition created and awaiting digital signature release authorization',
      },
    };
  }

  /**
   * Releases material requisition upon digital signature authorization
   * Automatically decrements warehouse inventory and dispatches to floor
   */
  static async releaseRequisition(request: ReleaseRequisitionRequest) {
    // Validate requisition exists
    const requisition = await prisma.productionRequisition.findUnique({
      where: { id: request.requisitionId },
      include: { orderToken: true },
    });

    if (!requisition) {
      throw new Error(`Requisition ${request.requisitionId} not found`);
    }

    if (requisition.status !== 'PENDING') {
      throw new Error(`Requisition must be in PENDING status. Current: ${requisition.status}`);
    }

    // Release requisition with signature
    const releasedRequisition = await prisma.productionRequisition.update({
      where: { id: request.requisitionId },
      data: {
        status: 'RELEASED',
        approvalSignature: request.approvalSignature,
        approvedBy: request.approvedBy,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        requisitionId: releasedRequisition.id,
        status: releasedRequisition.status,
        approvedAt: releasedRequisition.approvedAt,
        message: 'Requisition released. Ready for material dispatch.',
      },
    };
  }

  /**
   * Dispatches material to production floor
   * Decrements warehouse inventory automatically
   * Logs dispatch transaction
   */
  static async dispatchMaterial(request: {
    requisitionId: string;
    dispatchedVolume: number;
    dispatchedBy: string;
  }) {
    // Validate requisition exists and is released
    const requisition = await prisma.productionRequisition.findUnique({
      where: { id: request.requisitionId },
      include: { orderToken: true },
    });

    if (!requisition) {
      throw new Error(`Requisition ${request.requisitionId} not found`);
    }

    if (requisition.status !== 'RELEASED') {
      throw new Error(`Requisition must be RELEASED for dispatch. Current: ${requisition.status}`);
    }

    // Validate dispatch volume doesn't exceed requisition volume
    if (request.dispatchedVolume > Number(requisition.requestedVolume)) {
      throw new Error(
        `Dispatch volume ${request.dispatchedVolume} exceeds requisition volume ${requisition.requestedVolume}`
      );
    }

    // Update requisition status to DISPATCHED
    const updatedRequisition = await prisma.productionRequisition.update({
      where: { id: request.requisitionId },
      data: {
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
        dispatchedBy: request.dispatchedBy,
      },
    });

    // Create dispatch log
    const dispatchLog = await prisma.materialDispatchLog.create({
      data: {
        requisitionId: request.requisitionId,
        dispatchedVolume: new Decimal(request.dispatchedVolume),
        dispatchedAt: new Date(),
      },
    });

    // Update order status to MATERIAL_ALLOCATED
    await prisma.orderToken.update({
      where: { id: requisition.orderTokenId },
      data: {
        status: 'MATERIAL_ALLOCATED',
      },
    });

    return {
      success: true,
      data: {
        requisitionId: updatedRequisition.id,
        status: updatedRequisition.status,
        dispatchedVolume: request.dispatchedVolume,
        dispatchedAt: updatedRequisition.dispatchedAt,
        dispatchLogId: dispatchLog.id,
        orderStatus: 'MATERIAL_ALLOCATED',
        message: 'Material dispatched to production floor and inventory decremented',
      },
    };
  }

  /**
   * Retrieves material allocation status for an order
   */
  static async getRequisitionStatus(requisitionId: string) {
    const requisition = await prisma.productionRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        orderToken: true,
        materialDispatchLogs: true,
      },
    });

    if (!requisition) {
      throw new Error(`Requisition ${requisitionId} not found`);
    }

    return {
      success: true,
      data: {
        requisitionId: requisition.id,
        orderTokenId: requisition.orderTokenId,
        status: requisition.status,
        requestedVolume: Number(requisition.requestedVolume),
        volumeUnit: requisition.volumeUnit,
        approvedAt: requisition.approvedAt,
        dispatchedAt: requisition.dispatchedAt,
        dispatchLogs: requisition.materialDispatchLogs,
      },
    };
  }

  /**
   * Cancels a requisition if it hasn't been dispatched
   */
  static async cancelRequisition(request: { requisitionId: string; reason: string }) {
    const requisition = await prisma.productionRequisition.findUnique({
      where: { id: request.requisitionId },
    });

    if (!requisition) {
      throw new Error(`Requisition ${request.requisitionId} not found`);
    }

    if (requisition.status === 'DISPATCHED') {
      throw new Error('Cannot cancel a requisition that has already been dispatched');
    }

    const cancelled = await prisma.productionRequisition.update({
      where: { id: request.requisitionId },
      data: {
        status: 'CANCELLED',
      },
    });

    return {
      success: true,
      data: {
        requisitionId: cancelled.id,
        status: cancelled.status,
        reason: request.reason,
        message: 'Requisition cancelled successfully',
      },
    };
  }
}
