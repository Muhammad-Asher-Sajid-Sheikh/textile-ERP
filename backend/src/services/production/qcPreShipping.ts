/**
 * QC & Pre-Shipping Sample Service
 * Handles 6th gate: Quality Control & Pre-Shipping (PS) Gates
 * - 100% compliance sweep: Structural, Aesthetic, Aseptic (Sanitary/Hygiene)
 * - PS Standard: Extract 10% of bulk cargo for customer sample
 * - Customer approval loop: Blocks shipment until approved
 * - Rework handling: Rejection flags rework orders
 * - Export readiness: Validates before transition to EXPORT_READY
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { Decimal } from '@prisma/client/runtime/client.js';

export interface StartQcInspectionRequest {
  orderTokenId: string;
  totalCargoUnits: number;
}

export interface LogQcAuditRequest {
  qcInspectionId: string;
  auditType: 'STRUCTURAL' | 'AESTHETIC' | 'ASEPTIC';
  passed: boolean;
  findings?: string;
}

export interface CompleteQcInspectionRequest {
  qcInspectionId: string;
  inspectedBy: string;
  notes?: string;
}

export interface InitiatePsSampleRequest {
  orderTokenId: string;
  totalCargoUnits: number;
}

export interface SendPsSampleToCustomerRequest {
  psLogId: string;
  sentTo: string;
  sentAt: Date;
}

export interface ApprovePsSampleRequest {
  psLogId: string;
  customerApprovedBy: string;
  approvedAt: Date;
}

export interface RejectPsSampleRequest {
  psLogId: string;
  reworkOrders?: string;
}

export interface ValidateExportReadinessRequest {
  orderTokenId: string;
}

export class QcPreShippingService {
  /**
   * Initiates QC inspection process
   */
  static async startQcInspection(request: StartQcInspectionRequest) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    // Validate phase prerequisites
    const phaseValidation = await StateMachine.validatePhasePrerequisites('QC', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    // Create QC inspection
    const qcInspection = await prisma.qcInspection.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'PENDING',
        overallStatus: 'PENDING',
      },
    });

    // Update order status
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

  /**
   * Logs QC audit result for one of the three mandatory audit types
   */
  static async logQcAudit(request: LogQcAuditRequest) {
    const qcInspection = await prisma.qcInspection.findUnique({
      where: { id: request.qcInspectionId },
    });

    if (!qcInspection) {
      throw new Error(`QC inspection ${request.qcInspectionId} not found`);
    }

    // Build audit results object
    const currentAudits = qcInspection.structuralAudit
      ? { structural: true }
      : {};
    Object.assign(currentAudits, qcInspection.aestheticAudit ? { aesthetic: true } : {});
    Object.assign(currentAudits, qcInspection.asepticAudit ? { aseptic: true } : {});

    const newAuditResult = {
      auditType: request.auditType,
      passed: request.passed,
      findings: request.findings || null,
      inspectedAt: new Date(),
    };

    // Update based on audit type
    const updateData: Record<string, any> = {};

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

  /**
   * Completes QC inspection and determines overall status
   */
  static async completeQcInspection(request: CompleteQcInspectionRequest) {
    const qcInspection = await prisma.qcInspection.findUnique({
      where: { id: request.qcInspectionId },
    });

    if (!qcInspection) {
      throw new Error(`QC inspection ${request.qcInspectionId} not found`);
    }

    // Validate all three audits are completed
    if (!qcInspection.structuralAudit || !qcInspection.aestheticAudit || !qcInspection.asepticAudit) {
      throw new Error('All three audits (STRUCTURAL, AESTHETIC, ASEPTIC) must be completed');
    }

    // Determine overall status
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

  /**
   * Initiates pre-shipping sample gate
   * Extracts 10% of bulk cargo for customer approval
   */
  static async initiatePsSample(request: InitiatePsSampleRequest) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    // Validate QC was completed
    const qcInspection = await prisma.qcInspection.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!qcInspection || qcInspection.overallStatus !== 'PASSED') {
      throw new Error('QC verification must be passed before PS sample gate');
    }

    // Calculate 10% sample size
    const { sampleSize, sampleUnits } = ProductionValidator.calculatePsSampleSize(
      request.totalCargoUnits
    );

    // Create PS log
    const psLog = await prisma.preShippingSample.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'PENDING',
        totalCargoUnits: request.totalCargoUnits,
        sampleSize: new Decimal(sampleSize),
        sampleUnits,
      },
    });

    // Update order status
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

  /**
   * Sends PS sample to customer for approval
   */
  static async sendPsSampleToCustomer(request: SendPsSampleToCustomerRequest) {
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

  /**
   * Approves PS sample - allows transition to EXPORT_READY
   */
  static async approvePsSample(request: ApprovePsSampleRequest) {
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

    // Update PS log
    const updated = await prisma.preShippingSample.update({
      where: { id: request.psLogId },
      data: {
        status: 'APPROVED',
        customerApproval: true,
        customerApprovedAt: request.approvedAt,
        customerApprovedBy: request.customerApprovedBy,
      },
    });

    // Update order
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

  /**
   * Rejects PS sample - triggers rework orders
   */
  static async rejectPsSample(request: RejectPsSampleRequest) {
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

    // Update PS log
    const updated = await prisma.preShippingSample.update({
      where: { id: request.psLogId },
      data: {
        status: 'REJECTED',
        customerApproval: false,
        reworkInitiatedAt: new Date(),
        reworkOrders: request.reworkOrders || 'Rework initiated due to customer rejection',
      },
    });

    // Update order - flag PS as not approved and restart assembly
    await prisma.orderToken.update({
      where: { id: psLog.orderTokenId },
      data: {
        status: 'ASSEMBLY_INPROGRESS', // Route back to assembly for rework
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

  /**
   * Validates export readiness gate
   */
  static async validateExportReadiness(request: ValidateExportReadinessRequest) {
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

    // Check export readiness conditions
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

    // Transition to EXPORT_READY
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

  /**
   * Retrieves complete QC and PS status
   */
  static async getQcPsStatus(orderTokenId: string) {
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
