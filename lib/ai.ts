import { Student } from '@/types';

const BLACKBOX_API_BASE_URL = (process.env.BLACKBOX_API_BASE_URL ?? 'https://api.blackbox.ai').replace(
  /\/$/,
  ''
);
const BLACKBOX_CHAT_COMPLETIONS_URL = `${BLACKBOX_API_BASE_URL}/v1/chat/completions`;
const DEFAULT_TEXT_MODEL = process.env.BLACKBOX_TEXT_MODEL ?? 'blackboxai/openai/gpt-4';
const DEFAULT_VISION_MODEL = process.env.BLACKBOX_VISION_MODEL ?? 'blackboxai/openai/gpt-4.1';

// Shape of the JSON we expect back from the LLM
export interface StudentAnalysisOutput {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface LessonStatusForPrompt {
  lessonTitle: string;
  masteryLevel: string;
  score?: number;
  notes?: string | null;
  updatedAt?: string;
}

interface AssessmentSummaryForPrompt {
  examTitle: string;
  lessonTitle?: string;
  overallScore?: number;
  maxScore?: number;
  gradeText?: string;
  adviceSummary?: string[];
  programRecommendations?: string[];
  questions: Array<{
    questionText: string;
    studentAnswer?: string;
    teacherComment?: string;
    improvementAdvice?: string;
    recommendedProgramFocus?: string;
    feedback?: string;
    skillTags?: string[];
  }>;
}

interface TeacherCommentForPrompt {
  content: string;
  teacherName?: string;
  createdAt: string;
}

function extractTeacherCommentHighlights(
  comments?: TeacherCommentForPrompt[]
): TeacherCommentForPrompt[] {
  return (
    comments
      ?.filter(comment => comment.content?.trim())
      .map(comment => ({
        ...comment,
        content: comment.content.trim()
      }))
      .slice(0, 5) ?? []
  );
}

export interface StudentForAnalysis
  extends Omit<
    Student,
    'createdAt' | 'updatedAt' | 'lessonStatuses' | 'class' | 'studentAssessments'
  > {
  createdAt: string;
  updatedAt: string;
  className?: string;
  lessonStatuses: LessonStatusForPrompt[];
  assessments?: AssessmentSummaryForPrompt[];
  teacherComments?: TeacherCommentForPrompt[];
}

export interface ExamQuestionAnalysis {
  number: number;
  questionText: string;
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

export interface ExamAnalysisResult {
  examTitle: string;
  subject?: string;
  detectedStudentName?: string;
  rawText?: string;
  overallScore?: number;
  maxScore?: number;
  gradeText?: string;
  adviceSummary?: string[];
  programRecommendations?: string[];
  questions: ExamQuestionAnalysis[];
}

type TextContentPart = { type: 'text'; text: string };
type ImageContentPart = { type: 'image_url'; image_url: { url: string } };
type MessageContent = string | Array<TextContentPart | ImageContentPart>;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: MessageContent;
    };
  }>;
}

interface ChatCompletionBody {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: MessageContent;
  }>;
  temperature?: number;
}

interface ExtendedError extends Error {
  details?: string;
}

function extractMessageText(content?: MessageContent): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .map(part => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

function extractLikelyJson(raw?: string): string {
  if (!raw) {
    return '';
  }
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return trimmed;
  }
  return trimmed.slice(firstBrace, lastBrace + 1).trim();
}

async function callBlackboxChat(body: ChatCompletionBody): Promise<ChatCompletionResponse | null> {
  const apiKey = process.env.BLACKBOX_API_KEY;

  if (!apiKey) {
    throw new Error('BLACKBOX_API_KEY_NOT_SET');
  }

  const response = await fetch(BLACKBOX_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error: ExtendedError = new Error(`BLACKBOX_API_ERROR_${response.status}`);
    error.details = errorBody;
    throw error;
  }

  return response.json();
}

