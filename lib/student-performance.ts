import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_PERFORMANCE_LEVEL,
  performanceLevelFromPercent,
  scoreToPercent
} from '@/lib/student-level';

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

export async function recalculateStudentPerformanceLevel(
  studentId: string,
  db: PrismaClientOrTransaction = prisma
) {
  const recentAssessments = await db.studentAssessment.findMany({
    where: { studentId },
    select: {
      overallScore: true,
      maxScore: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  const percents = recentAssessments
    .map(assessment => scoreToPercent(assessment.overallScore, assessment.maxScore))
    .filter((value): value is number => typeof value === 'number');

  const averagePercent =
    percents.length > 0 ? percents.reduce((sum, value) => sum + value, 0) / percents.length : null;

  const derivedLevel = performanceLevelFromPercent(averagePercent);

  await db.student.update({
    where: { id: studentId },
    data: {
      performanceLevel: derivedLevel ?? DEFAULT_PERFORMANCE_LEVEL
    }
  });

  return {
    studentId,
    level: derivedLevel ?? DEFAULT_PERFORMANCE_LEVEL,
    averagePercent: averagePercent ?? undefined
  };
}


