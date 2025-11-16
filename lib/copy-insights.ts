export interface CopyInsightQuestion {
  number?: number;
  questionText?: string;
  studentAnswer?: string;
  teacherComment?: string;
  improvementAdvice?: string;
  recommendedProgramFocus?: string;
  feedback?: string;
  skillTags?: string[];
  correctAnswer?: string;
  pointsPossible?: number;
  pointsAwarded?: number;
}

export interface CopyInsightsPayload {
  gradeText?: string;
  adviceSummary?: string[];
  programRecommendations?: string[];
  questions?: CopyInsightQuestion[];
}

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
};

const ensureQuestionArray = (value: unknown): CopyInsightQuestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(question => (typeof question === 'object' && question ? (question as CopyInsightQuestion) : null))
    .filter((question): question is CopyInsightQuestion => Boolean(question));
};

export interface ParsedCopyInsights {
  gradeText?: string;
  adviceSummary: string[];
  programRecommendations: string[];
  questions: CopyInsightQuestion[];
}

export const parseCopyInsights = (raw: unknown): ParsedCopyInsights => {
  if (!raw) {
    return {
      gradeText: undefined,
      adviceSummary: [],
      programRecommendations: [],
      questions: []
    };
  }

  if (Array.isArray(raw)) {
    return {
      gradeText: undefined,
      adviceSummary: [],
      programRecommendations: [],
      questions: ensureQuestionArray(raw)
    };
  }

  if (typeof raw === 'object') {
    const payload = raw as CopyInsightsPayload;
    return {
      gradeText: typeof payload.gradeText === 'string' ? payload.gradeText : undefined,
      adviceSummary: ensureStringArray(payload.adviceSummary),
      programRecommendations: ensureStringArray(payload.programRecommendations),
      questions: ensureQuestionArray(payload.questions ?? [])
    };
  }

  return {
    gradeText: undefined,
    adviceSummary: [],
    programRecommendations: [],
    questions: []
  };
};