function buildPromptInput(
  student: StudentForAnalysis,
  teacherCommentHighlights: TeacherCommentForPrompt[],
  assessmentSignals: AssessmentSignals
) {
  const overallAverageScore =
    student.lessonStatuses.length > 0
      ? Math.round(
          student.lessonStatuses
            .filter(s => typeof s.score === 'number')
            .reduce((sum, s) => sum + (s.score || 0), 0) /
            Math.max(
              1,
              student.lessonStatuses.filter(s => typeof s.score === 'number').length
            )
        )
      : null;

  const recentAssessments =
    student.assessments?.map(assessment => ({
      examTitle: assessment.examTitle,
      lessonTitle: assessment.lessonTitle,
      overallScore: assessment.overallScore,
      maxScore: assessment.maxScore,
      gradeText: assessment.gradeText,
      adviceSummary: assessment.adviceSummary,
      programRecommendations: assessment.programRecommendations,
      questions: assessment.questions?.map(question => ({
        number: question.number,
        questionText: question.questionText,
        studentAnswer: question.studentAnswer,
        teacherComment: question.teacherComment,
        improvementAdvice: question.improvementAdvice,
        recommendedProgramFocus: question.recommendedProgramFocus,
        feedback: question.feedback,
        skillTags: question.skillTags
      }))
    })) ?? [];

  return {
    student: {
      id: student.id,
      name: student.name,
      age: student.age,
      className: student.className,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      overallAverageScore
    },
    lecons: student.lessonStatuses,
    recentAssessments,
    teacherComments: teacherCommentHighlights,
    examInsights: assessmentSignals
  };
}

export async function generateStudentAnalysisFromLLM(
  student: StudentForAnalysis
): Promise<StudentAnalysisOutput> {
  const teacherCommentHighlights = extractTeacherCommentHighlights(student.teacherComments);
  const assessmentSignals = collectAssessmentSignals(student.assessments ?? []);
  const input = buildPromptInput(student, teacherCommentHighlights, assessmentSignals);
  const hasStructuredData =
    (student.lessonStatuses?.length ?? 0) > 0 ||
    (student.assessments?.length ?? 0) > 0 ||
    teacherCommentHighlights.length > 0;
  const deterministicSummary = buildDeterministicSummary(
    student,
    teacherCommentHighlights,
    assessmentSignals
  );

  if (!hasStructuredData) {
    console.warn('Skipping LLM analysis: no pedagogical data provided for student', student.id);
    return deterministicSummary;
  }

  const body = {
    model: DEFAULT_TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content: [
          'Tu es un coach pédagogique francophone spécialisé dans l’analyse d’évaluations corrigées.',
          'Tu réponds UNIQUEMENT avec un objet JSON strict contenant exactement les clés "strengths", "weaknesses" et "recommendations".',
          'Tu n’ajoutes jamais de phrases hors du JSON, pas d’excuses, pas de questions.',
          'Même si les données sont partielles, tu remplis chaque clé avec un tableau (qui peut être vide) et tu ne demandes jamais plus d’informations.',
          'Tu t’appuies en priorité sur les données présentes dans les copies (questions, réponses, annotations du professeur, conseils, axes du programme) et tu ignores les informations externes qui ne figurent pas dans le dossier.',
          'Lorsque des commentaires du professeur sont fournis, tu les utilises pour contextualiser les constats, souligner les objectifs déjà partagés et rester cohérent avec ses priorités.',
          'Tu ne recalcules jamais les notes : la note inscrite par l’enseignant est la référence absolue.',
          'Tu renvoies un unique objet JSON avec exactement les clés "strengths", "weaknesses", "recommendations" (même si les clés sont en anglais, tout le contenu est rédigé en français).',
          'Chaque clé contient un tableau de puces en français clair, reliées à des constats précis tirés des copies, en citant les notions ou compétences à retravailler quand c’est pertinent.'
        ].join(' ')
      },
      {
        role: 'user',
        content:
          'Analyse ces données (leçons + copies corrigées + commentaires du professeur). Déduis uniquement des enseignements issus des copies tout en intégrant les rappels ou alertes de l’enseignant : cite les compétences maîtrisées, les erreurs récurrentes, et propose des recommandations concrètes pour la prochaine séance.' +
          'Réponds en français, et renvoie SEULEMENT un objet JSON valide. Ne pose jamais de question, même si les données sont limitées.\n\n' +
          JSON.stringify(input)
      }
    ]
  };

  try {
    const data = await callBlackboxChat(body);
    const content = extractMessageText(data?.choices?.[0]?.message?.content);
    const jsonCandidate = extractLikelyJson(content);

    let parsed: Partial<StudentAnalysisOutput>;
    try {
      parsed = JSON.parse(jsonCandidate || '{}') as Partial<StudentAnalysisOutput>;
    } catch (parseError) {
      console.error('Failed to parse LLM JSON content, falling back:', parseError, content);
      return deterministicSummary;
    }

    if (
      !parsed ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.weaknesses) ||
      !Array.isArray(parsed.recommendations)
    ) {
      console.warn('LLM response missing expected keys. Falling back to default analysis.');
      return deterministicSummary;
    }

    const normalized: StudentAnalysisOutput = {
      strengths: normalizeList(parsed.strengths),
      weaknesses: normalizeList(parsed.weaknesses),
      recommendations: normalizeList(parsed.recommendations)
    };

    return mergeSummaries(normalized, deterministicSummary);
  } catch (error) {
    if (error instanceof Error && error.message === 'BLACKBOX_API_KEY_NOT_SET') {
      console.warn('BLACKBOX_API_KEY is not set. Falling back to default summaries.');
    } else if (error instanceof Error) {
      const extended = error as ExtendedError;
      console.error('GenerateStudentAnalysis Blackbox error:', error.message, extended.details);
    }

    console.error('Error calling Blackbox AI:', error);
    return deterministicSummary;
  }
}

