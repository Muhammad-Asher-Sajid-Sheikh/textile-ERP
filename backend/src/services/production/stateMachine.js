/**
 * Production State Machine
 * Enforces strict sequential state transitions and validates prerequisites
 */

const VALID_TRANSITIONS = [
  {
    from: 'AUTHORIZED',
    to: 'MATERIAL_ALLOCATED',
    prerequisite: async () => {
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
  static async canTransition(currentStatus, targetStatus, prerequisites = {}) {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
      };
    }

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

  static async validatePhasePrerequisites(phase, orderStatus) {
    const phasePrerequisites = {
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

  static validateExportReadiness(data) {
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

  static validateInstructionLock(isLocked) {
    if (!isLocked) {
      return {
        valid: false,
        reason: 'Order cannot enter production pipeline. Tech Pack instructions are not locked.',
      };
    }
    return { valid: true };
  }
}
