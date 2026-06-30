/**
 * Enterprise Service Layer for FabricSync Tech Pack Module
 * Handles Version Control, Production Spec Gates, and Management Approval Routing
 */

import prisma from '../../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/client.js';


/**
 * =========================================================================
 * 📊 TYPE DEFINITIONS & WORKFLOW STRATEGIC INTERFACES
 * =========================================================================
 */

export interface CreateTechPackDraftRequest {
  orderTokenId: string;
  designName: string;
  seasonCode?: string | null;
  totalTargetQuantity: number;
}

export interface ReleaseTechPackVersionRequest {
  techPackId: string;
}

export interface CreateNewVersionRequest {
  techPackId: string;
}

export interface UpsertWeavingSpecRequest {
  techPackId: string;
  loomType: string;
  warpYarnCount: string;
  weftYarnCount: string;
  pileYarnCount?: string | null;
  picksPerInch: number;
  endsPerInch: number;
  terryRatio?: number | Decimal | null;
  technicalNotes?: string | null;
}

export interface UpsertDyeingSpecRequest {
  techPackId: string;
  dyeType: string;
  colorName: string;
  pantoneCode: string;
  chemicalRestraints?: string | null;
  targetShrinkagePct: number | Decimal;
}

export interface AppendComponentRequest {
  techPackId: string;
  componentName: string;
  cutLengthInches: number | Decimal;
  cutWidthInches: number | Decimal;
  finishedLengthCms: number | Decimal;
  finishedWidthCms: number | Decimal;
  targetGsm: number;
  targetPieceWeightGm: number | Decimal;
  stitchingType: string;
  borderStructure?: string | null;
  cartonPackingRatio: number;
  printingSpec?: {
    printMethod: string;
    placementArea: string;
    colorCount: number;
  } | null;
}

export interface RemoveComponentRequest {
  componentId: string;
}

export interface GetTechPackDetailsRequest {
  identifier: string;
}

type PrismaTransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class TechPackService {
  // ==========================================
  // 1. CORE LIFECYCLE & VERSIONING FUNCTIONS
  // ==========================================

  /**
   * Initializes a master Tech Pack shell mapped 1:1 with an active OrderToken.
   * Sets up a draft status (isLocked: false) with empty/null specification handles.
   */
  static async createTechPackDraft(request: CreateTechPackDraftRequest) {
  const existingTechPack = await prisma.techPack.findUnique({
    where: { orderTokenId: request.orderTokenId }
  });

  if (existingTechPack) {
    throw new Error('TECH_PACK_ALREADY_EXISTS');
  }

  const draft = await prisma.techPack.create({
    data: {
      orderTokenId: request.orderTokenId,
      designName: request.designName,
      // Coalesce undefined to null to completely satisfy exactOptionalPropertyTypes
      seasonCode: request.seasonCode ?? null, 
      totalTargetQuantity: request.totalTargetQuantity,
      version: 1,
      isLocked: false
    },
    include: {
      components: true
    }
  });

  return {
    success: true,
    data: {
      id: draft.id,
      orderTokenId: draft.orderTokenId,
      designName: draft.designName,
      seasonCode: draft.seasonCode,
      totalTargetQuantity: draft.totalTargetQuantity,
      version: draft.version,
      isLocked: draft.isLocked,
      components: draft.components, // ✅ This will now resolve perfectly error-free!
      message: 'Tech Pack draft initialized successfully'
    }
  };
}

  /**
   * Locks the current specification draft and routes an approval ticket to Management.
   * Runs atomically inside a Prisma transaction to eliminate partial state errors.
   */
  static async releaseTechPackVersion(request: ReleaseTechPackVersionRequest) {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // 1. Fetch current tech pack and ensure it's not already locked
      const techPack = await tx.techPack.findUnique({
        where: { id: request.techPackId },
        include: { components: true }
      });

      if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
      if (techPack.isLocked) throw new Error('VERSION_ALREADY_LOCKED');
      if (techPack.components.length === 0) throw new Error('CANNOT_RELEASE_WITHOUT_COMPONENTS');

      // 2. Lock the current Tech Pack version
      const lockedTechPack = await tx.techPack.update({
        where: { id: request.techPackId },
        data: { isLocked: true }
      });

      // 3. Update the associated global OrderToken state ledger to trigger management notification
      if (techPack.orderTokenId) {
        await tx.orderToken.update({
          where: { id: techPack.orderTokenId },
          data: {
            stage: 'MANAGEMENT_APPROVAL_PENDING',
            status: 'AUTHORIZED'
          }
        });
      }

      // 4. Create an immutable system audit trail log entry
      await tx.auditLogs.create({
        data: {
          table: 'TechPack',
          operation: 'RELEASE_VERSION',
          recordId: request.techPackId,
          previousState: JSON.stringify({ isLocked: false, version: techPack.version }),
          newState: JSON.stringify({ isLocked: true, version: techPack.version }),
          changedBy: 'Merchandising Department'
        }
      });

      return {
        success: true,
        data: {
          id: lockedTechPack.id,
          version: lockedTechPack.version,
          isLocked: lockedTechPack.isLocked,
          message: 'Tech Pack frozen and queued for approval'
        }
      };
    });
  }

  /**
   * Clones a locked/rejected specification bundle into a new unlocked, editable row
   * incrementing the structural version index count dynamically.
   */
  static async createNewVersionFromLocked(request: CreateNewVersionRequest) {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // 1. Fetch old locked tech pack with all specs and deep-nested components
      const sourcePack = await tx.techPack.findUnique({
        where: { id: request.techPackId },
        include: { components: true }
      });

      if (!sourcePack) throw new Error('SOURCE_TECH_PACK_NOT_FOUND');
      if (!sourcePack.isLocked) throw new Error('CANNOT_VERSION_AN_UNLOCKED_DRAFT');
      if (!sourcePack.orderTokenId) throw new Error('ORDER_TOKEN_LINK_MISSING');

      // 2. Unlink old tech pack from the current 1:1 order token relation to free the unique constraint
      await tx.techPack.update({
        where: { id: request.techPackId },
        data: { orderTokenId: null }
      });

      // 3. Create the incremented Tech Pack header version record
      const newTechPack = await tx.techPack.create({
        data: {
          orderTokenId: sourcePack.orderTokenId,
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

      return {
        success: true,
        data: {
          id: newTechPack.id,
          version: newTechPack.version,
          isLocked: newTechPack.isLocked,
          message: 'New editable revision fork instantiated'
        }
      };
    });
  }

  // ==========================================
  // 2. OPERATIONAL COMPONENT & SPECIFICATION ADDITIONS
  // ==========================================

  /**
   * Creates or updates the shared bulk Weaving Specification.
   */
  static async upsertWeavingSpecification(request: UpsertWeavingSpecRequest) {
    const techPack = await prisma.techPack.findUnique({ where: { id: request.techPackId } });
    if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
    if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const spec = await tx.weavingSpecification.create({
      data: {
        loomType: request.loomType,
        warpYarnCount: request.warpYarnCount,
        weftYarnCount: request.weftYarnCount,
        picksPerInch: request.picksPerInch,
        endsPerInch: request.endsPerInch,
        // ✅ Coalesce undefined properties directly to null to satisfy strict tsconfig checks
        pileYarnCount: request.pileYarnCount ?? null,
        terryRatio: request.terryRatio ?? null,
        technicalNotes: request.technicalNotes ?? null
      }
    });

      await tx.techPack.update({
        where: { id: request.techPackId },
        data: { weavingSpecId: spec.id }
      });

      return {
        success: true,
        data: {
          id: spec.id,
          loomType: spec.loomType,
          terryRatio: spec.terryRatio ? Number(spec.terryRatio) : null,
          message: 'Weaving operational specifications pinned'
        }
      };
    });
  }

  /**
   * Creates or updates the colorway dyehouse lot specifications.
   */
  static async upsertDyeingSpecification(request: UpsertDyeingSpecRequest) {
    const techPack = await prisma.techPack.findUnique({ where: { id: request.techPackId } });
    if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
    if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const spec = await tx.dyeingSpecification.create({
      data: {
        dyeType: request.dyeType,
        colorName: request.colorName,
        pantoneCode: request.pantoneCode,
        targetShrinkagePct: request.targetShrinkagePct,
        // ✅ Clear out 'undefined' using nullish coalescing
        chemicalRestraints: request.chemicalRestraints ?? null 
      }
    });

      await tx.techPack.update({
        where: { id: request.techPackId },
        data: { dyeingSpecId: spec.id }
      });

      return {
        success: true,
        data: {
          id: spec.id,
          colorName: spec.colorName,
          targetShrinkagePct: Number(spec.targetShrinkagePct),
          message: 'Dyehouse recipe configuration successful'
        }
      };
    });
  }

  /**
   * Appends an article profile (e.g., Bath Towel) with sizing rules and unique print specification overrides.
   */
  static async addComponentToTechPack(request: AppendComponentRequest) {
    const techPack = await prisma.techPack.findUnique({ where: { id: request.techPackId } });
    if (!techPack) throw new Error('TECH_PACK_NOT_FOUND');
    if (techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      let printingSpecId: string | null = null;

      if (request.printingSpec) {
        const printSpec = await tx.printingSpecification.create({
          data: {
            printMethod: request.printingSpec.printMethod,
            placementArea: request.printingSpec.placementArea,
            colorCount: request.printingSpec.colorCount
          }
        });
        printingSpecId = printSpec.id;
      }

      const component = await tx.techPackComponent.create({
        data: {
          techPackId: request.techPackId,
          componentName: request.componentName,
          cutLengthInches: request.cutLengthInches,
          cutWidthInches: request.cutWidthInches,
          finishedLengthCms: request.finishedLengthCms,
          finishedWidthCms: request.finishedWidthCms,
          targetGsm: request.targetGsm,
          targetPieceWeightGm: request.targetPieceWeightGm,
          stitchingType: request.stitchingType,
          cartonPackingRatio: request.cartonPackingRatio,
          
          // ✅ Coalesce optional request fields to clear out hidden 'undefined' types
          borderStructure: request.borderStructure ?? null,
          
          // ✅ Ensure printingSpecId explicitly defaults to null if it's unassigned
          printingSpecId: printingSpecId ?? null
        }
      });

      return {
        success: true,
        data: {
          id: component.id,
          techPackId: component.techPackId,
          componentName: component.componentName,
          targetPieceWeightGm: Number(component.targetPieceWeightGm),
          printingSpecId: component.printingSpecId,
          message: 'Sku dimension component added successfully'
        }
      };
    });
  }

  /**
   * Drops a specific item article out of a draft set grouping.
   */
  static async removeComponentFromTechPack(request: RemoveComponentRequest) {
    const component = await prisma.techPackComponent.findUnique({
      where: { id: request.componentId },
      include: { techPack: true }
    });

    if (!component) throw new Error('COMPONENT_NOT_FOUND');
    if (component.techPack.isLocked) throw new Error('MUTATION_BLOCKED_LOCKED_VERSION');

    await prisma.techPackComponent.delete({
      where: { id: request.componentId }
    });

    return {
      success: true,
      data: {
        componentId: request.componentId,
        message: 'COMPONENT_SUCCESSFULLY_DELETED'
      }
    };
  }

  // ==========================================
  // 3. READ & QUERY AGGREGATORS
  // ==========================================

  /**
   * Returns a complete multi-tier execution tree schema frame.
   * Accepts either techPackId or orderTokenId for architectural route flexibility.
   */
  static async getTechPackDetails(request: GetTechPackDetailsRequest) {
    const details = await prisma.techPack.findFirst({
      where: {
        OR: [
          { id: request.identifier },
          { orderTokenId: request.identifier }
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

    if (!details) return null;

    return {
      success: true,
      data: {
        id: details.id,
        orderTokenId: details.orderTokenId,
        designName: details.designName,
        version: details.version,
        isLocked: details.isLocked,
        weavingSpec: details.weavingSpec ? {
          ...details.weavingSpec,
          terryRatio: details.weavingSpec.terryRatio ? Number(details.weavingSpec.terryRatio) : null
        } : null,
        dyeingSpec: details.dyeingSpec ? {
          ...details.dyeingSpec,
          targetShrinkagePct: Number(details.dyeingSpec.targetShrinkagePct)
        } : null,
        components: details.components.map((comp) => ({
          ...comp,
          cutLengthInches: Number(comp.cutLengthInches),
          cutWidthInches: Number(comp.cutWidthInches),
          finishedLengthCms: Number(comp.finishedLengthCms),
          finishedWidthCms: Number(comp.finishedWidthCms),
          targetPieceWeightGm: Number(comp.targetPieceWeightGm)
        })),
        orderToken: details.orderToken
      }
    };
  }

  /**
   * Fetches all locked records currently idling on the system workflow awaiting evaluation signatures.
   */
  static async getPendingManagementApprovals() {
    const pendingList = await prisma.techPack.findMany({
      where: {
        isLocked: true,
        orderToken: {
          // ✅ Fixes ts(2353): Matches your schema column and safely asserts type
          status: 'AUTHORIZED' as any 
        }
      },
      include: {
        components: true, // 🔄 Type inference restored here
        orderToken: true  // 🔄 Type inference restored here
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return {
      success: true,
      data: pendingList.map((pack) => ({
        id: pack.id,
        orderTokenId: pack.orderTokenId,
        designName: pack.designName,
        version: pack.version,
        isLocked: pack.isLocked,
        updatedAt: pack.updatedAt,
        componentsCount: pack.components.length, // ✅ Fixed ts(2339)
        orderToken: pack.orderToken               // ✅ Fixed ts(2551)
      }))
    };
  }
}