function buildDeterministicSummary(
  student: StudentForAnalysis,
  teacherCommentHighlights: TeacherCommentForPrompt[],
  assessmentSignals: AssessmentSignals
): StudentAnalysisOutput {
  const completed = student.lessonStatuses.filter(ls =>
    ['completed', 'mastered'].includes(ls.masteryLevel)
  );
  const inProgress = student.lessonStatuses.filter(ls => ls.masteryLevel === 'in_progress');
  const notStarted = student.lessonStatuses.filter(ls => ls.masteryLevel === 'not_started');

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (completed.length > 0) {
    const lessonLabel = completed.length > 1 ? 'leçons' : 'leçon';
    strengths.push(
      `A déjà terminé ${completed.length} ${lessonLabel}.`,
      'Montre une bonne capacité à aller au bout des tâches proposées.'
    );
  } else {
    strengths.push('Dispose d’un fort potentiel à condition d’un accompagnement structuré.');
  }

  if (notStarted.length > 0) {
    weaknesses.push(
      `${notStarted.length} leçon${notStarted.length > 1 ? 's' : ''} n’a pas encore été entamée.`,
      'Un cadrage supplémentaire aiderait à lancer les prochaines étapes.'
    );
  }

  if (inProgress.length > 0) {
    const focusCount = Math.min(inProgress.length, 3);
    recommendations.push(
      `Consolider en priorité ${focusCount} leçon${focusCount > 1 ? 's' : ''} actuellement en cours.`,
      'Programmer de courts bilans réguliers pour valider la compréhension.',
      'S’appuyer sur des supports visuels ou des exemples guidés.'
    );
  } else {
    recommendations.push(
      'Définir une à deux leçons prioritaires avec une échéance claire.',
      'Valoriser chaque progression pour maintenir la motivation.'
    );
  }

  if (teacherCommentHighlights.length > 0) {
    const [latestComment] = teacherCommentHighlights;
    const excerpt = summarizeTeacherComment(latestComment.content);
    if (excerpt) {
      recommendations.unshift(
        `Prendre en compte la priorité signalée par ${latestComment.teacherName ?? 'l’enseignant·e'} : ${excerpt}`
      );
    }
    weaknesses.push(
      teacherCommentHighlights.length > 1
        ? 'Plusieurs commentaires récents soulignent des points d’attention récurrents : les intégrer explicitement au prochain plan de travail.'
        : 'Le dernier commentaire du professeur met en avant un point de vigilance à suivre de près.'
    );
  }

  if (assessmentSignals.strongPerformances.length > 0) {
    strengths.push(...assessmentSignals.strongPerformances.slice(0, 2));
  }

  if (assessmentSignals.adviceBullets.length > 0) {
    weaknesses.push(...assessmentSignals.adviceBullets.slice(0, 2));
  }

  if (assessmentSignals.questionIssues.length > 0) {
    weaknesses.push(...assessmentSignals.questionIssues.slice(0, 2));
  }

  if (assessmentSignals.strugglingPerformances.length > 0) {
    weaknesses.push(...assessmentSignals.strugglingPerformances.slice(0, 2));
  }

  if (assessmentSignals.programRecommendations.length > 0) {
    recommendations.push(
      ...assessmentSignals.programRecommendations.slice(0, 3).map(rec => `Planifier : ${rec}`)
    );
  }

  if (assessmentSignals.adviceBullets.length > 0) {
    recommendations.push(
      ...assessmentSignals.adviceBullets.slice(0, 3).map(advice => `Mettre en pratique : ${advice}`)
    );
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      'Les données disponibles ne mettent pas encore en évidence de blocage précis : planifier une nouvelle évaluation ciblée pour confirmer les acquis et révéler les axes à renforcer.'
    );
  }

  return {
    strengths: uniqueInOrder(strengths),
    weaknesses: uniqueInOrder(weaknesses),
    recommendations: uniqueInOrder(recommendations)
  };
}

