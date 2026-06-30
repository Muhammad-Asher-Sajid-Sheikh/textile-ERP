-- AlterTable
ALTER TABLE "TechPack" ADD COLUMN     "designName" TEXT NOT NULL DEFAULT 'Provisional Template',
ADD COLUMN     "dyeingSpecId" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seasonCode" TEXT,
ADD COLUMN     "totalTargetQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weavingSpecId" TEXT,
ALTER COLUMN "orderTokenId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeavingSpecification" (
    "id" TEXT NOT NULL,
    "loomType" TEXT NOT NULL,
    "warpYarnCount" TEXT NOT NULL,
    "weftYarnCount" TEXT NOT NULL,
    "pileYarnCount" TEXT,
    "picksPerInch" INTEGER NOT NULL,
    "endsPerInch" INTEGER NOT NULL,
    "terryRatio" DECIMAL(6,2),
    "technicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeavingSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingSpecification" (
    "id" TEXT NOT NULL,
    "dyeType" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "pantoneCode" TEXT NOT NULL,
    "chemicalRestraints" TEXT,
    "targetShrinkagePct" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DyeingSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintingSpecification" (
    "id" TEXT NOT NULL,
    "printMethod" TEXT NOT NULL,
    "placementArea" TEXT NOT NULL,
    "colorCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintingSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechPackComponent" (
    "id" TEXT NOT NULL,
    "techPackId" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "cutLengthInches" DECIMAL(8,2) NOT NULL,
    "cutWidthInches" DECIMAL(8,2) NOT NULL,
    "finishedLengthCms" DECIMAL(8,2) NOT NULL,
    "finishedWidthCms" DECIMAL(8,2) NOT NULL,
    "targetGsm" INTEGER NOT NULL,
    "targetPieceWeightGm" DECIMAL(8,2) NOT NULL,
    "stitchingType" TEXT NOT NULL,
    "borderStructure" TEXT,
    "cartonPackingRatio" INTEGER NOT NULL DEFAULT 12,
    "printingSpecId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechPackComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLogs_table_idx" ON "AuditLogs"("table");

-- CreateIndex
CREATE INDEX "AuditLogs_recordId_idx" ON "AuditLogs"("recordId");

-- CreateIndex
CREATE INDEX "TechPackComponent_techPackId_idx" ON "TechPackComponent"("techPackId");

-- CreateIndex
CREATE INDEX "TechPack_weavingSpecId_idx" ON "TechPack"("weavingSpecId");

-- CreateIndex
CREATE INDEX "TechPack_dyeingSpecId_idx" ON "TechPack"("dyeingSpecId");

-- AddForeignKey
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_weavingSpecId_fkey" FOREIGN KEY ("weavingSpecId") REFERENCES "WeavingSpecification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_dyeingSpecId_fkey" FOREIGN KEY ("dyeingSpecId") REFERENCES "DyeingSpecification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechPackComponent" ADD CONSTRAINT "TechPackComponent_techPackId_fkey" FOREIGN KEY ("techPackId") REFERENCES "TechPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechPackComponent" ADD CONSTRAINT "TechPackComponent_printingSpecId_fkey" FOREIGN KEY ("printingSpecId") REFERENCES "PrintingSpecification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
