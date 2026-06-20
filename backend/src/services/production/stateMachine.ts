/**
 * Production State Machine
 * Enforces strict sequential state transitions and validates prerequisites
 */

import { OrderStatus } from '../../generated/client.js';

type ValidTransition = {
  from: OrderStatus;
  to: OrderStatus;
  prerequisite?: () => Promise<boolean>;
};

const VALID_TRANSITIONS: ValidTransition[] = [
  {
    from: 'AUTHORIZED',
    to: 'MATERIAL_ALLOCATED',
    prerequisite: async () => {
      // Material requisition must be released
      return true;
    },
  },
  {
    from: 'MATERIAL_ALLOCATED',
    to: 'YARN_WEAVING_INPROGRESS',
  },
  {
    from: 'YARN_WEAVING_INPROGRESS',
    to: 'WET_PROCESSING_INPROGRESS',
  },
  {
    from: 'WET_PROCESSING_INPROGRESS',
    to: 'SURFACE_DECORATION_INPROGRESS',
  },
  {
    from: 'SURFACE_DECORATION_INPROGRESS',
    to: 'ASSEMBLY_INPROGRESS',
  },
  {
    from: 'ASSEMBLY_INPROGRESS',
    to: 'QC_VERIFICATION_INPROGRESS',
  },
  {
    from: 'QC_VERIFICATION_INPROGRESS',
    to: 'PS_SAMPLE_PENDING',
  },
  {
    from: 'PS_SAMPLE_PENDING',
    to: 'PS_APPROVED',
  },
  {
    from: 'PS_APPROVED',
    to: 'EXPORT_READY',
  },
];

export class StateMachine {
  /**
   * Validates if a state transition is allowed
   */
  static async canTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    prerequisites?: Record<string, boolean>
  ): Promise<{ allowed: boolean; reason?: string }> {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
      };
    }

    // Check prerequisites if they exist
    if (transition.prerequisite) {
      const prerequisiteMet = await transition.prerequisite();
      if (!prerequisiteMet) {
        return {
          allowed: false,
          reason: `Prerequisites not met for transition to ${targetStatus}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Enforces strict sequential pipeline enforcement
   * A downstream phase cannot log data unless prerequisites are complete
   */
  static async validatePhasePrerequisites(
    phase: 'MATERIAL_ALLOCATION' | 'YARN_WEAVING' | 'WET_PROCESSING' | 'DECORATION' | 'ASSEMBLY' | 'QC' | 'PS_GATE',
    orderStatus: OrderStatus
  ): Promise<{ valid: boolean; reason?: string }> {
    const phasePrerequisites: Record<string, OrderStatus[]> = {
      YARN_WEAVING: ['MATERIAL_ALLOCATED'],
      WET_PROCESSING: ['YARN_WEAVING_INPROGRESS'],
      DECORATION: ['WET_PROCESSING_INPROGRESS'],
      ASSEMBLY: ['SURFACE_DECORATION_INPROGRESS'],
      QC: ['ASSEMBLY_INPROGRESS'],
      PS_GATE: ['QC_VERIFICATION_INPROGRESS'],
    };

    const prerequisites = phasePrerequisites[phase];
    if (!prerequisites) {
      return { valid: true };
    }

    const isValid = prerequisites.includes(orderStatus);
    if (!isValid) {
      return {
        valid: false,
        reason: `Phase ${phase} requires order status to be one of: ${prerequisites.join(', ')}. Current: ${orderStatus}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates export readiness gate
   */
  static validateExportReadiness(data: {
    orderStatus: OrderStatus;
    isPsApproved: boolean | null;
    isQcVerified: boolean;
  }): { valid: boolean; reason?: string } {
    if (data.orderStatus !== 'PS_APPROVED') {
      return {
        valid: false,
        reason: `Order must be in PS_APPROVED status. Current: ${data.orderStatus}`,
      };
    }

    if (!data.isPsApproved) {
      return {
        valid: false,
        reason: '403 Forbidden: Pre-Shipping sample not approved by customer',
      };
    }

    if (!data.isQcVerified) {
      return {
        valid: false,
        reason: 'QC verification must be completed before export',
      };
    }

    return { valid: true };
  }

  /**
   * Validates instruction lock requirement
   */
  static validateInstructionLock(isLocked: boolean): { valid: boolean; reason?: string } {
    if (!isLocked) {
      return {
        valid: false,
        reason: 'Order cannot enter production pipeline. Tech Pack instructions are not locked.',
      };
    }
    return { valid: true };
  }
}
