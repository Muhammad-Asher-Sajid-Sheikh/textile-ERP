/**
 * Production Controllers
 * Handles all HTTP requests for production pipeline management
 */

import type { Request, Response, NextFunction } from 'express';
import { MaterialAllocationService } from '../services/production/materialAllocation.js';
import { YarnFabricPhaseService } from '../services/production/yarnFabricPhase.js';
import { WetProcessingService } from '../services/production/wetProcessing.js';
import { SurfaceDecorationService } from '../services/production/surfaceDecoration.js';
import { AssemblyLineService } from '../services/production/assemblyLine.js';
import { QcPreShippingService } from '../services/production/qcPreShipping.js';
import { handleServiceError } from '../middleware/productionValidation.js';

// ========== MATERIAL ALLOCATION CONTROLLER ==========

export const materialAllocationController = {
  async createRequisition(req: Request, res: Response) {
    try {
      const result = await MaterialAllocationService.createRequisition(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async releaseRequisition(req: Request, res: Response) {
    try {
      const result = await MaterialAllocationService.releaseRequisition(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchMaterial(req: Request, res: Response) {
    try {
      const result = await MaterialAllocationService.dispatchMaterial(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getRequisitionStatus(req: Request, res: Response) {
    try {
      const result = await MaterialAllocationService.getRequisitionStatus(req.params.requisitionId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async cancelRequisition(req: Request, res: Response) {
    try {
      const result = await MaterialAllocationService.cancelRequisition(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

// ========== YARN & FABRIC PHASE CONTROLLER ==========

export const yarnFabricPhaseController = {
  async initiateYarnTwisting(req: Request, res: Response) {
    try {
      const result = await YarnFabricPhaseService.initiateYarnTwisting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeYarnTwisting(req: Request, res: Response) {
    try {
      const result = await YarnFabricPhaseService.completeYarnTwisting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchToWeaving(req: Request, res: Response) {
    try {
      const result = await YarnFabricPhaseService.dispatchToWeaving(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logRawFabricOutput(req: Request, res: Response) {
    try {
      const result = await YarnFabricPhaseService.logRawFabricOutput(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getPhaseStatus(req: Request, res: Response) {
    try {
      const result = await YarnFabricPhaseService.getPhaseStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

// ========== WET PROCESSING CONTROLLER ==========

export const wetProcessingController = {
  async dispatchToWetProcessing(req: Request, res: Response) {
    try {
      const result = await WetProcessingService.dispatchToWetProcessing(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logQualityTest(req: Request, res: Response) {
    try {
      const result = await WetProcessingService.logQualityTest(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeWetProcessing(req: Request, res: Response) {
    try {
      const result = await WetProcessingService.completeWetProcessing(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getProcessingStatus(req: Request, res: Response) {
    try {
      const result = await WetProcessingService.getProcessingStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getMandatoryQualityTests(req: Request, res: Response) {
    try {
      const result = await WetProcessingService.getMandatoryQualityTests(
        req.params.wetProcessingLogId
      );
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

// ========== SURFACE DECORATION CONTROLLER ==========

export const surfaceDecorationController = {
  async dispatchToPrinting(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.dispatchToPrinting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completePrinting(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.completePrinting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async initiateEmbroidery(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.initiateEmbroidery(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchToEmbroidery(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.dispatchToEmbroidery(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeEmbroidery(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.completeEmbroidery(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getDecorationStatus(req: Request, res: Response) {
    try {
      const result = await SurfaceDecorationService.getDecorationStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

// ========== ASSEMBLY LINE CONTROLLER ==========

export const assemblyLineController = {
  async createJobCard(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.createJobCard(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logAssemblyPhase(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.logAssemblyPhase(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeAssemblyPhase(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.completeAssemblyPhase(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getJobCard(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.getJobCard(req.params.jobCardId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getOrderJobCards(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.getOrderJobCards(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getOrderPhaseStatus(req: Request, res: Response) {
    try {
      const result = await AssemblyLineService.getOrderPhaseStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

// ========== QC & PRE-SHIPPING CONTROLLER ==========

export const qcPreShippingController = {
  async startQcInspection(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.startQcInspection(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logQcAudit(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.logQcAudit(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeQcInspection(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.completeQcInspection(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async initiatePsSample(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.initiatePsSample(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async sendPsSampleToCustomer(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.sendPsSampleToCustomer(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async approvePsSample(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.approvePsSample(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async rejectPsSample(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.rejectPsSample(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async validateExportReadiness(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.validateExportReadiness(req.body);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getQcPsStatus(req: Request, res: Response) {
    try {
      const result = await QcPreShippingService.getQcPsStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};
