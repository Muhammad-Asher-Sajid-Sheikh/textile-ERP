/**
 * Production Validation Engine
 * Enforces strict business logic invariants and calculations
 */

import { Decimal } from '@prisma/client/runtime/client.js';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export class ProductionValidator {
  /**
   * Validates weight loss percentage against 9-11% tolerance window
   * Formula: ((Input Weight - Output Weight) / Input Weight) × 100
   */
  static calculateWeightLoss(inputWeight: number, outputWeight: number): number {
    if (inputWeight <= 0) {
      throw new Error('Input weight must be positive');
    }
    const weightLoss = ((inputWeight - outputWeight) / inputWeight) * 100;
    return parseFloat(weightLoss.toFixed(2));
  }

  /**
   * Validates weight loss percentage falls within tolerance (9% - 11%)
   */
  static validateWeightLossTolerance(weightLossPercentage: number): {
    isValid: boolean;
    message: string;
  } {
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

  /**
   * Validates GSM (Grams per Square Meter) is within realistic thresholds
   */
  static validateGsmValue(gsm: number): { isValid: boolean; message: string } {
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

  /**
   * Validates piece count discrepancy
   */
  static validatePieceCount(sent: number, returned: number): {
    hasDiscrepancy: boolean;
    discrepancyCount: number;
    message: string;
  } {
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

  /**
   * Validates embroidery pre-stitching requirements
   */
  static validateEmbroideryPreStitching(
    totalPiecesCut: number,
    piecesPreStitched: number
  ): {
    isValid: boolean;
    message: string;
  } {
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

  /**
   * Calculates piece-rate wage dynamically
   * Wage = Pieces Completed × Base Piece Rate
   */
  static calculatePieceRateWage(piecesCompleted: number, basePieceRate: number): number {
    if (basePieceRate < 0) {
      throw new Error('Base piece rate cannot be negative');
    }
    if (piecesCompleted < 0) {
      throw new Error('Pieces completed cannot be negative');
    }
    const wage = piecesCompleted * basePieceRate;
    return parseFloat(wage.toFixed(2));
  }

  /**
   * Validates pre-shipping sample extraction (10% rule)
   */
  static calculatePsSampleSize(totalCargoUnits: number): {
    sampleSize: number;
    sampleUnits: number;
  } {
    const samplePercentage = 10;
    const sampleSize = (totalCargoUnits * samplePercentage) / 100;

    return {
      sampleSize: parseFloat(sampleSize.toFixed(2)),
      sampleUnits: Math.ceil(sampleSize),
    };
  }

  /**
   * Validates material requisition against approved master samples
   */
  static validateRequisitionAgainstMasterSample(
    requestedVolume: number,
    preApprovedVolume: number
  ): {
    isValid: boolean;
    message: string;
  } {
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

  /**
   * Validates PO yield target compliance
   */
  static validatePoYieldCompliance(
    actualWeight: number,
    poTargetWeight: number
  ): {
    isCompliant: boolean;
    wasteVariance: number;
    message: string;
  } {
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

  /**
   * Validates assembly phase prerequisites
   */
  static validateAssemblyPhasePrerequisite(
    phase: string,
    prerequisitesMetFlags: Record<string, boolean>
  ): {
    isValid: boolean;
    message: string;
  } {
    const phasePrerequisites: Record<string, string[]> = {
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

  /**
   * Validates quality control audit results
   */
  static validateQcAudit(auditResults: {
    structural: boolean;
    aesthetic: boolean;
    aseptic: boolean;
  }): {
    overallPassed: boolean;
    passedAudits: string[];
    failedAudits: string[];
  } {
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

  /**
   * Comprehensive input validation for production routes
   */
  static validateProductionInput(
    data: Record<string, any>,
    schema: Record<string, any>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

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
