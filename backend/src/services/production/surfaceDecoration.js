/**
 * Surface Decoration Service
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';

export class SurfaceDecorationService {
  static async dispatchToPrinting(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    if (!order.techPack?.isPrintingRequired) {
      return {
        success: true,
        data: {
          orderTokenId: request.orderTokenId,
          status: 'NOT_REQUIRED',
          message: 'Printing not required per Tech Pack specifications',
        },
      };
    }

    const printingLog = await prisma.decorPrintingLog.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'INPROGRESS',
        vendorId: request.vendorId,
        dispatchedToVendor: new Date(),
        rollsSent: request.rollsSent,
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        decorLogId: printingLog.id,
        status: printingLog.status,
        rollsSent: printingLog.rollsSent,
        dispatchedToVendor: printingLog.dispatchedToVendor,
        vendorId: request.vendorId,
        message: 'Fabric rolls dispatched to printing vendor',
      },
    };
  }

  static async completePrinting(request) {
    const printingLog = await prisma.decorPrintingLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!printingLog) {
      throw new Error(`Printing log not found for order ${request.orderTokenId}`);
    }

    const discrepancyCheck = ProductionValidator.validatePieceCount(
      printingLog.rollsSent,
      request.rollsReturned
    );

    let hasDiscrepancy = discrepancyCheck.hasDiscrepancy;
    let discrepancyCount = discrepancyCheck.discrepancyCount;

    const updatedLog = await prisma.decorPrintingLog.update({
      where: { id: printingLog.id },
      data: {
        status: hasDiscrepancy ? 'DISCREPANCY_FLAGGED' : 'RETURNED',
        rollsReturned: request.rollsReturned,
        returnedAt: request.returnedAt,
        specAuditCompleted: true,
        specAuditNotes: request.specAuditNotes,
        specAuditBy: request.specAuditBy,
        specAuditAt: new Date(),
        hasDiscrepancy,
        discrepancyCount,
      },
    });

    if (hasDiscrepancy) {
      await prisma.discrepancyAlert.create({
        data: {
          orderTokenId: request.orderTokenId,
          discrepancyType: 'PIECE_COUNT_MISMATCH',
          description: `Printing: ${printingLog.rollsSent} rolls sent, ${request.rollsReturned} returned`,
          expectedQuantity: printingLog.rollsSent,
          actualQuantity: request.rollsReturned,
          variance: discrepancyCount,
          flaggedBy: request.specAuditBy,
          severity: 'HIGH',
        },
      });
    }

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        decorLogId: updatedLog.id,
        status: updatedLog.status,
        rollsSent: updatedLog.rollsSent,
        rollsReturned: updatedLog.rollsReturned,
        specAuditCompleted: updatedLog.specAuditCompleted,
        hasDiscrepancy: updatedLog.hasDiscrepancy,
        discrepancyCount: updatedLog.discrepancyCount,
        discrepancyMessage: discrepancyCheck.message,
        message: hasDiscrepancy
          ? `DISCREPANCY ALERT: Printing rolls mismatch detected`
          : 'Printing completed and verified',
      },
    };
  }

  static async initiateEmbroidery(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
      include: { techPack: true },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    if (!order.techPack?.isEmbroideryRequired) {
      return {
        success: true,
        data: {
          orderTokenId: request.orderTokenId,
          status: 'NOT_REQUIRED',
          message: 'Embroidery not required per Tech Pack specifications',
        },
      };
    }

    const embroideryLog = await prisma.embroideryPieceLog.create({
      data: {
        orderTokenId: request.orderTokenId,
        status: 'PENDING',
        totalPiecesCut: request.totalPiecesCut,
        piecesPreStitched: request.totalPiecesCut,
        preStitchBy: request.preStitchBy,
        preStitchAt: new Date(),
        dispatchedToVendor: new Date(),
        vendorId: '',
        piecesSent: 0,
      },
    });

    const stitchValidation = ProductionValidator.validateEmbroideryPreStitching(
      request.totalPiecesCut,
      request.totalPiecesCut
    );

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        embroideryLogId: embroideryLog.id,
        totalPiecesCut: embroideryLog.totalPiecesCut,
        piecesPreStitched: embroideryLog.piecesPreStitched,
        preStitchValidation: stitchValidation.message,
        message: 'Embroidery pieces cut and pre-stitched on ≥2 sides',
      },
    };
  }

  static async dispatchToEmbroidery(request) {
    const embroideryLog = await prisma.embroideryPieceLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!embroideryLog) {
      throw new Error(`Embroidery log not found for order ${request.orderTokenId}`);
    }

    if (request.piecesSent > embroideryLog.piecesPreStitched) {
      throw new Error(
        `Cannot send ${request.piecesSent} pieces. Only ${embroideryLog.piecesPreStitched} were pre-stitched`
      );
    }

    const updatedLog = await prisma.embroideryPieceLog.update({
      where: { id: embroideryLog.id },
      data: {
        status: 'INPROGRESS',
        vendorId: request.vendorId,
        dispatchedToVendor: new Date(),
        piecesSent: request.piecesSent,
      },
    });

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        embroideryLogId: updatedLog.id,
        status: updatedLog.status,
        piecesSent: updatedLog.piecesSent,
        dispatchedToVendor: updatedLog.dispatchedToVendor,
        vendorId: request.vendorId,
        message: 'Pre-stitched pieces dispatched to embroidery vendor',
      },
    };
  }

  static async completeEmbroidery(request) {
    const embroideryLog = await prisma.embroideryPieceLog.findFirst({
      where: { orderTokenId: request.orderTokenId },
    });

    if (!embroideryLog) {
      throw new Error(`Embroidery log not found for order ${request.orderTokenId}`);
    }

    const discrepancyCheck = ProductionValidator.validatePieceCount(
      embroideryLog.piecesSent,
      request.piecesReturned
    );

    let hasDiscrepancy = discrepancyCheck.hasDiscrepancy;
    let discrepancyCount = discrepancyCheck.discrepancyCount;

    const updatedLog = await prisma.embroideryPieceLog.update({
      where: { id: embroideryLog.id },
      data: {
        status: hasDiscrepancy ? 'DISCREPANCY_FLAGGED' : 'RETURNED',
        piecesReturned: request.piecesReturned,
        returnedAt: request.returnedAt,
        hasDiscrepancy,
        discrepancyCount,
      },
    });

    if (hasDiscrepancy) {
      await prisma.discrepancyAlert.create({
        data: {
          orderTokenId: request.orderTokenId,
          discrepancyType: 'PIECE_COUNT_MISMATCH',
          description: `Embroidery: ${embroideryLog.piecesSent} pieces sent, ${request.piecesReturned} returned`,
          expectedQuantity: embroideryLog.piecesSent,
          actualQuantity: request.piecesReturned,
          variance: discrepancyCount,
          flaggedBy: 'SYSTEM',
          severity: 'HIGH',
        },
      });
    }

    return {
      success: true,
      data: {
        orderTokenId: request.orderTokenId,
        embroideryLogId: updatedLog.id,
        status: updatedLog.status,
        piecesSent: updatedLog.piecesSent,
        piecesReturned: updatedLog.piecesReturned,
        hasDiscrepancy: updatedLog.hasDiscrepancy,
        discrepancyCount: updatedLog.discrepancyCount,
        discrepancyMessage: discrepancyCheck.message,
        message: hasDiscrepancy
          ? `DISCREPANCY ALERT: Embroidery piece count mismatch detected`
          : 'Embroidery completed and verified',
      },
    };
  }

  static async getDecorationStatus(orderTokenId) {
    const printingLog = await prisma.decorPrintingLog.findFirst({
      where: { orderTokenId },
    });

    const embroideryLog = await prisma.embroideryPieceLog.findFirst({
      where: { orderTokenId },
    });

    return {
      success: true,
      data: {
        orderTokenId,
        printing: printingLog
          ? {
              logId: printingLog.id,
              status: printingLog.status,
              rollsSent: printingLog.rollsSent,
              rollsReturned: printingLog.rollsReturned,
              hasDiscrepancy: printingLog.hasDiscrepancy,
              discrepancyCount: printingLog.discrepancyCount,
              specAuditCompleted: printingLog.specAuditCompleted,
            }
          : null,
        embroidery: embroideryLog
          ? {
              logId: embroideryLog.id,
              status: embroideryLog.status,
              totalPiecesCut: embroideryLog.totalPiecesCut,
              piecesPreStitched: embroideryLog.piecesPreStitched,
              piecesSent: embroideryLog.piecesSent,
              piecesReturned: embroideryLog.piecesReturned,
              hasDiscrepancy: embroideryLog.hasDiscrepancy,
              discrepancyCount: embroideryLog.discrepancyCount,
            }
          : null,
      },
    };
  }
}