function summarizeTeacherComment(content: string, maxLength = 160): string {
  const singleLine = content.replace(/\s+/g, ' ').trim();
  if (!singleLine) {
    return '';
  }
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength - 1).trim()}…`;
}

function normalizeList(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function mergeSummaries(
  primary: StudentAnalysisOutput,
  baseline: StudentAnalysisOutput
): StudentAnalysisOutput {
  return {
    strengths: uniqueInOrder([...primary.strengths, ...baseline.strengths]),
    weaknesses: uniqueInOrder([...primary.weaknesses, ...baseline.weaknesses]),
    recommendations: uniqueInOrder([...primary.recommendations, ...baseline.recommendations])
  };
}

interface AssessmentSignals {
  strongPerformances: string[];
  strugglingPerformances: string[];
  adviceBullets: string[];
  questionIssues: string[];
  programRecommendations: string[];
}

function collectAssessmentSignals(
  assessments: AssessmentSummaryForPrompt[]
): AssessmentSignals {
  const strongPerformances: string[] = [];
  const strugglingPerformances: string[] = [];
  const adviceBullets: string[] = [];
  const questionIssues: string[] = [];
  const programRecommendations: string[] = [];

  assessments.forEach(assessment => {
    const title = assessment.examTitle || assessment.lessonTitle || 'Évaluation';
    const percent = computePercent(assessment.overallScore, assessment.maxScore);

    if (typeof percent === 'number') {
      if (percent >= 0.8) {
        strongPerformances.push(
          `${Math.round(percent * 100)} % à « ${title} » : les compétences abordées sont bien assimilées.`
        );
      } else if (percent <= 0.55) {
        strugglingPerformances.push(
          `${Math.round(percent * 100)} % à « ${title} » : reprendre les notions travaillées dans cette copie.`
        );
      }
    }

    (assessment.adviceSummary ?? []).forEach(advice => {
      const normalized = normalizeBullet(`${title} – ${advice}`);
      if (normalized) {
        adviceBullets.push(normalized);
      }
    });

    (assessment.programRecommendations ?? []).forEach(rec => {
      const normalized = normalizeBullet(rec);
      if (normalized) {
        programRecommendations.push(normalized);
      }
    });

    (assessment.questions ?? []).forEach(question => {
      const issue =
        question.improvementAdvice || question.teacherComment || question.feedback || '';
      const normalized = normalizeBullet(issue);
      if (normalized) {
        const questionLabel = question.number ? `Q${question.number}` : 'Question';
        questionIssues.push(`${title} – ${questionLabel} : ${normalized}`);
      }
    });
  });

  return {
    strongPerformances: uniqueInOrder(strongPerformances),
    strugglingPerformances: uniqueInOrder(strugglingPerformances),
    adviceBullets: uniqueInOrder(adviceBullets),
    questionIssues: uniqueInOrder(questionIssues),
    programRecommendations: uniqueInOrder(programRecommendations)
  };
}

function computePercent(score?: number, max?: number): number | null {
  if (typeof score !== 'number' || typeof max !== 'number' || max <= 0) {
    return null;
  }
  return score / max;
}

function normalizeBullet(text?: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach(value => {
    const lowered = value.toLowerCase();
    if (value && !seen.has(lowered)) {
      seen.add(lowered);
      result.push(value);
    }
  });
  return result;
}

export async function analyzeAndGradeExamImage(params: {
  imageUrl: string;
  lessonTitle?: string;
}): Promise<ExamAnalysisResult> {
  const { imageUrl, lessonTitle } = params;

  const instructions =
    'You are an expert educator reading graded exam copies. Each photo already contains the student name and the grade written by the teacher. ' +
    'Transcribe the student name EXACTLY as written (keep accents, uppercase, hyphens). ' +
    'Transcribe the grade text EXACTLY as written ("16/20", "B+", "18,5 sur 20", etc.). Never invent or recompute a grade. ' +
    'Ignore partial scores or per-question annotations when they are not the final grade: never average or total anything yourself. ' +
    'If several notes appear, select the final teacher grade (usually expressed as "xx/20"). ' +
    'Only if the grade text clearly contains numbers, set "overallScore" and "maxScore" accordingly; otherwise set them to null. ' +
    'Extract the teacher comments, the student answers, and generate actionable improvement advice referencing concrete skills or sections of the program. ' +
    'Output a SINGLE JSON object with the following shape:\n' +
    '{\n' +
    '  "detectedStudentName": string,\n' +
    '  "examTitle": string,\n' +
    '  "subject": string,\n' +
    '  "gradeText": string,\n' +
    '  "overallScore": number | null,\n' +
    '  "maxScore": number | null,\n' +
    '  "rawText": string,\n' +
    '  "adviceSummary": string[],\n' +
    '  "programRecommendations": string[],\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "number": number,\n' +
    '      "questionText": string,\n' +
    '      "studentAnswer": string,\n' +
    '      "teacherComment": string,\n' +
    '      "improvementAdvice": string,\n' +
    '      "recommendedProgramFocus": string,\n' +
    '      "skillTags": string[],\n' +
    '      "feedback": string,\n' +
    '      "correctAnswer": string,\n' +
    '      "pointsPossible": number,\n' +
    '      "pointsAwarded": number\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    'Return ONLY the JSON object. If information is missing, leave the corresponding fields null or empty arrays and explain uncertainties inside the feedback.';

  const messages = [
    {
      role: 'system' as const,
      content: instructions
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'text',
          text: `Lesson context: ${lessonTitle || 'Unknown lesson'}.\nAnalyse la copie et renvoie uniquement le JSON demandé.`
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
      ]
    }
  ];

  const body = {
    model: DEFAULT_VISION_MODEL,
    temperature: 0.2,
    messages
  };

  try {
    const data = await callBlackboxChat(body);
    const content = extractMessageText(data?.choices?.[0]?.message?.content);

    const parsed = JSON.parse(content || '{}') as Partial<ExamAnalysisResult> & {
      questions?: unknown;
    };

    if (!Array.isArray(parsed.questions)) {
      throw new Error('Missing questions array in exam analysis response');
    }

    const normalizeStringArray = (value?: unknown): string[] =>
      Array.isArray(value)
        ? (value as unknown[])
            .filter(item => typeof item === 'string')
            .map(item => (item as string).trim())
            .filter(Boolean)
        : [];

    const normalizedQuestions = parsed.questions.map((question, index) => {
      const q = question as Partial<ExamQuestionAnalysis>;
      return {
        number: typeof q.number === 'number' ? q.number : index + 1,
        questionText: q.questionText || '',
        studentAnswer: q.studentAnswer,
        teacherComment: q.teacherComment || q.feedback,
        improvementAdvice: q.improvementAdvice || q.feedback,
        recommendedProgramFocus: q.recommendedProgramFocus,
        feedback: q.feedback,
        skillTags: Array.isArray(q.skillTags) ? q.skillTags : undefined,
        correctAnswer: q.correctAnswer,
        pointsPossible: typeof q.pointsPossible === 'number' ? q.pointsPossible : undefined,
        pointsAwarded: typeof q.pointsAwarded === 'number' ? q.pointsAwarded : undefined
      };
    });

    return {
      examTitle: parsed.examTitle || lessonTitle || 'Exam',
      subject: parsed.subject || undefined,
      detectedStudentName: parsed.detectedStudentName,
      rawText: parsed.rawText,
      gradeText: parsed.gradeText || undefined,
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : undefined,
      maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : undefined,
      adviceSummary: normalizeStringArray(parsed.adviceSummary),
      programRecommendations: normalizeStringArray(parsed.programRecommendations),
      questions: normalizedQuestions
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'BLACKBOX_API_KEY_NOT_SET') {
      console.warn('BLACKBOX_API_KEY is not set. Returning fallback exam analysis.');
    } else if (error instanceof Error) {
      const extended = error as ExtendedError;
      console.error('analyzeAndGradeExamImage error:', error.message, extended.details);
    }
    return fallbackExamAnalysis(lessonTitle);
  }
}

function fallbackExamAnalysis(lessonTitle?: string): ExamAnalysisResult {
  return {
    examTitle: `${lessonTitle || 'Lesson'} Assessment (Fallback)`,
    subject: lessonTitle || 'General',
    detectedStudentName: 'Élève inconnu',
    gradeText: '15/20',
    overallScore: 15,
    maxScore: 20,
    rawText: 'Fallback analysis used due to missing AI credentials.',
    adviceSummary: [
      'Revoir les fractions équivalentes pour gagner en vitesse.',
      'Soigner la justification écrite pour les problèmes longs.'
    ],
    programRecommendations: ['Fractions', 'Résolution de problèmes'],
    questions: [
      {
        number: 1,
        questionText: 'Explique le concept principal de la leçon.',
        studentAnswer: 'Student answer placeholder',
        teacherComment: 'Bonne compréhension globale.',
        improvementAdvice: 'Ajouter un exemple concret pour valider la notion.',
        recommendedProgramFocus: 'Concepts clés',
        feedback: 'Réponse correcte mais incomplète.',
        skillTags: ['compréhension'],
        pointsPossible: 10,
        pointsAwarded: 7
      },
      {
        number: 2,
        questionText: 'Applique le concept à une nouvelle situation.',
        studentAnswer: 'Student attempt placeholder',
        teacherComment: 'Raisonnement pertinent.',
        improvementAdvice: 'Décrire toutes les étapes du raisonnement.',
        recommendedProgramFocus: 'Problèmes ouverts',
        feedback: 'Bonne intuition, détaille davantage.',
        skillTags: ['application', 'problème'],
        pointsPossible: 10,
        pointsAwarded: 8
      }
    ]
  };
}

export interface ExtractedStudent {
  name: string;
  age?: number;
}

export interface StudentRegistryExtractionResult {
  students: ExtractedStudent[];
  rawText?: string;
  detectedFormat?: string;
}

export async function extractStudentsFromRegistry(params: {
  imageUrls: string[];
}): Promise<StudentRegistryExtractionResult> {
  const { imageUrls } = params;

  if (imageUrls.length === 0) {
    throw new Error('At least one image URL is required');
  }

  const instructions =
    'You are an expert at reading class registries and student lists. You will be given one or more images of a class registry, student roster, or list. ' +
    'Your task is to extract ALL student names and their ages (if available) from the document. ' +
    'The document may be in various formats: handwritten lists, printed tables, PDFs, spreadsheets, or forms. ' +
    'Output a SINGLE JSON object with the following shape:\n' +
    '{\n' +
    '  "students": [\n' +
    '    {\n' +
    '      "name": string (full name of the student),\n' +
    '      "age": number (optional, only if clearly stated)\n' +
    '    }\n' +
    '  ],\n' +
    '  "rawText": string (the raw text extracted from the document),\n' +
    '  "detectedFormat": string (description of the document format)\n' +
    '}\n' +
    'Important guidelines:\n' +
    '- Extract ALL students from the document, do not skip any\n' +
    '- If age is not clearly stated, omit the age field for that student\n' +
    '- Clean up names (proper capitalization, remove extra spaces)\n' +
    '- If you see birth dates, calculate the age\n' +
    '- Ignore headers, footers, and non-student information\n' +
    '- Do not include any explanation outside of the JSON.';

  const contentParts: Array<TextContentPart | ImageContentPart> = [
    {
      type: 'text' as const,
      text: 'Extract all student names and ages from this class registry document. Return only the JSON object.'
    }
  ];

  for (const imageUrl of imageUrls) {
    contentParts.push({
      type: 'image_url' as const,
      image_url: {
        url: imageUrl
      }
    });
  }

  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: MessageContent;
  }> = [
    {
      role: 'system' as const,
      content: instructions
    },
    {
      role: 'user' as const,
      content: contentParts
    }
  ];

  const body = {
    model: DEFAULT_VISION_MODEL,
    temperature: 0.1,
    messages
  };

  try {
    const data = await callBlackboxChat(body);
    const content = extractMessageText(data?.choices?.[0]?.message?.content);

    const parsed = JSON.parse(content || '{}') as Partial<StudentRegistryExtractionResult> & {
      students?: unknown;
    };

    if (!Array.isArray(parsed.students)) {
      throw new Error('Missing students array in registry extraction response');
    }

    const normalizedStudents = parsed.students.map((student, index) => {
      const s = student as Partial<ExtractedStudent>;
      return {
        name: s.name || `Student ${index + 1}`,
        age: typeof s.age === 'number' && s.age > 0 && s.age < 100 ? s.age : undefined
      };
    });

    return {
      students: normalizedStudents,
      rawText: parsed.rawText,
      detectedFormat: parsed.detectedFormat
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'BLACKBOX_API_KEY_NOT_SET') {
      console.warn('BLACKBOX_API_KEY is not set. Returning fallback student extraction.');
    } else if (error instanceof Error) {
      const extended = error as ExtendedError;
      console.error('extractStudentsFromRegistry error:', error.message, extended.details);
    }
    return fallbackStudentExtraction();
  }
}

function fallbackStudentExtraction(): StudentRegistryExtractionResult {
  return {
    students: [
      { name: 'Sample Student 1', age: 10 },
      { name: 'Sample Student 2', age: 11 },
      { name: 'Sample Student 3', age: 10 }
    ],
    rawText: 'Fallback extraction used due to missing AI credentials or parsing error.',
    detectedFormat: 'Fallback mode'
  };
}


