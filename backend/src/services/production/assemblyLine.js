/**
 * Assembly Line Service
 */

import prisma from '../../lib/prisma.js';
import { ProductionValidator } from './validator.js';
import { StateMachine } from './stateMachine.js';

export class AssemblyLineService {
  static async createJobCard(request) {
    const order = await prisma.orderToken.findUnique({
      where: { id: request.orderTokenId },
    });

    if (!order) {
      throw new Error(`Order ${request.orderTokenId} not found`);
    }

    const phaseValidation = await StateMachine.validatePhasePrerequisites('ASSEMBLY', order.status);
    if (!phaseValidation.valid) {
      throw new Error(phaseValidation.reason);
    }

    const jobCard = await prisma.assemblyJobCard.create({
      data: {
        orderTokenId: request.orderTokenId,
        workerId: request.workerId,
        workerName: request.workerName,
        basePieceRate: request.basePieceRate,
        totalPiecesCompleted: 0,
        calculatedWage: 0,
      },
    });

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

  static async logAssemblyPhase(request) {
    const jobCard = await prisma.assemblyJobCard.findUnique({
      where: { id: request.jobCardId },
      include: { assemblyLogs: true },
    });

    if (!jobCard) {
      throw new Error(`Job card ${request.jobCardId} not found`);
    }

    const phasePrerequisites = {
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

  static async completeAssemblyPhase(request) {
    const jobCard = await prisma.assemblyJobCard.findUnique({
      where: { id: request.jobCardId },
      include: { assemblyLogs: true },
    });

    if (!jobCard) {
      throw new Error(`Job card ${request.jobCardId} not found`);
    }

    const phaseLog = await prisma.assemblyPhaseLog.findFirst({
      where: {
        jobCardId: request.jobCardId,
        phase: request.phase,
      },
    });

    if (!phaseLog) {
      throw new Error(`Phase log not found for phase ${request.phase}`);
    }

    const completedPhaseLog = await prisma.assemblyPhaseLog.update({
      where: { id: phaseLog.id },
      data: {
        status: 'COMPLETED',
        completedAt: request.completedAt,
      },
    });

    const allPhaseLogs = await prisma.assemblyPhaseLog.findMany({
      where: { jobCardId: request.jobCardId },
    });

    const totalPiecesCompleted = allPhaseLogs.reduce((sum, log) => sum + log.piecesProcessed, 0);

    const calculatedWage = ProductionValidator.calculatePieceRateWage(
      totalPiecesCompleted,
      Number(jobCard.basePieceRate)
    );

    const updatedJobCard = await prisma.assemblyJobCard.update({
      where: { id: request.jobCardId },
      data: {
        totalPiecesCompleted,
        calculatedWage: calculatedWage,
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

  static async getJobCard(jobCardId) {
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

  static async getOrderJobCards(orderTokenId) {
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

  static async getOrderPhaseStatus(orderTokenId) {
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
