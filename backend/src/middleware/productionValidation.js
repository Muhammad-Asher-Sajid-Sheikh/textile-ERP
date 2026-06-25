/**
 * Production Module Validation Middleware
 */

import { body, param, validationResult } from 'express-validator';

export const productionValidationSchemas = {
  createRequisition: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('requestedMaterialId')
      .isUUID()
      .withMessage('requestedMaterialId must be a valid UUID'),
    body('requestedVolume')
      .isNumeric()
      .withMessage('requestedVolume must be numeric'),
    body('volumeUnit')
      .isString()
      .isLength({ min: 1 })
      .withMessage('volumeUnit is required'),
  ],

  releaseRequisition: [
    body('requisitionId')
      .isUUID()
      .withMessage('requisitionId must be a valid UUID'),
    body('approvalSignature')
      .isString()
      .withMessage('approvalSignature is required'),
    body('approvedBy')
      .isString()
      .withMessage('approvedBy is required'),
  ],

  dispatchMaterial: [
    body('requisitionId')
      .isUUID()
      .withMessage('requisitionId must be a valid UUID'),
    body('dispatchedVolume')
      .isNumeric()
      .withMessage('dispatchedVolume must be numeric'),
    body('dispatchedBy')
      .isString()
      .withMessage('dispatchedBy is required'),
  ],

  cancelRequisition: [
    body('requisitionId')
      .isUUID()
      .withMessage('requisitionId must be a valid UUID'),
  ],

  initiateYarnTwisting: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('twistingVendorId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('twistingVendorId is required'),
  ],

  completeYarnTwisting: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  dispatchToWeaving: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('vendorId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('vendorId is required'),
  ],

  logRawFabricOutput: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('rollPieceCount')
      .isInt({ min: 1 })
      .withMessage('rollPieceCount must be a positive integer'),
    body('totalMassWeight')
      .isNumeric()
      .withMessage('totalMassWeight must be numeric'),
    body('fabricDensityGsm')
      .isInt({ min: 10, max: 1000 })
      .withMessage('fabricDensityGsm must be between 10 and 1000'),
    body('totalLength')
      .isNumeric()
      .withMessage('totalLength must be numeric'),
    body('poYieldTargetWeight')
      .isNumeric()
      .withMessage('poYieldTargetWeight must be numeric'),
  ],

  dispatchToWetProcessing: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('inputTotalWeight')
      .isNumeric()
      .withMessage('inputTotalWeight must be numeric'),
  ],

  logQualityTest: [
    body('wetProcessingLogId')
      .isUUID()
      .withMessage('wetProcessingLogId must be a valid UUID'),
    body('testType')
      .isIn(['COLOR_FASTNESS', 'SHRINKING', 'GASOLINE_SMELL'])
      .withMessage('testType must be one of: COLOR_FASTNESS, SHRINKING, GASOLINE_SMELL'),
    body('result')
      .isIn(['PASSED', 'FAILED'])
      .withMessage('result must be PASSED or FAILED'),
    body('testedBy')
      .isString()
      .withMessage('testedBy is required'),
  ],

  completeWetProcessing: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('outputTotalWeight')
      .isNumeric()
      .withMessage('outputTotalWeight must be numeric'),
  ],

  dispatchToPrinting: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('vendorId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('vendorId is required'),
    body('rollsSent')
      .isInt({ min: 1 })
      .withMessage('rollsSent must be a positive integer'),
  ],

  completePrinting: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('rollsReturned')
      .isInt({ min: 0 })
      .withMessage('rollsReturned must be a non-negative integer'),
    body('specAuditBy')
      .isString()
      .withMessage('specAuditBy is required'),
  ],

  initiateEmbroidery: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('totalPiecesCut')
      .isInt({ min: 1 })
      .withMessage('totalPiecesCut must be a positive integer'),
    body('preStitchBy')
      .isString()
      .withMessage('preStitchBy is required'),
  ],

  dispatchToEmbroidery: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('vendorId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('vendorId is required'),
    body('piecesSent')
      .isInt({ min: 1 })
      .withMessage('piecesSent must be a positive integer'),
  ],

  completeEmbroidery: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('piecesReturned')
      .isInt({ min: 0 })
      .withMessage('piecesReturned must be a non-negative integer'),
  ],

  createJobCard: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('workerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('workerId is required'),
    body('workerName')
      .isString()
      .isLength({ min: 1 })
      .withMessage('workerName is required'),
    body('basePieceRate')
      .isNumeric()
      .withMessage('basePieceRate must be numeric'),
  ],

  logAssemblyPhase: [
    body('jobCardId')
      .isUUID()
      .withMessage('jobCardId must be a valid UUID'),
    body('phase')
      .isIn([
        'PHASE1_CUTTING',
        'PHASE2_STITCHING',
        'PHASE3_INITIAL_CHECK',
        'PHASE4_FOLDING',
        'PHASE5_FINAL_CHECK',
        'PHASE6_PACKING',
      ])
      .withMessage('phase must be one of the 6 assembly phases'),
    body('piecesProcessed')
      .isInt({ min: 0 })
      .withMessage('piecesProcessed must be a non-negative integer'),
  ],

  completeAssemblyPhase: [
    body('jobCardId')
      .isUUID()
      .withMessage('jobCardId must be a valid UUID'),
    body('phase')
      .isIn([
        'PHASE1_CUTTING',
        'PHASE2_STITCHING',
        'PHASE3_INITIAL_CHECK',
        'PHASE4_FOLDING',
        'PHASE5_FINAL_CHECK',
        'PHASE6_PACKING',
      ])
      .withMessage('phase must be one of the 6 assembly phases'),
  ],

  startQcInspection: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  logQcAudit: [
    body('qcInspectionId')
      .isUUID()
      .withMessage('qcInspectionId must be a valid UUID'),
    body('auditType')
      .isIn(['STRUCTURAL', 'AESTHETIC', 'ASEPTIC'])
      .withMessage('auditType must be one of: STRUCTURAL, AESTHETIC, ASEPTIC'),
    body('passed')
      .isBoolean()
      .withMessage('passed must be a boolean'),
  ],

  completeQcInspection: [
    body('qcInspectionId')
      .isUUID()
      .withMessage('qcInspectionId must be a valid UUID'),
    body('inspectedBy')
      .isString()
      .withMessage('inspectedBy is required'),
  ],

  initiatePsSample: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
    body('totalCargoUnits')
      .isInt({ min: 1 })
      .withMessage('totalCargoUnits must be a positive integer'),
  ],

  sendPsSampleToCustomer: [
    body('psLogId')
      .isUUID()
      .withMessage('psLogId must be a valid UUID'),
    body('sentTo')
      .isString()
      .isLength({ min: 1 })
      .withMessage('sentTo is required'),
  ],

  approvePsSample: [
    body('psLogId')
      .isUUID()
      .withMessage('psLogId must be a valid UUID'),
    body('customerApprovedBy')
      .isString()
      .withMessage('customerApprovedBy is required'),
  ],

  rejectPsSample: [
    body('psLogId')
      .isUUID()
      .withMessage('psLogId must be a valid UUID'),
  ],

  validateExportReadiness: [
    body('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getRequisitionStatus: [
    param('requisitionId')
      .isUUID()
      .withMessage('requisitionId must be a valid UUID'),
  ],

  getPhaseStatus: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getProcessingStatus: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getDecorationStatus: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getJobCard: [
    param('jobCardId')
      .isUUID()
      .withMessage('jobCardId must be a valid UUID'),
  ],

  getOrderJobCards: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getOrderPhaseStatus: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],

  getQcPsStatus: [
    param('orderTokenId')
      .isUUID()
      .withMessage('orderTokenId must be a valid UUID'),
  ],
};

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }
  next();
};

export const handleServiceError = (error, res) => {
  const message = error.message || 'Internal Server Error';

  if (message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message,
    });
  }

  if (
    message.includes('OUTSIDE tolerance') ||
    message.includes('EXCEEDS') ||
    message.includes('cannot proceed')
  ) {
    return res.status(422).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message,
    });
  }

  if (message.includes('must be') || message.includes('requires')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message,
    });
  }

  if (message.includes('EXPORT_NOT_READY') || message.includes('ready for export')) {
    return res.status(403).json({
      success: false,
      error: 'EXPORT_NOT_READY',
      message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message,
  });
};
