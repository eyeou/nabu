export const DEFAULT_PERFORMANCE_LEVEL = 3;

export const STUDENT_PERFORMANCE_LEVELS = [
  {
    value: 1,
    label: 'En difficulté',
    description: 'Priorité absolue, besoins immédiats.',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    accent: 'bg-red-500',
    text: 'text-red-600'
  },
  {
    value: 2,
    label: 'À surveiller',
    description: 'Progression fragile, accompagnement conseillé.',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    accent: 'bg-orange-400',
    text: 'text-orange-600'
  },
  {
    value: 3,
    label: 'À jour',
    description: 'Compétences conformes aux attentes.',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    accent: 'bg-yellow-400',
    text: 'text-yellow-600'
  },
  {
    value: 4,
    label: 'Très bon niveau',
    description: 'Autonomie solide, peut approfondir.',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    accent: 'bg-green-400',
    text: 'text-green-600'
  },
  {
    value: 5,
    label: 'Excellent',
    description: 'Excellences régulières, peut mentoriser.',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    accent: 'bg-emerald-500',
    text: 'text-emerald-600'
  }
] as const;

export type StudentPerformanceLevel = (typeof STUDENT_PERFORMANCE_LEVELS)[number]['value'];

export const PERFORMANCE_LEVEL_PERCENT_THRESHOLDS: Array<{
  minPercent: number;
  value: StudentPerformanceLevel;
}> = [
  { minPercent: 0.9, value: 5 },
  { minPercent: 0.75, value: 4 },
  { minPercent: 0.55, value: 3 },
  { minPercent: 0.4, value: 2 },
  { minPercent: 0, value: 1 }
];

export function normalizePerformanceLevel(value: unknown): StudentPerformanceLevel | undefined {
  if (value === null || typeof value === 'undefined' || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;

  if (typeof parsed !== 'number' || !Number.isInteger(parsed)) {
    throw new Error('INVALID_PERFORMANCE_LEVEL');
  }

  if (parsed < 1 || parsed > 5) {
    throw new Error('INVALID_PERFORMANCE_LEVEL');
  }

  return parsed as StudentPerformanceLevel;
}

export function performanceLevelFromPercent(percent?: number | null): StudentPerformanceLevel {
  if (typeof percent !== 'number' || Number.isNaN(percent)) {
    return DEFAULT_PERFORMANCE_LEVEL;
  }

  const bounded = Math.max(0, Math.min(1, percent));

  const match = PERFORMANCE_LEVEL_PERCENT_THRESHOLDS.find(
    threshold => bounded >= threshold.minPercent
  );

  return match?.value ?? DEFAULT_PERFORMANCE_LEVEL;
}

export function scoreToPercent(
  score?: number | null,
  maxScore?: number | null
): number | undefined {
  if (
    typeof score !== 'number' ||
    typeof maxScore !== 'number' ||
    Number.isNaN(score) ||
    Number.isNaN(maxScore) ||
    maxScore <= 0
  ) {
    return undefined;
  }

  return Math.max(0, Math.min(1, score / maxScore));
}

