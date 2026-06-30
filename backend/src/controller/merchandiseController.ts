import type { Request, Response } from 'express';
import { TechPackService } from '../services/merchandise/techpack.js';

export const createTechPackDraft = TechPackService.createTechPackDraft;
export const releaseTechPackVersion = TechPackService.releaseTechPackVersion;
export const createNewVersionFromLocked = TechPackService.createNewVersionFromLocked;
export const upsertWeavingSpecification = TechPackService.upsertWeavingSpecification;
export const upsertDyeingSpecification = TechPackService.upsertDyeingSpecification;
export const addComponentToTechPack = TechPackService.addComponentToTechPack;
export const removeComponentFromTechPack = TechPackService.removeComponentFromTechPack;
export const getTechPackDetails = TechPackService.getTechPackDetails;
export const getPendingManagementApprovals = TechPackService.getPendingManagementApprovals;
/**
 * Standardized API Response Helpers
 */
const sendSuccess = (res: Response, data: any, statusCode: number = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

const sendError = (res: Response, error: any, defaultMessage: string = 'INTERNAL_SERVER_ERROR'): Response => {
  const message = error.message || defaultMessage;
  
  // Map domain validation errors to accurate HTTP Status codes
  let statusCode = 500;
  if ([
    'TECH_PACK_NOT_FOUND', 
    'COMPONENT_NOT_FOUND', 
    'SOURCE_TECH_PACK_NOT_FOUND'
  ].includes(message)) {
    statusCode = 404;
  } else if ([
    'TECH_PACK_ALREADY_EXISTS', 
    'VERSION_ALREADY_LOCKED', 
    'CANNOT_RELEASE_WITHOUT_COMPONENTS', 
    'MUTATION_BLOCKED_LOCKED_VERSION', 
    'CANNOT_VERSION_AN_UNLOCKED_DRAFT'
  ].includes(message)) {
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    message: error.localizedMessage || 'An operational error occurred during data mutation.'
  });
};

// ==========================================
// 1. LIFECYCLE & VERSION MANAGEMENT HANDLERS
// ==========================================

/**
 * Instantiates a brand new Tech Pack master draft shell mapped to a specific PO token.
 * POST /api/merchandise/tech-packs
 */
export const initTechPackDraft = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { orderTokenId, designName, seasonCode, totalTargetQuantity } = req.body;
    
    if (!orderTokenId || !designName || !totalTargetQuantity) {
      return res.status(400).json({ success: false, error: 'MISSING_REQUIRED_FIELDS' });
    }

    const draft = await createTechPackDraft(orderTokenId, {
      designName,
      seasonCode,
      totalTargetQuantity
    });

    return sendSuccess(res, draft, 201); // 201 Created
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Submits the technical specifications package to management for immutable authorization signature.
 * POST /api/merchandise/tech-packs/:id/release
 */
export const releaseVersion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const releasedPack = await releaseTechPackVersion(id);
    return sendSuccess(res, releasedPack, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Creates an unlocked revision branch from a rejected or archived specification layout.
 * POST /api/merchandise/tech-packs/:id/revision
 */
export const createNewRevision = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const revision = await createNewVersionFromLocked(id);
    return sendSuccess(res, revision, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

// ==========================================
// 2. SPECIFICATION MUTATIONS (UPSERTS)
// ==========================================

/**
 * Saves or updates loom technical attributes for the underlying master fabric roll run.
 * PUT /api/merchandise/tech-packs/:id/weaving-specs
 */
export const setWeavingSpecs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const weavingData = req.body;

    // Direct structural validation check before payload passing
    if (!weavingData.loomType || !weavingData.warpYarnCount || !weavingData.weftYarnCount) {
      return res.status(400).json({ success: false, error: 'INVALID_WEAVING_PARAMETERS' });
    }

    const spec = await upsertWeavingSpecification(id, weavingData);
    return sendSuccess(res, spec, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Saves or updates dyehouse recipes, color pantones, and shrinkage target constraints.
 * PUT /api/merchandise/tech-packs/:id/dyeing-specs
 */
export const setDyeingSpecs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const dyeingData = req.body;

    if (!dyeingData.dyeType || !dyeingData.colorName || !dyeingData.pantoneCode) {
      return res.status(400).json({ success: false, error: 'INVALID_DYEING_PARAMETERS' });
    }

    const spec = await upsertDyeingSpecification(id, dyeingData);
    return sendSuccess(res, spec, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

// ==========================================
// 3. COMPONENT ARRAY OPERATIONS
// ==========================================

/**
 * Adds an individual article config (e.g., Hand Towel) directly inside a draft specification list.
 * POST /api/merchandise/tech-packs/:id/components
 */
export const appendComponent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const componentData = req.body;

    if (!componentData.componentName || !componentData.targetGsm || !componentData.targetPieceWeightGm) {
      return res.status(400).json({ success: false, error: 'INVALID_COMPONENT_PARAMETERS' });
    }

    const newComponent = await addComponentToTechPack(id, componentData);
    return sendSuccess(res, newComponent, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Removes an article item node out of an editable draft breakdown stack.
 * DELETE /api/merchandise/components/:componentId
 */
export const deleteComponent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { componentId } = req.params;
    await removeComponentFromTechPack(componentId);
    return sendSuccess(res, { message: 'COMPONENT_SUCCESSFULLY_DELETED' }, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

// ==========================================
// 4. FETCHING & MONITORING QUERIES
// ==========================================

/**
 * Resolves a full execution specification tree structure by its UUID token key.
 * GET /api/merchandise/tech-packs/:identifier
 */
export const fetchTechPackDetails = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { identifier } = req.params;
    const details = await getTechPackDetails(identifier);
    
    if (!details) {
      return res.status(404).json({ success: false, error: 'TECH_PACK_NOT_FOUND' });
    }

    return sendSuccess(res, details, 200);
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Pulls down all current locked records idling in queue for management signature actions.
 * GET /api/merchandise/approvals/pending
 */
export const fetchPendingApprovals = async (req: Request, res: Response): Promise<Response> => {
  try {
    const pendingList = await getPendingManagementApprovals();
    return sendSuccess(res, pendingList, 200);
  } catch (error) {
    return sendError(res, error);
  }
};