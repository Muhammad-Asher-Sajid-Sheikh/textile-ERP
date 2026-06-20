/**
 * QC & Pre-Shipping Sample Service
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';

export class QcPreShippingService {
  static async startQcInspection(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const phaseValidation = await StateMachine.validatePhasePrerequisites('QC', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    const qcInspection = await prisma.qcInspection.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'PENDING',
        overallStatus: 'PENDING',
      },
    });

    await prisma.orderToken.update({
      where: { id: request.orderTokenId },
      data: {
        status: 'QC_VERIFICATION_INPROGRESS',
      },
    });

    return {
      success: true,
      data: {
        qcInspectionId: qcInspection.id,
        orderTokenId: request.orderTokenId,
        status: qcInspection.status,
        mandatoryAudits: ['STRUCTURAL', 'AESTHETIC', 'ASEPTIC'],
        message: '100% QC inspection initiated - awaiting audit completion',
      },
    };
  }

  static async logQcAudit(request) {
    const qcInspection = await prisma.qcInspection.findUnique({
      where: { id: request.qcInspectionId },
    });

    if (!qcInspection) {
      throw new Error(`QC inspection ${request.qcInspectionId} not found`);
    }

    const newAuditResult = {
      auditType: request.auditType,
      passed: request.passed,
      findings: request.findings || null,
      inspectedAt: new Date(),
    };

    const updateData = {};

    if (request.auditType === 'STRUCTURAL') {
      updateData.structuralAudit = newAuditResult;
    } else if (request.auditType === 'AESTHETIC') {
      updateData.aestheticAudit = newAuditResult;
    } else if (request.auditType === 'ASEPTIC') {
      updateData.asepticAudit = newAuditResult;
    }

    const updated = await prisma.qcInspection.update({
      where: { id: request.qcInspectionId },
      data: updateData,
    });

    return {
      success: true,
      data: {
        qcInspectionId: updated.id,
        auditType: request.auditType,
        passed: request.passed,
        findings: request.findings,
        message: `${request.auditType} audit logged`,
      },
    };
  }

  static async completeQcInspection(request) {
    const qcInspection = await prisma.qcInspection.findUnique({
      where: { id: request.qcInspectionId },
    });

    if (!qcInspection) {
      throw new Error(`QC inspection ${request.qcInspectionId} not found`);
    }

    if (!qcInspection.structuralAudit || !qcInspection.aestheticAudit || !qcInspection.asepticAudit) {
      throw new Error('All three audits (STRUCTURAL, AESTHETIC, ASEPTIC) must be completed');
    }

    const allPassed =
      qcInspection.structuralAudit.passed &&
      qcInspection.aestheticAudit.passed &&
      qcInspection.asepticAudit.passed;

    const overallStatus = allPassed ? 'PASSED' : 'FAILED';

    const updated = await prisma.qcInspection.update({
      where: { id: request.qcInspectionId },
      data: {
        status: 'VERIFIED',
        overallStatus,
        inspectionNotes: request.notes,
        inspectedBy: request.inspectedBy,
        inspectedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        qcInspectionId: updated.id,
        overallStatus: updated.overallStatus,
        auditResults: {
          structural: qcInspection.structuralAudit,
          aesthetic: qcInspection.aestheticAudit,
          aseptic: qcInspection.asepticAudit,
        },
        message: allPassed ? 'QC verification PASSED - ready for PS gate' : 'QC verification FAILED',
      },
    };
  }

  static async initiatePsSample(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const qcInspection = await prisma.qcInspection.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!qcInspection || qcInspection.overallStatus !== 'PASSED') {
      throw new Error('QC verification must be passed before PS sample gate');
    }

    const { sampleSize, sampleUnits } = ProductionValidator.calculatePsSampleSize(
      request.totalCargoUnits
    );

    const psLog = await prisma.preShippingSample.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'PENDING',
        totalCargoUnits: request.totalCargoUnits,
        sampleSize: sampleSize,
        sampleUnits,
      },
    });

    await prisma.orderToken.update({
      where: { id: request.orderTokenId },
      data: {
        status: 'PS_SAMPLE_PENDING',
      },
    });

    return {
      success: true,
      data: {
        psLogId: psLog.id,
        orderTokenId: request.orderTokenId,
        totalCargoUnits: psLog.totalCargoUnits,
        sampleSize: Number(psLog.sampleSize),
        sampleUnits: psLog.sampleUnits,
        status: psLog.status,
        message: `Pre-Shipping sample created: 10% (${psLog.sampleUnits} units) of ${request.totalCargoUnits} total units`,
      },
    };
  }

  static async sendPsSampleToCustomer(request) {
    const psLog = await prisma.preShippingSample.findUnique({
      where: { id: request.psLogId },
    });

    if (!psLog) {
      throw new Error(`PS log ${request.psLogId} not found`);
    }

    if (psLog.status !== 'PENDING') {
      throw new Error(`PS log must be in PENDING status. Current: ${psLog.status}`);
    }

    const updated = await prisma.preShippingSample.update({
      where: { id: request.psLogId },
      data: {
        status: 'SENT_TO_CUSTOMER',
        sentAt: request.sentAt,
        sentTo: request.sentTo,
      },
    });

    return {
      success: true,
      data: {
        psLogId: updated.id,
        status: updated.status,
        sentAt: updated.sentAt,
        sentTo: updated.sentTo,
        message: `Pre-Shipping sample sent to customer ${request.sentTo}. Awaiting approval.`,
      },
    };
  }

  static async approvePsSample(request) {
    const psLog = await prisma.preShippingSample.findUnique({
      where: { id: request.psLogId },
      include: { orderToken: true },
    });

    if (!psLog) {
      throw new Error(`PS log ${request.psLogId} not found`);
    }

    if (psLog.status !== 'SENT_TO_CUSTOMER') {
      throw new Error(`PS log must be SENT_TO_CUSTOMER. Current: ${psLog.status}`);
    }

    const updated = await prisma.preShippingSample.update({
      where: { id: request.psLogId },
      data: {
        status: 'APPROVED',
        customerApproval: true,
        customerApprovedAt: request.approvedAt,
        customerApprovedBy: request.customerApprovedBy,
      },
    });

    await prisma.orderToken.update({
      where: { id: psLog.orderTokenId },
      data: {
        status: 'PS_APPROVED',
        isPsApproved: true,
      },
    });

    return {
      success: true,
      data: {
        psLogId: updated.id,
        status: updated.status,
        customerApprovedAt: updated.customerApprovedAt,
        customerApprovedBy: updated.customerApprovedBy,
        orderStatus: 'PS_APPROVED',
        message: 'Customer approved pre-shipping sample. Order ready for export.',
      },
    };
  }

  static async rejectPsSample(request) {
    const psLog = await prisma.preShippingSample.findUnique({
      where: { id: request.psLogId },
      include: { orderToken: true },
    });

    if (!psLog) {
      throw new Error(`PS log ${request.psLogId} not found`);
    }

    if (psLog.status !== 'SENT_TO_CUSTOMER') {
      throw new Error(`PS log must be SENT_TO_CUSTOMER. Current: ${psLog.status}`);
    }

    const updated = await prisma.preShippingSample.update({
      where: { id: request.psLogId },
      data: {
        status: 'REJECTED',
        customerApproval: false,
        reworkInitiatedAt: new Date(),
        reworkOrders: request.reworkOrders || 'Rework initiated due to customer rejection',
      },
    });

    await prisma.orderToken.update({
      where: { id: psLog.orderTokenId },
      data: {
        status: 'ASSEMBLY_INPROGRESS',
        isPsApproved: false,
      },
    });

    return {
      success: true,
      data: {
        psLogId: updated.id,
        status: updated.status,
        reworkInitiatedAt: updated.reworkInitiatedAt,
        reworkOrders: updated.reworkOrders,
        orderStatus: 'ASSEMBLY_INPROGRESS',
        message: 'Pre-shipping sample rejected. Rework orders created and order routed back to assembly.',
      },
    };
  }

  static async validateExportReadiness(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: {
        qcInspections: true,
        psLogs: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const exportValidation = StateMachine.validateExportReadiness({
      orderStatus: order.status,
      isPsApproved: order.isPsApproved,
      isQcVerified: order.qcInspections?.some((qc) => qc.overallStatus === 'PASSED') || false,
    });

    if (!exportValidation.valid) {
      return {
        success: false,
        error: 'EXPORT_NOT_READY',
        message: exportValidation.reason,
      };
    }

    const updated = await prisma.orderToken.update({
      where: { id: request.orderTokenId },
      data: {
        status: 'EXPORT_READY',
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: updated.id,
        status: updated.status,
        isPsApproved: updated.isPsApproved,
        message: 'Order is ready for export. Hand over to Export Department.',
      },
    };
  }

  static async getQcPsStatus(orderTokenId) {
    const qcInspection = await prisma.qcInspection.findFirst({
      where: { orderTokenId },
    });

    const psLog = await prisma.preShippingSample.findFirst({
      where: { orderTokenId },
    });

    return {
      success: true,
      data: {
        orderTokenId,
        qcInspection: qcInspection
          ? {
              qcInspectionId: qcInspection.id,
              status: qcInspection.status,
              overallStatus: qcInspection.overallStatus,
              structuralAudit: qcInspection.structuralAudit,
              aestheticAudit: qcInspection.aestheticAudit,
              asepticAudit: qcInspection.asepticAudit,
              inspectionNotes: qcInspection.inspectionNotes,
              inspectedBy: qcInspection.inspectedBy,
              inspectedAt: qcInspection.inspectedAt,
            }
          : null,
        preShippingSample: psLog
          ? {
              psLogId: psLog.id,
              status: psLog.status,
              totalCargoUnits: psLog.totalCargoUnits,
              sampleSize: Number(psLog.sampleSize),
              sampleUnits: psLog.sampleUnits,
              customerApproval: psLog.customerApproval,
              sentAt: psLog.sentAt,
              sentTo: psLog.sentTo,
              customerApprovedAt: psLog.customerApprovedAt,
              customerApprovedBy: psLog.customerApprovedBy,
              reworkOrders: psLog.reworkOrders,
            }
          : null,
      },
    };
  }
}
