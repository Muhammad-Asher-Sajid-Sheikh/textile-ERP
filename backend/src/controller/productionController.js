/**
 * Production Controller
 */

import { MaterialAllocationService } from '../services/production/materialAllocation.js';
import { YarnFabricPhaseService } from '../services/production/yarnFabricPhase.js';
import { WetProcessingService } from '../services/production/wetProcessing.js';
import { SurfaceDecorationService } from '../services/production/surfaceDecoration.js';
import { AssemblyLineService } from '../services/production/assemblyLine.js';
import { QcPreShippingService } from '../services/production/qcPreShipping.js';
import { handleServiceError } from '../middleware/productionValidation.js';

export const materialAllocationController = {
  async createRequisition(req, res) {
    try {
      const result = await MaterialAllocationService.createRequisition(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async releaseRequisition(req, res) {
    try {
      const result = await MaterialAllocationService.releaseRequisition(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchMaterial(req, res) {
    try {
      const result = await MaterialAllocationService.dispatchMaterial(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getRequisitionStatus(req, res) {
    try {
      const result = await MaterialAllocationService.getRequisitionStatus(req.params.requisitionId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async cancelRequisition(req, res) {
    try {
      const result = await MaterialAllocationService.cancelRequisition(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

export const yarnFabricPhaseController = {
  async initiateYarnTwisting(req, res) {
    try {
      const result = await YarnFabricPhaseService.initiateYarnTwisting(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeYarnTwisting(req, res) {
    try {
      const result = await YarnFabricPhaseService.completeYarnTwisting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchToWeaving(req, res) {
    try {
      const result = await YarnFabricPhaseService.dispatchToWeaving(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logRawFabricOutput(req, res) {
    try {
      const result = await YarnFabricPhaseService.logRawFabricOutput(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getPhaseStatus(req, res) {
    try {
      const result = await YarnFabricPhaseService.getPhaseStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

export const wetProcessingController = {
  async dispatchToWetProcessing(req, res) {
    try {
      const result = await WetProcessingService.dispatchToWetProcessing(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logQualityTest(req, res) {
    try {
      const result = await WetProcessingService.logQualityTest(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeWetProcessing(req, res) {
    try {
      const result = await WetProcessingService.completeWetProcessing(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getProcessingStatus(req, res) {
    try {
      const result = await WetProcessingService.getProcessingStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getMandatoryQualityTests(req, res) {
    try {
      const result = await WetProcessingService.getMandatoryQualityTests(req.params.wetProcessingLogId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

export const surfaceDecorationController = {
  async dispatchToPrinting(req, res) {
    try {
      const result = await SurfaceDecorationService.dispatchToPrinting(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completePrinting(req, res) {
    try {
      const result = await SurfaceDecorationService.completePrinting(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async initiateEmbroidery(req, res) {
    try {
      const result = await SurfaceDecorationService.initiateEmbroidery(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async dispatchToEmbroidery(req, res) {
    try {
      const result = await SurfaceDecorationService.dispatchToEmbroidery(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeEmbroidery(req, res) {
    try {
      const result = await SurfaceDecorationService.completeEmbroidery(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getDecorationStatus(req, res) {
    try {
      const result = await SurfaceDecorationService.getDecorationStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

export const assemblyLineController = {
  async createJobCard(req, res) {
    try {
      const result = await AssemblyLineService.createJobCard(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logAssemblyPhase(req, res) {
    try {
      const result = await AssemblyLineService.logAssemblyPhase(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeAssemblyPhase(req, res) {
    try {
      const result = await AssemblyLineService.completeAssemblyPhase(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getJobCard(req, res) {
    try {
      const result = await AssemblyLineService.getJobCard(req.params.jobCardId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getOrderJobCards(req, res) {
    try {
      const result = await AssemblyLineService.getOrderJobCards(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getOrderPhaseStatus(req, res) {
    try {
      const result = await AssemblyLineService.getOrderPhaseStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};

export const qcPreShippingController = {
  async startQcInspection(req, res) {
    try {
      const result = await QcPreShippingService.startQcInspection(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async logQcAudit(req, res) {
    try {
      const result = await QcPreShippingService.logQcAudit(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async completeQcInspection(req, res) {
    try {
      const result = await QcPreShippingService.completeQcInspection(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async initiatePsSample(req, res) {
    try {
      const result = await QcPreShippingService.initiatePsSample(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async sendPsSampleToCustomer(req, res) {
    try {
      const result = await QcPreShippingService.sendPsSampleToCustomer(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async approvePsSample(req, res) {
    try {
      const result = await QcPreShippingService.approvePsSample(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async rejectPsSample(req, res) {
    try {
      const result = await QcPreShippingService.rejectPsSample(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async validateExportReadiness(req, res) {
    try {
      const result = await QcPreShippingService.validateExportReadiness(req.body);
      if (!result.success) {
        return res.status(403).json(result);
      }
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },

  async getQcPsStatus(req, res) {
    try {
      const result = await QcPreShippingService.getQcPsStatus(req.params.orderTokenId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  },
};
