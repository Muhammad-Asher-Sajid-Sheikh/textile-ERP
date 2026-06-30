import { Router } from 'express';
import { checktoken } from '../middleware/checktoken.js';
import { checkApproved } from '../middleware/rbac.js';

// Importing explicit destructured controller handlers from your native singular folder path
import {
  initTechPackDraft,
  releaseVersion,
  createNewRevision,
  setWeavingSpecs,
  setDyeingSpecs,
  appendComponent,
  deleteComponent,
  fetchTechPackDetails,
  fetchPendingApprovals
} from '../controller/merchandiseController.js';

const router = Router();

// Apply authentication and enterprise authorization checkpoints globally to this routing module
router.use(checktoken);
router.use(checkApproved);

// -------------------------------------------------------------------------
// 1. Lifecycle & Version Management Endpoints
// -------------------------------------------------------------------------

// Initialize a brand new draft specification shell for an Order Token
router.post('/tech-packs', initTechPackDraft);

// Freeze an active specification copy and forward to management for signature
router.post('/tech-packs/:id/release', releaseVersion);

// Spawn an unlocked revision branch from a rejected or archived snapshot
router.post('/tech-packs/:id/revision', createNewRevision);


// -------------------------------------------------------------------------
// 2. Specification Mutations (Fabric-Wide Technical Recipes)
// -------------------------------------------------------------------------

// Save or overwrite technical loom setup matrices (warp/weft yarn ratios)
router.put('/tech-packs/:id/weaving-specs', setWeavingSpecs);

// Configure dyehouse lot color matching rules and target shrinkage windows
router.put('/tech-packs/:id/dyeing-specs', setDyeingSpecs);


// -------------------------------------------------------------------------
// 3. Component Array Operations (Individual Sku Breakdowns)
// -------------------------------------------------------------------------

// Append a piece-rate article component item node (e.g., Bath vs Hand Towel)
router.post('/tech-packs/:id/components', appendComponent);

// Delete a single piece component by its database UUID out of an open workspace
router.delete('/components/:componentId', deleteComponent);


// -------------------------------------------------------------------------
// 4. Fetching, Monitoring & Operational Audit Queries
// -------------------------------------------------------------------------

// Resolve a deep multi-tier spec tree layout via either techPackId or orderTokenId
router.get('/tech-packs/:identifier', fetchTechPackDetails);

// Poll the global queue for locked specifications awaiting evaluation
router.get('/approvals/pending', fetchPendingApprovals);


export default router;