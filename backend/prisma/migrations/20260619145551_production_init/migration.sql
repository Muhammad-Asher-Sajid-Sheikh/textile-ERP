-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('AUTHORIZED', 'MATERIAL_ALLOCATED', 'YARN_WEAVING_INPROGRESS', 'WET_PROCESSING_INPROGRESS', 'SURFACE_DECORATION_INPROGRESS', 'ASSEMBLY_INPROGRESS', 'QC_VERIFICATION_INPROGRESS', 'PS_SAMPLE_PENDING', 'PS_APPROVED', 'EXPORT_READY', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'RELEASED', 'DISPATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "YarnTwistingStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'INPROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WeavingStatus" AS ENUM ('PENDING', 'INPROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WetProcessingStatus" AS ENUM ('PENDING', 'INPROGRESS', 'PASSED', 'FAILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('COLOR_FASTNESS', 'SHRINKING', 'GASOLINE_SMELL');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASSED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "DecorationType" AS ENUM ('PRINTING', 'EMBROIDERY', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "DecorLogStatus" AS ENUM ('PENDING', 'INPROGRESS', 'RETURNED', 'DISCREPANCY_FLAGGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssemblyPhase" AS ENUM ('PHASE1_CUTTING', 'PHASE2_STITCHING', 'PHASE3_INITIAL_CHECK', 'PHASE4_FOLDING', 'PHASE5_FINAL_CHECK', 'PHASE6_PACKING');

-- CreateEnum
CREATE TYPE "AssemblyPhaseStatus" AS ENUM ('PENDING', 'INPROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('STRUCTURAL', 'AESTHETIC', 'ASEPTIC');

-- CreateEnum
CREATE TYPE "PsSampleStatus" AS ENUM ('PENDING', 'SENT_TO_CUSTOMER', 'APPROVED', 'REJECTED', 'REWORK_INITIATED');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('PIECE_COUNT_MISMATCH', 'WEIGHT_VARIANCE', 'DIMENSION_MISMATCH', 'QUALITY_DEFECT');

-- CreateTable
CREATE TABLE "OrderToken" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'AUTHORIZED',
    "isInstructionsLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPsApproved" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechPack" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "yarnType" TEXT NOT NULL,
    "fabricType" TEXT NOT NULL,
    "gsm" DECIMAL(10,2) NOT NULL,
    "totalYardage" DECIMAL(12,2) NOT NULL,
    "requiredYarnWeight" DECIMAL(12,2) NOT NULL,
    "requiresYarnTwisting" BOOLEAN NOT NULL DEFAULT false,
    "isPrintingRequired" BOOLEAN NOT NULL DEFAULT false,
    "isEmbroideryRequired" BOOLEAN NOT NULL DEFAULT false,
    "preApprovedSampleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseMaterialInventory" (
    "id" TEXT NOT NULL,
    "masterSampleCode" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "physicalVolume" DECIMAL(12,2) NOT NULL,
    "volumeUnit" TEXT NOT NULL,
    "preApprovedVolume" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseMaterialInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRequisition" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedMaterialId" TEXT,
    "requestedVolume" DECIMAL(12,2) NOT NULL,
    "volumeUnit" TEXT NOT NULL,
    "approvalSignature" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "dispatchedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialDispatchLog" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "dispatchedVolume" DECIMAL(12,2) NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomOutputLog" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "yarnTwistingStatus" "YarnTwistingStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "twistingLogDetails" TEXT,
    "twistingCompletedAt" TIMESTAMP(3),
    "weavingStatus" "WeavingStatus" NOT NULL DEFAULT 'PENDING',
    "vendorId" TEXT NOT NULL,
    "dispatchedToVendor" TIMESTAMP(3) NOT NULL,
    "rollPieceCount" INTEGER NOT NULL,
    "totalMassWeight" DECIMAL(12,2) NOT NULL,
    "fabricDensityGsm" DECIMAL(10,2) NOT NULL,
    "totalLength" DECIMAL(12,2) NOT NULL,
    "poYieldTargetWeight" DECIMAL(12,2) NOT NULL,
    "actualWasteWeight" DECIMAL(12,2),
    "wasteVarianceLogged" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "returnedStatus" "WeavingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomOutputLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WetProcessingLog" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "WetProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchTrackId" TEXT NOT NULL,
    "dispatchedToMill" TIMESTAMP(3) NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputTotalWeight" DECIMAL(12,2) NOT NULL,
    "outputTotalWeight" DECIMAL(12,2),
    "weightLossPercentage" DECIMAL(10,2),
    "isWithinTolerance" BOOLEAN,
    "returnedAt" TIMESTAMP(3),
    "returnedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WetProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityTestLog" (
    "id" TEXT NOT NULL,
    "wetProcessingLogId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "result" "TestResult" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "testedBy" TEXT,
    "testedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityTestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecorPrintingLog" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "DecorLogStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchedToVendor" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rollsSent" INTEGER NOT NULL,
    "rollsReturned" INTEGER,
    "returnedAt" TIMESTAMP(3),
    "specAuditCompleted" BOOLEAN NOT NULL DEFAULT false,
    "specAuditNotes" TEXT,
    "specAuditBy" TEXT,
    "specAuditAt" TIMESTAMP(3),
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecorPrintingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbroideryPieceLog" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "DecorLogStatus" NOT NULL DEFAULT 'PENDING',
    "totalPiecesCut" INTEGER NOT NULL,
    "piecesPreStitched" INTEGER,
    "preStitchBy" TEXT,
    "preStitchAt" TIMESTAMP(3),
    "dispatchedToVendor" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "piecesSent" INTEGER NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "piecesReturned" INTEGER,
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbroideryPieceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyJobCard" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "basePieceRate" DECIMAL(10,2) NOT NULL,
    "totalPiecesCompleted" INTEGER NOT NULL DEFAULT 0,
    "calculatedWage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssemblyJobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyPhaseLog" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "phase" "AssemblyPhase" NOT NULL,
    "status" "AssemblyPhaseStatus" NOT NULL DEFAULT 'PENDING',
    "piecesProcessed" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyPhaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcInspection" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "overallStatus" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "structuralAudit" JSONB,
    "aestheticAudit" JSONB,
    "asepticAudit" JSONB,
    "inspectionNotes" TEXT,
    "inspectedBy" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreShippingSample" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "status" "PsSampleStatus" NOT NULL DEFAULT 'PENDING',
    "totalCargoUnits" INTEGER NOT NULL,
    "sampleSize" DECIMAL(10,2) NOT NULL,
    "sampleUnits" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "customerApproval" BOOLEAN,
    "customerApprovedAt" TIMESTAMP(3),
    "customerApprovedBy" TEXT,
    "reworkInitiatedAt" TIMESTAMP(3),
    "reworkOrders" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreShippingSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscrepancyAlert" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "discrepancyType" "DiscrepancyType" NOT NULL,
    "description" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(12,2),
    "actualQuantity" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flaggedBy" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscrepancyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimDispute" (
    "id" TEXT NOT NULL,
    "orderTokenId" TEXT NOT NULL,
    "wetProcessingLogId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "weightLossPercentage" DECIMAL(10,2) NOT NULL,
    "expectedTolerance" TEXT NOT NULL,
    "claimAmount" DECIMAL(12,2),
    "claimStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderToken_orderNumber_key" ON "OrderToken"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderToken_orderNumber_idx" ON "OrderToken"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderToken_status_idx" ON "OrderToken"("status");

-- CreateIndex
CREATE INDEX "OrderToken_createdAt_idx" ON "OrderToken"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TechPack_orderTokenId_key" ON "TechPack"("orderTokenId");

-- CreateIndex
CREATE INDEX "TechPack_orderTokenId_idx" ON "TechPack"("orderTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseMaterialInventory_masterSampleCode_key" ON "WarehouseMaterialInventory"("masterSampleCode");

-- CreateIndex
CREATE INDEX "WarehouseMaterialInventory_masterSampleCode_idx" ON "WarehouseMaterialInventory"("masterSampleCode");

-- CreateIndex
CREATE INDEX "WarehouseMaterialInventory_materialType_idx" ON "WarehouseMaterialInventory"("materialType");

-- CreateIndex
CREATE INDEX "ProductionRequisition_orderTokenId_idx" ON "ProductionRequisition"("orderTokenId");

-- CreateIndex
CREATE INDEX "ProductionRequisition_status_idx" ON "ProductionRequisition"("status");

-- CreateIndex
CREATE INDEX "ProductionRequisition_createdAt_idx" ON "ProductionRequisition"("createdAt");

-- CreateIndex
CREATE INDEX "MaterialDispatchLog_requisitionId_idx" ON "MaterialDispatchLog"("requisitionId");

-- CreateIndex
CREATE INDEX "LoomOutputLog_orderTokenId_idx" ON "LoomOutputLog"("orderTokenId");

-- CreateIndex
CREATE INDEX "LoomOutputLog_weavingStatus_idx" ON "LoomOutputLog"("weavingStatus");

-- CreateIndex
CREATE INDEX "LoomOutputLog_createdAt_idx" ON "LoomOutputLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WetProcessingLog_dispatchTrackId_key" ON "WetProcessingLog"("dispatchTrackId");

-- CreateIndex
CREATE INDEX "WetProcessingLog_orderTokenId_idx" ON "WetProcessingLog"("orderTokenId");

-- CreateIndex
CREATE INDEX "WetProcessingLog_status_idx" ON "WetProcessingLog"("status");

-- CreateIndex
CREATE INDEX "WetProcessingLog_dispatchTrackId_idx" ON "WetProcessingLog"("dispatchTrackId");

-- CreateIndex
CREATE INDEX "WetProcessingLog_createdAt_idx" ON "WetProcessingLog"("createdAt");

-- CreateIndex
CREATE INDEX "QualityTestLog_wetProcessingLogId_idx" ON "QualityTestLog"("wetProcessingLogId");

-- CreateIndex
CREATE INDEX "QualityTestLog_testType_idx" ON "QualityTestLog"("testType");

-- CreateIndex
CREATE INDEX "QualityTestLog_result_idx" ON "QualityTestLog"("result");

-- CreateIndex
CREATE INDEX "DecorPrintingLog_orderTokenId_idx" ON "DecorPrintingLog"("orderTokenId");

-- CreateIndex
CREATE INDEX "DecorPrintingLog_status_idx" ON "DecorPrintingLog"("status");

-- CreateIndex
CREATE INDEX "DecorPrintingLog_createdAt_idx" ON "DecorPrintingLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmbroideryPieceLog_orderTokenId_idx" ON "EmbroideryPieceLog"("orderTokenId");

-- CreateIndex
CREATE INDEX "EmbroideryPieceLog_status_idx" ON "EmbroideryPieceLog"("status");

-- CreateIndex
CREATE INDEX "EmbroideryPieceLog_createdAt_idx" ON "EmbroideryPieceLog"("createdAt");

-- CreateIndex
CREATE INDEX "AssemblyJobCard_orderTokenId_idx" ON "AssemblyJobCard"("orderTokenId");

-- CreateIndex
CREATE INDEX "AssemblyJobCard_workerId_idx" ON "AssemblyJobCard"("workerId");

-- CreateIndex
CREATE INDEX "AssemblyJobCard_createdAt_idx" ON "AssemblyJobCard"("createdAt");

-- CreateIndex
CREATE INDEX "AssemblyPhaseLog_jobCardId_idx" ON "AssemblyPhaseLog"("jobCardId");

-- CreateIndex
CREATE INDEX "AssemblyPhaseLog_phase_idx" ON "AssemblyPhaseLog"("phase");

-- CreateIndex
CREATE INDEX "AssemblyPhaseLog_status_idx" ON "AssemblyPhaseLog"("status");

-- CreateIndex
CREATE INDEX "QcInspection_orderTokenId_idx" ON "QcInspection"("orderTokenId");

-- CreateIndex
CREATE INDEX "QcInspection_status_idx" ON "QcInspection"("status");

-- CreateIndex
CREATE INDEX "QcInspection_createdAt_idx" ON "QcInspection"("createdAt");

-- CreateIndex
CREATE INDEX "PreShippingSample_orderTokenId_idx" ON "PreShippingSample"("orderTokenId");

-- CreateIndex
CREATE INDEX "PreShippingSample_status_idx" ON "PreShippingSample"("status");

-- CreateIndex
CREATE INDEX "PreShippingSample_createdAt_idx" ON "PreShippingSample"("createdAt");

-- CreateIndex
CREATE INDEX "DiscrepancyAlert_orderTokenId_idx" ON "DiscrepancyAlert"("orderTokenId");

-- CreateIndex
CREATE INDEX "DiscrepancyAlert_discrepancyType_idx" ON "DiscrepancyAlert"("discrepancyType");

-- CreateIndex
CREATE INDEX "DiscrepancyAlert_severity_idx" ON "DiscrepancyAlert"("severity");

-- CreateIndex
CREATE INDEX "ClaimDispute_orderTokenId_idx" ON "ClaimDispute"("orderTokenId");

-- CreateIndex
CREATE INDEX "ClaimDispute_claimStatus_idx" ON "ClaimDispute"("claimStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimDispute_wetProcessingLogId_key" ON "ClaimDispute"("wetProcessingLogId");

-- AddForeignKey
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRequisition" ADD CONSTRAINT "ProductionRequisition_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialDispatchLog" ADD CONSTRAINT "MaterialDispatchLog_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "ProductionRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomOutputLog" ADD CONSTRAINT "LoomOutputLog_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WetProcessingLog" ADD CONSTRAINT "WetProcessingLog_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityTestLog" ADD CONSTRAINT "QualityTestLog_wetProcessingLogId_fkey" FOREIGN KEY ("wetProcessingLogId") REFERENCES "WetProcessingLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorPrintingLog" ADD CONSTRAINT "DecorPrintingLog_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbroideryPieceLog" ADD CONSTRAINT "EmbroideryPieceLog_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyJobCard" ADD CONSTRAINT "AssemblyJobCard_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyPhaseLog" ADD CONSTRAINT "AssemblyPhaseLog_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "AssemblyJobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcInspection" ADD CONSTRAINT "QcInspection_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreShippingSample" ADD CONSTRAINT "PreShippingSample_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepancyAlert" ADD CONSTRAINT "DiscrepancyAlert_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimDispute" ADD CONSTRAINT "ClaimDispute_orderTokenId_fkey" FOREIGN KEY ("orderTokenId") REFERENCES "OrderToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimDispute" ADD CONSTRAINT "ClaimDispute_wetProcessingLogId_fkey" FOREIGN KEY ("wetProcessingLogId") REFERENCES "WetProcessingLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
