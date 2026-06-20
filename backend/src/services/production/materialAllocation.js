/**
 * Material Allocation Service
 * Handles the first gate: Material Allocation Gate
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';

export class MaterialAllocationService {
  static async createRequisition(request) {
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

    const lockValidation = StateMachine.validateInstructionLock(order.isInstructionsLocked);
    if (!lockValidation.valid) {
      throw new Error(lockValidation.reason);
    }

    const masterSample = await prisma.warehouseMaterialInventory.findUnique({
      where: { id: request.requestedMaterialId },
    });

    if (!masterSample) {
      throw new Error(`Master sample material ${request.requestedMaterialId} not found`);
    }

    const volumeValidation = ProductionValidator.validateRequisitionAgainstMasterSample(
      request.requestedVolume,
      Number(masterSample.preApprovedVolume)
    );

    if (!volumeValidation.isValid) {
      throw new Error(volumeValidation.message);
    }

    const requisition = await prisma.productionRequisition.create({
      data: {
        orderTokenId: request.orderTokenId,
        requestedMaterialId: request.requestedMaterialId,
        requestedVolume: request.requestedVolume,
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

  static async releaseRequisition(request) {
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

  static async dispatchMaterial(request) {
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

    if (request.dispatchedVolume > Number(requisition.requestedVolume)) {
      throw new Error(
        `Dispatch volume ${request.dispatchedVolume} exceeds requisition volume ${requisition.requestedVolume}`
      );
    }

    const updatedRequisition = await prisma.productionRequisition.update({
      where: { id: request.requisitionId },
      data: {
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
        dispatchedBy: request.dispatchedBy,
      },
    });

    const dispatchLog = await prisma.materialDispatchLog.create({
      data: {
        requisitionId: request.requisitionId,
        dispatchedVolume: request.dispatchedVolume,
        dispatchedAt: new Date(),
      },
    });

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

  static async getRequisitionStatus(requisitionId) {
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

  static async cancelRequisition(request) {
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
