/**
 * Production Routes
 * All routes protected by Token Validation Middleware
 * Strict schema validation with express-validator
 */

import express from 'express';
import { checktoken } from '../middleware/checktoken.js';
import {
  productionValidationSchemas,
  validateRequest,
} from '../middleware/productionValidation.js';
import {
  materialAllocationController,
  yarnFabricPhaseController,
  wetProcessingController,
  surfaceDecorationController,
  assemblyLineController,
  qcPreShippingController,
} from '../controller/productionController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(checktoken);

// ===== MATERIAL ALLOCATION ROUTES =====

/**
 * POST /production/material-allocation/requisition
 * Create production requisition
 */
router.post(
  '/material-allocation/requisition',
  productionValidationSchemas.createRequisition(),
  validateRequest,
  materialAllocationController.createRequisition
);

/**
 * POST /production/material-allocation/requisition/release
 * Release material requisition with digital signature
 */
router.post(
  '/material-allocation/requisition/release',
  productionValidationSchemas.releaseRequisition(),
  validateRequest,
  materialAllocationController.releaseRequisition
);

/**
 * POST /production/material-allocation/dispatch
 * Dispatch material to production floor
 */
router.post(
  '/material-allocation/dispatch',
  productionValidationSchemas.dispatchMaterial(),
  validateRequest,
  materialAllocationController.dispatchMaterial
);

/**
 * GET /production/material-allocation/requisition/:requisitionId
 * Get requisition status
 */
router.get(
  '/material-allocation/requisition/:requisitionId',
  materialAllocationController.getRequisitionStatus
);

/**
 * POST /production/material-allocation/requisition/cancel
 * Cancel a requisition
 */
router.post(
  '/material-allocation/requisition/cancel',
  materialAllocationController.cancelRequisition
);

// ===== YARN & FABRIC PHASE ROUTES =====

/**
 * POST /production/yarn-fabric/twisting/initiate
 * Initiate yarn twisting if required by Tech Pack
 */
router.post(
  '/yarn-fabric/twisting/initiate',
  productionValidationSchemas.initiateYarnTwisting(),
  validateRequest,
  yarnFabricPhaseController.initiateYarnTwisting
);

/**
 * POST /production/yarn-fabric/twisting/complete
 * Complete yarn twisting process
 */
router.post(
  '/yarn-fabric/twisting/complete',
  yarnFabricPhaseController.completeYarnTwisting
);

/**
 * POST /production/yarn-fabric/weaving/dispatch
 * Dispatch yarn to weaving vendor
 */
router.post(
  '/yarn-fabric/weaving/dispatch',
  productionValidationSchemas.dispatchToWeaving(),
  validateRequest,
  yarnFabricPhaseController.dispatchToWeaving
);

/**
 * POST /production/yarn-fabric/fabric-output/log
 * Log raw fabric output from weaving vendor
 */
router.post(
  '/yarn-fabric/fabric-output/log',
  productionValidationSchemas.logRawFabricOutput(),
  validateRequest,
  yarnFabricPhaseController.logRawFabricOutput
);

/**
 * GET /production/yarn-fabric/status/:orderTokenId
 * Get yarn & fabric phase status
 */
router.get(
  '/yarn-fabric/status/:orderTokenId',
  yarnFabricPhaseController.getPhaseStatus
);

// ===== WET PROCESSING ROUTES =====

/**
 * POST /production/wet-processing/dispatch
 * Dispatch fabric to dyehouses
 */
router.post(
  '/wet-processing/dispatch',
  productionValidationSchemas.dispatchToWetProcessing(),
  validateRequest,
  wetProcessingController.dispatchToWetProcessing
);

/**
 * POST /production/wet-processing/quality-test/log
 * Log quality test results (Color Fastness, Shrinking, Gasoline Smell)
 */
router.post(
  '/wet-processing/quality-test/log',
  productionValidationSchemas.logQualityTest(),
  validateRequest,
  wetProcessingController.logQualityTest
);

/**
 * POST /production/wet-processing/complete
 * Complete wet processing with weight loss calculation and tolerance validation
 */
router.post(
  '/wet-processing/complete',
  productionValidationSchemas.completeWetProcessing(),
  validateRequest,
  wetProcessingController.completeWetProcessing
);

/**
 * GET /production/wet-processing/status/:orderTokenId
 * Get wet processing status and quality tests
 */
router.get(
  '/wet-processing/status/:orderTokenId',
  wetProcessingController.getProcessingStatus
);

/**
 * GET /production/wet-processing/quality-tests/:wetProcessingLogId
 * Get mandatory quality tests status
 */
router.get(
  '/wet-processing/quality-tests/:wetProcessingLogId',
  wetProcessingController.getMandatoryQualityTests
);

// ===== SURFACE DECORATION ROUTES =====

/**
 * POST /production/decoration/printing/dispatch
 * Dispatch fabric rolls to printing vendor
 */
router.post(
  '/decoration/printing/dispatch',
  productionValidationSchemas.dispatchToPrinting(),
  validateRequest,
  surfaceDecorationController.dispatchToPrinting
);

