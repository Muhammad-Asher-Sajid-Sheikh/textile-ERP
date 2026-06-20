/**
 * Production Routes
 */

import { Router } from 'express';
import { checktoken } from '../middleware/checktoken.js';
import { checkApproved } from '../middleware/rbac.js';
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

const router = Router();

// Apply authentication and authorization middleware
router.use(checktoken);
router.use(checkApproved);

// ============================================================
// MATERIAL ALLOCATION ENDPOINTS
// ============================================================

router.post(
  '/material-allocation/requisition',
  ...productionValidationSchemas.createRequisition,
  validateRequest,
  materialAllocationController.createRequisition
);

router.post(
  '/requisition/release',
  ...productionValidationSchemas.releaseRequisition,
  validateRequest,
  materialAllocationController.releaseRequisition
);

router.post(
  '/material/dispatch',
  ...productionValidationSchemas.dispatchMaterial,
  validateRequest,
  materialAllocationController.dispatchMaterial
);

router.get(
  '/requisition/status/:requisitionId',
  ...productionValidationSchemas.getRequisitionStatus,
  validateRequest,
  materialAllocationController.getRequisitionStatus
);

router.post(
  '/requisition/cancel',
  ...productionValidationSchemas.cancelRequisition,
  validateRequest,
  materialAllocationController.cancelRequisition
);

// ============================================================
// YARN & FABRIC PHASE ENDPOINTS
// ============================================================

router.post(
  '/yarn-fabric/twisting/initiate',
  ...productionValidationSchemas.initiateYarnTwisting,
  validateRequest,
  yarnFabricPhaseController.initiateYarnTwisting
);

router.post(
  '/yarn-fabric/twisting/complete',
  ...productionValidationSchemas.completeYarnTwisting,
  validateRequest,
  yarnFabricPhaseController.completeYarnTwisting
);

router.post(
  '/yarn-fabric/weaving/dispatch',
  ...productionValidationSchemas.dispatchToWeaving,
  validateRequest,
  yarnFabricPhaseController.dispatchToWeaving
);

router.post(
  '/yarn-fabric/fabric-output/log',
  ...productionValidationSchemas.logRawFabricOutput,
  validateRequest,
  yarnFabricPhaseController.logRawFabricOutput
);

router.get(
  '/yarn-fabric/status/:orderTokenId',
  ...productionValidationSchemas.getPhaseStatus,
  validateRequest,
  yarnFabricPhaseController.getPhaseStatus
);

// ============================================================
// WET PROCESSING ENDPOINTS
// ============================================================

router.post(
  '/wet-processing/dispatch',
  ...productionValidationSchemas.dispatchToWetProcessing,
  validateRequest,
  wetProcessingController.dispatchToWetProcessing
);

router.post(
  '/wet-processing/quality-test/log',
  ...productionValidationSchemas.logQualityTest,
  validateRequest,
  wetProcessingController.logQualityTest
);

router.post(
  '/wet-processing/complete',
  ...productionValidationSchemas.completeWetProcessing,
  validateRequest,
  wetProcessingController.completeWetProcessing
);

router.get(
  '/wet-processing/status/:orderTokenId',
  ...productionValidationSchemas.getProcessingStatus,
  validateRequest,
  wetProcessingController.getProcessingStatus
);

router.get(
  '/wet-processing/mandatory-tests/:wetProcessingLogId',
  ...productionValidationSchemas.getProcessingStatus,
  validateRequest,
  wetProcessingController.getMandatoryQualityTests
);

// ============================================================
// SURFACE DECORATION ENDPOINTS
// ============================================================

router.post(
  '/decoration/printing/dispatch',
  ...productionValidationSchemas.dispatchToPrinting,
  validateRequest,
  surfaceDecorationController.dispatchToPrinting
);

router.post(
  '/decoration/printing/complete',
  ...productionValidationSchemas.completePrinting,
  validateRequest,
  surfaceDecorationController.completePrinting
);

router.post(
  '/decoration/embroidery/initiate',
  ...productionValidationSchemas.initiateEmbroidery,
  validateRequest,
  surfaceDecorationController.initiateEmbroidery
);

router.post(
  '/decoration/embroidery/dispatch',
  ...productionValidationSchemas.dispatchToEmbroidery,
  validateRequest,
  surfaceDecorationController.dispatchToEmbroidery
);

router.post(
  '/decoration/embroidery/complete',
  ...productionValidationSchemas.completeEmbroidery,
  validateRequest,
  surfaceDecorationController.completeEmbroidery
);

router.get(
  '/decoration/status/:orderTokenId',
  ...productionValidationSchemas.getDecorationStatus,
  validateRequest,
  surfaceDecorationController.getDecorationStatus
);

// ============================================================
// ASSEMBLY LINE ENDPOINTS
// ============================================================

router.post(
  '/assembly/job-card/create',
  ...productionValidationSchemas.createJobCard,
  validateRequest,
  assemblyLineController.createJobCard
);

router.post(
  '/assembly/phase/log',
  ...productionValidationSchemas.logAssemblyPhase,
  validateRequest,
  assemblyLineController.logAssemblyPhase
);

router.post(
  '/assembly/phase/complete',
  ...productionValidationSchemas.completeAssemblyPhase,
  validateRequest,
  assemblyLineController.completeAssemblyPhase
);

router.get(
  '/assembly/job-card/:jobCardId',
  ...productionValidationSchemas.getJobCard,
  validateRequest,
  assemblyLineController.getJobCard
);

router.get(
  '/assembly/order-job-cards/:orderTokenId',
  ...productionValidationSchemas.getOrderJobCards,
  validateRequest,
  assemblyLineController.getOrderJobCards
);

router.get(
  '/assembly/phase-status/:orderTokenId',
  ...productionValidationSchemas.getOrderPhaseStatus,
  validateRequest,
  assemblyLineController.getOrderPhaseStatus
);

// ============================================================
// QC & PRE-SHIPPING ENDPOINTS
// ============================================================

router.post(
  '/qc/inspection/start',
  ...productionValidationSchemas.startQcInspection,
  validateRequest,
  qcPreShippingController.startQcInspection
);

router.post(
  '/qc/audit/log',
  ...productionValidationSchemas.logQcAudit,
  validateRequest,
  qcPreShippingController.logQcAudit
);

router.post(
  '/qc/inspection/complete',
  ...productionValidationSchemas.completeQcInspection,
  validateRequest,
  qcPreShippingController.completeQcInspection
);

router.post(
  '/qc/ps-sample/initiate',
  ...productionValidationSchemas.initiatePsSample,
  validateRequest,
  qcPreShippingController.initiatePsSample
);

router.post(
  '/qc/ps-sample/send',
  ...productionValidationSchemas.sendPsSampleToCustomer,
  validateRequest,
  qcPreShippingController.sendPsSampleToCustomer
);

router.post(
  '/qc/ps-sample/approve',
  ...productionValidationSchemas.approvePsSample,
  validateRequest,
  qcPreShippingController.approvePsSample
);

router.post(
  '/qc/ps-sample/reject',
  ...productionValidationSchemas.rejectPsSample,
  validateRequest,
  qcPreShippingController.rejectPsSample
);

router.post(
  '/export/validate-readiness',
  ...productionValidationSchemas.validateExportReadiness,
  validateRequest,
  qcPreShippingController.validateExportReadiness
);

router.get(
  '/qc/ps-status/:orderTokenId',
  ...productionValidationSchemas.getQcPsStatus,
  validateRequest,
  qcPreShippingController.getQcPsStatus
);

export default router;
