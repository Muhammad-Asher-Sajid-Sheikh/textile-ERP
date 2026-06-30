import prisma from '../../lib/prisma.js';

/**
 * Enterprise Service Layer for FabricSync Tech Pack Module
 * Handles Version Control, Production Spec Gates, and Management Approval Routing
 */

// ==========================================
// 1. CORE LIFECYCLE & VERSIONING FUNCTIONS
// ==========================================

/**
 * Initializes a master Tech Pack shell mapped 1:1 with an active OrderToken.
 * Sets up a draft status (isLocked: false) with empty/null specification handles.
 */
export const createTechPackDraft = async (orderTokenId, data) => {
  // Check if a Tech Pack already exists for this order token
  const existingTechPack = await prisma.techPack.findUnique({
    where: { orderTokenId }
  });

  if (existingTechPack) {
    throw new Error('TECH_PACK_ALREADY_EXISTS');
  }

  return await prisma.techPack.create({
    data: {
      orderTokenId,
      designName: data.designName,
      seasonCode: data.seasonCode,
      totalTargetQuantity: data.totalTargetQuantity,
      version: 1,
      isLocked: false
    },
    include: {
      components: true
    }
  });
};

/**
 * Locks the current specification draft and routes an approval ticket to Management.
 * Runs atomically inside a Prisma transaction to eliminate partial state errors.
 */
export const releaseTechPackVersion = async (techPackId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current tech pack and ensure it's not already locked
    const techPack = await tx.techPack.findUnique({
      where: { id: techPackId },
      include: { components: true }
    });

    if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
    if (techPack.isLocked) throw new Error('VERSION_ALREADY_LOCKED');
    if (techPack.components.length === 0) throw new Error('CANNOT_RELEASE_WITHOUT_COMPONENTS');

    // 2. Lock the current Tech Pack version
    const lockedTechPack = await tx.techPack.update({
      where: { id: techPackId },
      data: { isLocked: true }
    });

    // 3. Update the associated global OrderToken state ledger to trigger management notification
    await tx.orderToken.update({
      where: { id: techPack.orderTokenId },
      data: {
        stage: 'MANAGEMENT_APPROVAL_PENDING',
        status: 'REVIEW'
      }
    });

    // 4. Create an immutable system audit trail log entry
    await tx.auditLogs.create({
      data: {
        table: 'TechPack',
        operation: 'RELEASE_VERSION',
        recordId: techPackId,
        previousState: JSON.stringify({ isLocked: false, version: techPack.version }),
        newState: JSON.stringify({ isLocked: true, version: techPack.version }),
        changedBy: 'Merchandising Department'
      }
    });

    return lockedTechPack;
  });
};

/**
 * Clones a locked/rejected specification bundle into a new unlocked, editable row
 * incrementing the structural version index count dynamically.
 */
export const createNewVersionFromLocked = async (techPackId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch old locked tech pack with all specs and deep-nested components
    const sourcePack = await tx.techPack.findUnique({
      where: { id: techPackId },
      include: { components: true }
    });

    if (!sourcePack) throw new Error('SOURCE_TECH_PACK_NOT_FOUND');
    if (!sourcePack.isLocked) throw new Error('CANNOT_VERSION_AN_UNLOCKED_DRAFT');

    // 2. Unlink old tech pack from the current 1:1 order token relation to free the unique constraint
    await tx.techPack.update({
      where: { id: techPackId },
      data: { orderTokenId: null } // Explicitly nullify to allow new active version to bind
    });

    // 3. Create the incremented Tech Pack header version record
    const newTechPack = await tx.techPack.create({
      data: {
        orderTokenId: sourcePack.orderTokenId, // Bind active token to this new master entry
        designName: sourcePack.designName,
        seasonCode: sourcePack.seasonCode,
        totalTargetQuantity: sourcePack.totalTargetQuantity,
        version: sourcePack.version + 1,
        isLocked: false,
        weavingSpecId: sourcePack.weavingSpecId,
        dyeingSpecId: sourcePack.dyeingSpecId
      }
    });

    // 4. Duplicate component arrays down to the new version with mapping loops
    if (sourcePack.components.length > 0) {
      await tx.techPackComponent.createMany({
        data: sourcePack.components.map((comp) => ({
          techPackId: newTechPack.id,
          componentName: comp.componentName,
          cutLengthInches: comp.cutLengthInches,
          cutWidthInches: comp.cutWidthInches,
          finishedLengthCms: comp.finishedLengthCms,
          finishedWidthCms: comp.finishedWidthCms,
          targetGsm: comp.targetGsm,
          targetPieceWeightGm: comp.targetPieceWeightGm,
          stitchingType: comp.stitchingType,
          borderStructure: comp.borderStructure,
          cartonPackingRatio: comp.cartonPackingRatio,
          printingSpecId: comp.printingSpecId
        }))
      });
    }

    return newTechPack;
  });
};

