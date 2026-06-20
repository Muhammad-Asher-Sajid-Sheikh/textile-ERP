/**
 * Production Validation Engine
 * Enforces strict business logic invariants and calculations
 */

export class ProductionValidator {
  static calculateWeightLoss(inputWeight, outputWeight) {
    if (inputWeight <= 0) {
      throw new Error('Input weight must be positive');
    }
    const weightLoss = ((inputWeight - outputWeight) / inputWeight) * 100;
    return parseFloat(weightLoss.toFixed(2));
  }

  static validateWeightLossTolerance(weightLossPercentage) {
    const MIN_TOLERANCE = 9;
    const MAX_TOLERANCE = 11;

    if (weightLossPercentage >= MIN_TOLERANCE && weightLossPercentage <= MAX_TOLERANCE) {
      return {
        isValid: true,
        message: `Weight loss ${weightLossPercentage}% is within tolerance (9% - 11%)`,
      };
    }

    return {
      isValid: false,
      message: `Weight loss ${weightLossPercentage}% is OUTSIDE tolerance range (9% - 11%)`,
    };
  }

  static validateGsmValue(gsm) {
    const MIN_GSM = 10;
    const MAX_GSM = 1000;

    if (gsm >= MIN_GSM && gsm <= MAX_GSM) {
      return { isValid: true, message: `GSM ${gsm} is valid` };
    }

    return {
      isValid: false,
      message: `GSM must be between ${MIN_GSM} and ${MAX_GSM}. Received: ${gsm}`,
    };
  }

  static validatePieceCount(sent, returned) {
    const discrepancyCount = Math.abs(sent - returned);
    const hasDiscrepancy = sent !== returned;

    return {
      hasDiscrepancy,
      discrepancyCount,
      message: hasDiscrepancy
        ? `DISCREPANCY ALERT: Sent ${sent} pieces, received ${returned}. Shortage: ${discrepancyCount} pieces`
        : `Piece count matches: ${sent} sent, ${returned} returned`,
    };
  }

  static validateEmbroideryPreStitching(totalPiecesCut, piecesPreStitched) {
    const MIN_STITCH_SIDES = 2;

    if (piecesPreStitched >= totalPiecesCut) {
      return {
        isValid: true,
        message: `All ${piecesPreStitched} pieces pre-stitched on at least ${MIN_STITCH_SIDES} sides`,
      };
    }

    return {
      isValid: false,
      message: `Not all pieces pre-stitched. Expected: ${totalPiecesCut}, Pre-stitched: ${piecesPreStitched}`,
    };
  }

  static calculatePieceRateWage(piecesCompleted, basePieceRate) {
    if (basePieceRate < 0) {
      throw new Error('Base piece rate cannot be negative');
    }
    if (piecesCompleted < 0) {
      throw new Error('Pieces completed cannot be negative');
    }
    const wage = piecesCompleted * basePieceRate;
    return parseFloat(wage.toFixed(2));
  }

  static calculatePsSampleSize(totalCargoUnits) {
    const samplePercentage = 10;
    const sampleSize = (totalCargoUnits * samplePercentage) / 100;

    return {
      sampleSize: parseFloat(sampleSize.toFixed(2)),
      sampleUnits: Math.ceil(sampleSize),
    };
  }

  static validateRequisitionAgainstMasterSample(requestedVolume, preApprovedVolume) {
    if (requestedVolume <= preApprovedVolume) {
      return {
        isValid: true,
        message: `Requested volume ${requestedVolume} is within approved sample volume ${preApprovedVolume}`,
      };
    }

    return {
      isValid: false,
      message: `Requested volume ${requestedVolume} EXCEEDS pre-approved sample volume ${preApprovedVolume}`,
    };
  }

  static validatePoYieldCompliance(actualWeight, poTargetWeight) {
    const variance = actualWeight - poTargetWeight;
    const wasteVariance = parseFloat(variance.toFixed(2));

    return {
      isCompliant: actualWeight >= poTargetWeight,
      wasteVariance,
      message:
        variance >= 0
          ? `Weight EXCEEDS target. Target: ${poTargetWeight}Kg, Actual: ${actualWeight}Kg, Excess: ${variance}Kg`
          : `Weight BELOW target. Target: ${poTargetWeight}Kg, Actual: ${actualWeight}Kg, Shortage: ${Math.abs(variance)}Kg (Must be logged as Factory Loss)`,
    };
  }

  static validateAssemblyPhasePrerequisite(phase, prerequisitesMetFlags) {
    const phasePrerequisites = {
      PHASE1_CUTTING: [],
      PHASE2_STITCHING: ['PHASE1_CUTTING'],
      PHASE3_INITIAL_CHECK: ['PHASE2_STITCHING'],
      PHASE4_FOLDING: ['PHASE3_INITIAL_CHECK'],
      PHASE5_FINAL_CHECK: ['PHASE4_FOLDING'],
      PHASE6_PACKING: ['PHASE5_FINAL_CHECK'],
    };

    const required = phasePrerequisites[phase] || [];
    const allMet = required.every((prereq) => prerequisitesMetFlags[prereq] === true);

    if (allMet) {
      return { isValid: true, message: `Phase ${phase} prerequisites met` };
    }

    const missing = required.filter((prereq) => prerequisitesMetFlags[prereq] !== true);
    return {
      isValid: false,
      message: `Phase ${phase} cannot proceed. Missing prerequisites: ${missing.join(', ')}`,
    };
  }

  static validateQcAudit(auditResults) {
    const passed = [];
    const failed = [];

    if (auditResults.structural) passed.push('STRUCTURAL');
    else failed.push('STRUCTURAL');

    if (auditResults.aesthetic) passed.push('AESTHETIC');
    else failed.push('AESTHETIC');

    if (auditResults.aseptic) passed.push('ASEPTIC');
    else failed.push('ASEPTIC');

    return {
      overallPassed: failed.length === 0,
      passedAudits: passed,
      failedAudits: failed,
    };
  }

  static validateProductionInput(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'ERROR',
        });
        continue;
      }

      if (rules.type && value !== null && typeof value !== rules.type) {
        errors.push({
          field,
          message: `${field} must be of type ${rules.type}`,
          severity: 'ERROR',
        });
      }

      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rules.min}`,
          severity: 'ERROR',
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          message: `${field} must not exceed ${rules.max}`,
          severity: 'ERROR',
        });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rules.enum.join(', ')}`,
          severity: 'ERROR',
        });
      }
    }

    return errors;
  }
}
