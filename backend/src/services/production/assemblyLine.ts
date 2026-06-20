/**
 * Assembly Line Service
 * Handles 5th gate: In-House Assembly Line (Piece-Rate Tracked Operations)
 * - Tracks 6 distinct assembly phases: CUTTING, STITCHING, INITIAL_CHECK, FOLDING, FINAL_CHECK, PACKING
 * - Creates digital Job Cards for workers with piece-rate wage calculation
 * - Wage = Pieces Completed × Base Piece Rate
 * - Enforces strict phase prerequisites
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';
import { Decimal } from '@prisma/client/runtime/client.js';

export interface CreateJobCardRequest {
  orderTokenId: string;
  workerId: string;
  workerName: string;
  basePieceRate: number;
}

export interface LogAssemblyPhaseRequest {
  jobCardId: string;
  phase:
    | 'PHASE1_CUTTING'
    | 'PHASE2_STITCHING'
    | 'PHASE3_INITIAL_CHECK'
    | 'PHASE4_FOLDING'
    | 'PHASE5_FINAL_CHECK'
    | 'PHASE6_PACKING';
  piecesProcessed: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface CompleteAssemblyPhaseRequest {
  jobCardId: string;
  phase:
    | 'PHASE1_CUTTING'
    | 'PHASE2_STITCHING'
    | 'PHASE3_INITIAL_CHECK'
    | 'PHASE4_FOLDING'
    | 'PHASE5_FINAL_CHECK'
    | 'PHASE6_PACKING';
  completedAt: Date;
}

export class AssemblyLineService {
  /**
   * Creates a job card for a worker on an order
   */
  static async createJobCard(request: CreateJobCardRequest) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    // Validate phase prerequisites
    const phaseValidation = await StateMachine.validatePhasePrerequisites('ASSEMBLY', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    // Create job card
    const jobCard = await prisma.assemblyJobCard.create({
      data: {
        orderTokenId: request.orderTokenId,
        workerId: request.workerId,
        workerName: request.workerName,
        basePieceRate: new Decimal(request.basePieceRate),
        totalPiecesCompleted: 0,
        calculatedWage: new Decimal(0),
      },
    });

    // Update order status on first job card creation
    if (order.status !== 'ASSEMBLY_INPROGRESS') {
      await prisma.orderToken.update({
        where: { id: request.orderTokenId },
        data: {
          status: 'ASSEMBLY_INPROGRESS',
        },
      });
    }

    return {
      success: true,
      data: {
        jobCardId: jobCard.id,
        orderTokenId: jobCard.orderTokenId,
        workerId: jobCard.workerId,
        workerName: jobCard.workerName,
        basePieceRate: Number(jobCard.basePieceRate),
        message: 'Job card created successfully',
      },
    };
  }

  /**
   * Logs assembly phase work
   */
  static async logAssemblyPhase(request: LogAssemblyPhaseRequest) {
    const jobCard = await prisma.assemblyJobCard.findUnique({
      where: { id: request.jobCardId },
      include: { assemblyLogs: true },
    });

    if (!jobCard) {
      throw new Error(`Job card ${request.jobCardId} not found`);
    }

    // Validate phase prerequisites
    const phasePrerequisites: Record<string, string[]> = {
      PHASE1_CUTTING: [],
      PHASE2_STITCHING: ['PHASE1_CUTTING'],
      PHASE3_INITIAL_CHECK: ['PHASE2_STITCHING'],
      PHASE4_FOLDING: ['PHASE3_INITIAL_CHECK'],
      PHASE5_FINAL_CHECK: ['PHASE4_FOLDING'],
      PHASE6_PACKING: ['PHASE5_FINAL_CHECK'],
    };

    const required = phasePrerequisites[request.phase] || [];
    const completedPhases = jobCard.assemblyLogs
      .filter((log) => log.status === 'COMPLETED')
      .map((log) => log.phase);

    const allPrerequisitesMet = required.every((prereq) => completedPhases.includes(prereq));

    if (!allPrerequisitesMet) {
      const missing = required.filter((prereq) => !completedPhases.includes(prereq));
      throw new Error(
        `Phase ${request.phase} cannot proceed. Missing prerequisites: ${missing.join(', ')}`
      );
    }

    // Check if phase log already exists
    const existingPhaseLog = await prisma.assemblyPhaseLog.findFirst({
      where: {
        jobCardId: request.jobCardId,
        phase: request.phase,
      },
    });

    let phaseLog;
    if (existingPhaseLog) {
      phaseLog = await prisma.assemblyPhaseLog.update({
        where: { id: existingPhaseLog.id },
        data: {
          status: 'INPROGRESS',
          piecesProcessed: request.piecesProcessed,
          startedAt: request.startedAt,
        },
      });
    } else {
      phaseLog = await prisma.assemblyPhaseLog.create({
        data: {
          jobCardId: request.jobCardId,
          phase: request.phase,
          status: 'INPROGRESS',
          piecesProcessed: request.piecesProcessed,
          startedAt: request.startedAt,
        },
      });
    }

    return {
      success: true,
      data: {
        phaseLogId: phaseLog.id,
        jobCardId: request.jobCardId,
        phase: phaseLog.phase,
        status: phaseLog.status,
        piecesProcessed: phaseLog.piecesProcessed,
        startedAt: phaseLog.startedAt,
        message: `Phase ${request.phase} logging initiated`,
      },
    };
  }

  /**
   * Completes assembly phase and updates piece-rate wage
   */
  static async completeAssemblyPhase(request: CompleteAssemblyPhaseRequest) {
    const jobCard = await prisma.assemblyJobCard.findUnique({
      where: { id: request.jobCardId },
      include: { assemblyLogs: true },
    });

    if (!jobCard) {
      throw new Error(`Job card ${request.jobCardId} not found`);
    }

    // Find the phase log
    const phaseLog = await prisma.assemblyPhaseLog.findFirst({
      where: {
        jobCardId: request.jobCardId,
        phase: request.phase,
      },
    });

    if (!phaseLog) {
      throw new Error(`Phase log not found for phase ${request.phase}`);
    }

    // Complete phase log
    const completedPhaseLog = await prisma.assemblyPhaseLog.update({
      where: { id: phaseLog.id },
      data: {
        status: 'COMPLETED',
        completedAt: request.completedAt,
      },
    });

    // Recalculate total pieces and wage
    const allPhaseLogs = await prisma.assemblyPhaseLog.findMany({
      where: { jobCardId: request.jobCardId },
    });

    const totalPiecesCompleted = allPhaseLogs.reduce((sum, log) => sum + log.piecesProcessed, 0);

    // Calculate piece-rate wage
    const calculatedWage = ProductionValidator.calculatePieceRateWage(
      totalPiecesCompleted,
      Number(jobCard.basePieceRate)
    );

    // Update job card
    const updatedJobCard = await prisma.assemblyJobCard.update({
      where: { id: request.jobCardId },
      data: {
        totalPiecesCompleted,
        calculatedWage: new Decimal(calculatedWage),
      },
    });

    return {
      success: true,
      data: {
        phaseLogId: completedPhaseLog.id,
        jobCardId: updatedJobCard.id,
        phase: completedPhaseLog.phase,
        status: completedPhaseLog.status,
        completedAt: completedPhaseLog.completedAt,
        jobCardUpdate: {
          totalPiecesCompleted: updatedJobCard.totalPiecesCompleted,
          basePieceRate: Number(updatedJobCard.basePieceRate),
          calculatedWage: Number(updatedJobCard.calculatedWage),
        },
        message: `Phase ${request.phase} completed. Wage updated.`,
      },
    };
  }

  /**
   * Retrieves complete job card with all phase logs and wage details
   */
  static async getJobCard(jobCardId: string) {
    const jobCard = await prisma.assemblyJobCard.findUnique({
      where: { id: jobCardId },
      include: { assemblyLogs: true },
    });

    if (!jobCard) {
      return {
        success: false,
        error: 'JOB_CARD_NOT_FOUND',
        message: `Job card ${jobCardId} not found`,
      };
    }

    return {
      success: true,
      data: {
        jobCardId: jobCard.id,
        orderTokenId: jobCard.orderTokenId,
        workerId: jobCard.workerId,
        workerName: jobCard.workerName,
        basePieceRate: Number(jobCard.basePieceRate),
        totalPiecesCompleted: jobCard.totalPiecesCompleted,
        calculatedWage: Number(jobCard.calculatedWage),
        createdAt: jobCard.createdAt,
        updatedAt: jobCard.updatedAt,
        phaseLogs: jobCard.assemblyLogs.map((log) => ({
          phaseLogId: log.id,
          phase: log.phase,
          status: log.status,
          piecesProcessed: log.piecesProcessed,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
        })),
      },
    };
  }

  /**
   * Retrieves all job cards for an order
   */
  static async getOrderJobCards(orderTokenId: string) {
    const jobCards = await prisma.assemblyJobCard.findMany({
      where: { orderTokenId },
      include: { assemblyLogs: true },
    });

    return {
      success: true,
      data: {
        orderTokenId,
        jobCardCount: jobCards.length,
        jobCards: jobCards.map((card) => ({
          jobCardId: card.id,
          workerId: card.workerId,
          workerName: card.workerName,
          basePieceRate: Number(card.basePieceRate),
          totalPiecesCompleted: card.totalPiecesCompleted,
          calculatedWage: Number(card.calculatedWage),
          phaseCount: card.assemblyLogs.length,
          completedPhases: card.assemblyLogs.filter((log) => log.status === 'COMPLETED').length,
        })),
        totalWagePayable: jobCards.reduce((sum, card) => sum + Number(card.calculatedWage), 0),
      },
    };
  }

  /**
   * Retrieves phase execution status across all job cards for an order
   */
  static async getOrderPhaseStatus(orderTokenId: string) {
    const jobCards = await prisma.assemblyJobCard.findMany({
      where: { orderTokenId },
      include: { assemblyLogs: true },
    });

    const phases = [
      'PHASE1_CUTTING',
      'PHASE2_STITCHING',
      'PHASE3_INITIAL_CHECK',
      'PHASE4_FOLDING',
      'PHASE5_FINAL_CHECK',
      'PHASE6_PACKING',
    ];

    const phaseStatus = phases.map((phase) => {
      const logsForPhase = jobCards.flatMap((card) =>
        card.assemblyLogs.filter((log) => log.phase === phase)
      );

      const completed = logsForPhase.filter((log) => log.status === 'COMPLETED').length;
      const inProgress = logsForPhase.filter((log) => log.status === 'INPROGRESS').length;
      const pending = logsForPhase.filter((log) => log.status === 'PENDING').length;

      return {
        phase,
        totalLogs: logsForPhase.length,
        completed,
        inProgress,
        pending,
        totalPiecesProcessed: logsForPhase.reduce((sum, log) => sum + log.piecesProcessed, 0),
      };
    });

    return {
      success: true,
      data: {
        orderTokenId,
        jobCardCount: jobCards.length,
        phaseStatus,
      },
    };
  }
}