// ==========================================
// 2. OPERATIONAL COMPONENT & SPECIFICATION ADDITIONS
// ==========================================

/**
 * Creates or updates the shared bulk Weaving Specification.
 */
export const upsertWeavingSpecification = async (techPackId, weavingData) => {
  const techPack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
  if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

  return await prisma.$transaction(async (tx) => {
    const spec = await tx.weavingSpecification.create({
      data: {
        loomType: weavingData.loomType,
        warpYarnCount: weavingData.warpYarnCount,
        weftYarnCount: weavingData.weftYarnCount,
        pileYarnCount: weavingData.pileYarnCount,
        picksPerInch: weavingData.picksPerInch,
        endsPerInch: weavingData.endsPerInch,
        terryRatio: weavingData.terryRatio,
        technicalNotes: weavingData.technicalNotes
      }
    });

    await tx.techPack.update({
      where: { id: techPackId },
      data: { weavingSpecId: spec.id }
    });

    return spec;
  });
};

/**
 * Creates or updates the colorway dyehouse lot specifications.
 */
export const upsertDyeingSpecification = async (techPackId, dyeingData) => {
  const techPack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
  if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

  return await prisma.$transaction(async (tx) => {
    const spec = await tx.dyeingSpecification.create({
      data: {
        dyeType: dyeingData.dyeType,
        colorName: dyeingData.colorName,
        pantoneCode: dyeingData.pantoneCode,
        chemicalRestraints: dyeingData.chemicalRestraints,
        targetShrinkagePct: dyeingData.targetShrinkagePct
      }
    });

    await tx.techPack.update({
      where: { id: techPackId },
      data: { dyeingSpecId: spec.id }
    });

    return spec;
  });
};

/**
 * Appends an article profile (e.g., Bath Towel) with sizing rules and unique print specification overrides.
 */
export const addComponentToTechPack = async (techPackId, componentData) => {
  const techPack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
  if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

  return await prisma.$transaction(async (tx) => {
    let printingSpecId = null;

    // Handle surface decoration embedding conditionally if passed from layout parameters
    if (componentData.printingSpec) {
      const printSpec = await tx.printingSpecification.create({
        data: {
          printMethod: componentData.printingSpec.printMethod,
          placementArea: componentData.printingSpec.placementArea,
          colorCount: componentData.printingSpec.colorCount
        }
      });
      printingSpecId = printSpec.id;
    }

    return await tx.techPackComponent.create({
      data: {
        techPackId,
        componentName: componentData.componentName,
        cutLengthInches: componentData.cutLengthInches,
        cutWidthInches: componentData.cutWidthInches,
        finishedLengthCms: componentData.finishedLengthCms,
        finishedWidthCms: componentData.finishedWidthCms,
        targetGsm: componentData.targetGsm,
        targetPieceWeightGm: componentData.targetPieceWeightGm,
        stitchingType: componentData.stitchingType,
        borderStructure: componentData.borderStructure,
        cartonPackingRatio: componentData.cartonPackingRatio,
        printingSpecId
      }
    });
  });
};

/**
 * Drops a specific item article out of a draft set grouping.
 */
export const removeComponentFromTechPack = async (componentId) => {
  const component = await prisma.techPackComponent.findUnique({
    where: { id: componentId },
    include: { techPack: true }
  });

  if (!component) throw new Error('COMPONENT_NOT_FOUND');
  if (component.techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

  return await prisma.techPackComponent.delete({
    where: { id: componentId }
  });
};

// ==========================================
// 3. READ & QUERY AGGREGATORS
// ==========================================

/**
 * Returns a complete multi-tier execution tree schema frame.
 * Accepts either techPackId or orderTokenId for architectural route flexibility.
 */
export const getTechPackDetails = async (identifier) => {
  return await prisma.techPack.findFirst({
    where: {
      OR: [
        { id: identifier },
        { orderTokenId: identifier }
      ]
    },
    include: {
      weavingSpec: true,
      dyeingSpec: true,
      components: {
        include: {
          printingSpec: true
        }
      },
      orderToken: true
    }
  });
};

/**
 * Fetches all locked records currently idling on the system workflow awaiting evaluation signatures.
 */
export const getPendingManagementApprovals = async () => {
  return await prisma.techPack.findMany({
    where: {
      isLocked: true,
      orderToken: {
        stage: 'MANAGEMENT_APPROVAL_PENDING'
      }
    },
    include: {
      components: true,
      orderToken: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
};