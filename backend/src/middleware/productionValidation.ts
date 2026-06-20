/**
 * Production Middleware & Validation Utilities
 * Implements express-validator schemas and middleware for strict input validation
 */

import { body, param, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validation schemas for production routes
 */
export const productionValidationSchemas = {
  // Material Allocation
  createRequisition: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('requestedMaterialId').isUUID().withMessage('Invalid material ID'),
    body('requestedVolume').isNumeric().withMessage('Requested volume must be numeric'),
    body('volumeUnit')
      .isIn(['Kg', 'Meters', 'Pieces', 'Yards'])
      .withMessage('Invalid volume unit'),
  ],

  releaseRequisition: () => [
    body('requisitionId').isUUID().withMessage('Invalid requisition ID'),
    body('approvalSignature').notEmpty().withMessage('Approval signature is required'),
    body('approvedBy').notEmpty().withMessage('Approved by user is required'),
  ],

  dispatchMaterial: () => [
    body('requisitionId').isUUID().withMessage('Invalid requisition ID'),
    body('dispatchedVolume').isNumeric().withMessage('Dispatched volume must be numeric'),
    body('dispatchedBy').notEmpty().withMessage('Dispatched by user is required'),
  ],

  // Yarn & Fabric Phase
  initiateYarnTwisting: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('twistingVendorId').notEmpty().withMessage('Twisting vendor ID is required'),
  ],

  dispatchToWeaving: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('yarnType').notEmpty().withMessage('Yarn type is required'),
    body('totalYardage').isNumeric().withMessage('Total yardage must be numeric'),
    body('requiredYarnWeight').isNumeric().withMessage('Required yarn weight must be numeric'),
  ],

  logRawFabricOutput: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('rollPieceCount').isInt({ min: 1 }).withMessage('Roll piece count must be positive integer'),
    body('totalMassWeight').isNumeric().withMessage('Total mass weight must be numeric'),
    body('fabricDensityGsm')
      .isNumeric()
      .custom((value) => {
        if (value < 10 || value > 1000) {
          throw new Error('GSM must be between 10 and 1000');
        }
        return true;
      })
      .withMessage('Invalid GSM value'),
    body('totalLength').isNumeric().withMessage('Total length must be numeric'),
    body('poYieldTargetWeight').isNumeric().withMessage('PO yield target must be numeric'),
  ],

  // Wet Processing
  dispatchToWetProcessing: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('millId').notEmpty().withMessage('Mill ID is required'),
    body('inputTotalWeight').isNumeric().withMessage('Input weight must be numeric'),
  ],

  logQualityTest: () => [
    body('wetProcessingLogId').isUUID().withMessage('Invalid wet processing log ID'),
    body('testType')
      .isIn(['COLOR_FASTNESS', 'SHRINKING', 'GASOLINE_SMELL'])
      .withMessage('Invalid test type'),
    body('result').isIn(['PASSED', 'FAILED']).withMessage('Result must be PASSED or FAILED'),
    body('testedBy').notEmpty().withMessage('Tested by user is required'),
  ],

  completeWetProcessing: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('outputTotalWeight').isNumeric().withMessage('Output weight must be numeric'),
    body('returnedFrom').notEmpty().withMessage('Returned from vendor is required'),
  ],

  // Surface Decoration
  dispatchToPrinting: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('rollsSent').isInt({ min: 1 }).withMessage('Rolls sent must be positive integer'),
  ],

  completePrinting: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('rollsReturned').isInt({ min: 0 }).withMessage('Rolls returned must be non-negative integer'),
    body('specAuditNotes').notEmpty().withMessage('Specification audit notes are required'),
    body('specAuditBy').notEmpty().withMessage('Audit performed by is required'),
  ],

  initiateEmbroidery: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('totalPiecesCut').isInt({ min: 1 }).withMessage('Total pieces cut must be positive integer'),
    body('preStitchBy').notEmpty().withMessage('Pre-stitch performed by is required'),
  ],

  dispatchToEmbroidery: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('piecesSent').isInt({ min: 1 }).withMessage('Pieces sent must be positive integer'),
  ],

  completeEmbroidery: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('piecesReturned').isInt({ min: 0 }).withMessage('Pieces returned must be non-negative integer'),
  ],

  // Assembly Line
  createJobCard: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('workerId').notEmpty().withMessage('Worker ID is required'),
    body('workerName').notEmpty().withMessage('Worker name is required'),
    body('basePieceRate')
      .isNumeric()
      .custom((value) => {
        if (parseFloat(value) <= 0) {
          throw new Error('Base piece rate must be positive');
        }
        return true;
      })
      .withMessage('Invalid base piece rate'),
  ],

  logAssemblyPhase: () => [
    body('jobCardId').isUUID().withMessage('Invalid job card ID'),
    body('phase')
      .isIn([
        'PHASE1_CUTTING',
        'PHASE2_STITCHING',
        'PHASE3_INITIAL_CHECK',
        'PHASE4_FOLDING',
        'PHASE5_FINAL_CHECK',
        'PHASE6_PACKING',
      ])
      .withMessage('Invalid assembly phase'),
    body('piecesProcessed')
      .isInt({ min: 1 })
      .withMessage('Pieces processed must be positive integer'),
  ],

  completeAssemblyPhase: () => [
    body('jobCardId').isUUID().withMessage('Invalid job card ID'),
    body('phase')
      .isIn([
        'PHASE1_CUTTING',
        'PHASE2_STITCHING',
        'PHASE3_INITIAL_CHECK',
        'PHASE4_FOLDING',
        'PHASE5_FINAL_CHECK',
        'PHASE6_PACKING',
      ])
      .withMessage('Invalid assembly phase'),
  ],

  // QC & Pre-Shipping
  startQcInspection: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('totalCargoUnits')
      .isInt({ min: 1 })
      .withMessage('Total cargo units must be positive integer'),
  ],

  logQcAudit: () => [
    body('qcInspectionId').isUUID().withMessage('Invalid QC inspection ID'),
    body('auditType')
      .isIn(['STRUCTURAL', 'AESTHETIC', 'ASEPTIC'])
      .withMessage('Invalid audit type'),
    body('passed').isBoolean().withMessage('Passed must be boolean'),
  ],

  initiatePsSample: () => [
    body('orderTokenId').isUUID().withMessage('Invalid order token ID'),
    body('totalCargoUnits')
      .isInt({ min: 1 })
      .withMessage('Total cargo units must be positive integer'),
  ],

  approvePsSample: () => [
    body('psLogId').isUUID().withMessage('Invalid PS log ID'),
    body('customerApprovedBy').notEmpty().withMessage('Customer approval by is required'),
  ],
};

/**
 * Generic validation middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details: errors.array().map((err) => ({
        field: 'param' in err ? err.param : err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Unified error response handler
 */
export const handleServiceError = (error: any, res: Response) => {
  console.error('Production service error:', error);

  if (error.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error.message.includes('403 Forbidden')) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: error.message,
    });
  }

  if (error.message.includes('ALERT') || error.message.includes('FAILED')) {
    return res.status(400).json({
      success: false,
      error: 'BUSINESS_LOGIC_ERROR',
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: error.message,
  });
};