/**
 * POST /production/decoration/printing/complete
 * Complete printing with spec audit
 */
router.post(
  '/decoration/printing/complete',
  productionValidationSchemas.completePrinting(),
  validateRequest,
  surfaceDecorationController.completePrinting
);

/**
 * POST /production/decoration/embroidery/initiate
 * Initiate embroidery: cut and pre-stitch pieces
 */
router.post(
  '/decoration/embroidery/initiate',
  productionValidationSchemas.initiateEmbroidery(),
  validateRequest,
  surfaceDecorationController.initiateEmbroidery
);

/**
 * POST /production/decoration/embroidery/dispatch
 * Dispatch pre-stitched pieces to embroidery vendor
 */
router.post(
  '/decoration/embroidery/dispatch',
  productionValidationSchemas.dispatchToEmbroidery(),
  validateRequest,
  surfaceDecorationController.dispatchToEmbroidery
);

/**
 * POST /production/decoration/embroidery/complete
 * Complete embroidery with piece count validation
 */
router.post(
  '/decoration/embroidery/complete',
  productionValidationSchemas.completeEmbroidery(),
  validateRequest,
  surfaceDecorationController.completeEmbroidery
);

/**
 * GET /production/decoration/status/:orderTokenId
 * Get surface decoration status (printing & embroidery)
 */
router.get(
  '/decoration/status/:orderTokenId',
  surfaceDecorationController.getDecorationStatus
);

// ===== ASSEMBLY LINE ROUTES =====

/**
 * POST /production/assembly/job-card/create
 * Create job card for worker
 */
router.post(
  '/assembly/job-card/create',
  productionValidationSchemas.createJobCard(),
  validateRequest,
  assemblyLineController.createJobCard
);

/**
 * POST /production/assembly/phase/log
 * Log assembly phase work
 */
router.post(
  '/assembly/phase/log',
  productionValidationSchemas.logAssemblyPhase(),
  validateRequest,
  assemblyLineController.logAssemblyPhase
);

/**
 * POST /production/assembly/phase/complete
 * Complete assembly phase and update piece-rate wage
 */
router.post(
  '/assembly/phase/complete',
  productionValidationSchemas.completeAssemblyPhase(),
  validateRequest,
  assemblyLineController.completeAssemblyPhase
);

/**
 * GET /production/assembly/job-card/:jobCardId
 * Get job card details with all phases
 */
router.get(
  '/assembly/job-card/:jobCardId',
  assemblyLineController.getJobCard
);

/**
 * GET /production/assembly/job-cards/:orderTokenId
 * Get all job cards for an order
 */
router.get(
  '/assembly/job-cards/:orderTokenId',
  assemblyLineController.getOrderJobCards
);

/**
 * GET /production/assembly/phase-status/:orderTokenId
 * Get phase execution status across all workers
 */
router.get(
  '/assembly/phase-status/:orderTokenId',
  assemblyLineController.getOrderPhaseStatus
);

// ===== QC & PRE-SHIPPING ROUTES =====

/**
 * POST /production/qc/inspection/start
 * Start QC inspection process
 */
router.post(
  '/qc/inspection/start',
  productionValidationSchemas.startQcInspection(),
  validateRequest,
  qcPreShippingController.startQcInspection
);

/**
 * POST /production/qc/audit/log
 * Log QC audit result (Structural, Aesthetic, Aseptic)
 */
router.post(
  '/qc/audit/log',
  productionValidationSchemas.logQcAudit(),
  validateRequest,
  qcPreShippingController.logQcAudit
);

/**
 * POST /production/qc/inspection/complete
 * Complete QC inspection
 */
router.post(
  '/qc/inspection/complete',
  qcPreShippingController.completeQcInspection
);

/**
 * POST /production/ps/sample/initiate
 * Initiate pre-shipping sample (10% extraction)
 */
router.post(
  '/ps/sample/initiate',
  productionValidationSchemas.initiatePsSample(),
  validateRequest,
  qcPreShippingController.initiatePsSample
);

/**
 * POST /production/ps/sample/send-to-customer
 * Send PS sample to customer
 */
router.post(
  '/ps/sample/send-to-customer',
  qcPreShippingController.sendPsSampleToCustomer
);

/**
 * POST /production/ps/sample/approve
 * Customer approves PS sample
 */
router.post(
  '/ps/sample/approve',
  productionValidationSchemas.approvePsSample(),
  validateRequest,
  qcPreShippingController.approvePsSample
);

/**
 * POST /production/ps/sample/reject
 * Customer rejects PS sample - triggers rework
 */
router.post(
  '/ps/sample/reject',
  qcPreShippingController.rejectPsSample
);

/**
 * POST /production/export/validate-readiness
 * Validate export readiness gate
 */
router.post(
  '/export/validate-readiness',
  qcPreShippingController.validateExportReadiness
);

/**
 * GET /production/qc-ps/status/:orderTokenId
 * Get complete QC and PS status
 */
router.get(
  '/qc-ps/status/:orderTokenId',
  qcPreShippingController.getQcPsStatus
);

export default router;
