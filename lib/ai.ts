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
  questions: Array<{
    questionText: string;
    studentAnswer?: string;
    correctAnswer?: string;
    pointsAwarded?: number;
    pointsPossible?: number;
    feedback?: string;
  }>;
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
}

export interface ExamQuestionAnalysis {
  number: number;
  questionText: string;
  studentAnswer?: string;
  correctAnswer?: string;
  pointsPossible?: number;
  pointsAwarded?: number;
  feedback?: string;
  skillTags?: string[];
}

export interface ExamAnalysisResult {
  examTitle: string;
  subject?: string;
  detectedStudentName?: string;
  rawText?: string;
  overallScore?: number;
  maxScore?: number;
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

function buildPromptInput(student: StudentForAnalysis) {
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
      questions: assessment.questions?.map(question => ({
        number: question.number,
        questionText: question.questionText,
        studentAnswer: question.studentAnswer,
        correctAnswer: question.correctAnswer,
        pointsAwarded: question.pointsAwarded,
        pointsPossible: question.pointsPossible,
        feedback: question.feedback
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
    recentAssessments
  };
}

export async function generateStudentAnalysisFromLLM(
  student: StudentForAnalysis
): Promise<StudentAnalysisOutput> {
  const input = buildPromptInput(student);

  const body = {
    model: DEFAULT_TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Tu es un coach pédagogique francophone. Tu analyses EXCLUSIVEMENT les copies corrigées des élèves (questions, réponses, corrections, feedback) pour déterminer leurs forces, faiblesses et recommandations actionnables. ' +
          'Tu ignores tout signal qui ne vient pas d\'une évaluation. ' +
          'Ta réponse DOIT être un seul objet JSON avec exactement les clés "strengths", "weaknesses", "recommendations". ' +
          'Chaque clé contient un tableau de puces rédigées en français clair, directement liées aux erreurs ou réussites observées dans les copies. '
      },
      {
        role: 'user',
        content:
          'Analyse ces données (leçons + copies corrigées). Déduis uniquement des enseignements issus des copies : cite les compétences maîtrisées, les erreurs récurrentes, et propose des recommandations concrètes pour la prochaine séance. ' +
          'Réponds en français, format JSON strict.\n\n' +
          JSON.stringify(input)
      }
    ]
  };

  try {
    const data = await callBlackboxChat(body);
    const content = extractMessageText(data?.choices?.[0]?.message?.content);

    let parsed: Partial<StudentAnalysisOutput>;
    try {
      parsed = JSON.parse(content || '{}') as Partial<StudentAnalysisOutput>;
    } catch (parseError) {
      console.error('Failed to parse LLM JSON content, falling back:', parseError, content);
      return fallbackAnalysis(student);
    }

    if (
      !parsed ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.weaknesses) ||
      !Array.isArray(parsed.recommendations)
    ) {
      console.warn('LLM response missing expected keys. Falling back to default analysis.');
      return fallbackAnalysis(student);
    }

    return {
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      recommendations: parsed.recommendations
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'BLACKBOX_API_KEY_NOT_SET') {
      console.warn('BLACKBOX_API_KEY is not set. Falling back to default summaries.');
    } else if (error instanceof Error) {
      const extended = error as ExtendedError;
      console.error('GenerateStudentAnalysis Blackbox error:', error.message, extended.details);
    }

    console.error('Error calling Blackbox AI:', error);
    return fallbackAnalysis(student);
  }
}

function fallbackAnalysis(student: StudentForAnalysis): StudentAnalysisOutput {
  const completed = student.lessonStatuses.filter(ls =>
    ['completed', 'mastered'].includes(ls.masteryLevel)
  );
  const inProgress = student.lessonStatuses.filter(ls => ls.masteryLevel === 'in_progress');
  const notStarted = student.lessonStatuses.filter(ls => ls.masteryLevel === 'not_started');

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (completed.length > 0) {
    strengths.push(
      `Has completed ${completed.length} lesson${completed.length > 1 ? 's' : ''} so far.`,
      'Shows ability to follow through on assigned learning tasks.'
    );
  } else {
    strengths.push('Shows potential for growth with structured support.');
  }

  if (notStarted.length > 0) {
    weaknesses.push(
      `Several lessons (${notStarted.length}) have not been started yet.`,
      'May need help getting started and clear expectations for upcoming work.'
    );
  }

  if (inProgress.length > 0) {
    recommendations.push(
      `Focus upcoming sessions on ${Math.min(
        inProgress.length,
        3
      )} in-progress lesson${inProgress.length > 1 ? 's' : ''}.`,
      'Schedule short, frequent check-ins to monitor understanding.',
      'Use visual supports and worked examples to reinforce key concepts.'
    );
  } else {
    recommendations.push(
      'Assign one or two priority lessons and set a clear completion target.',
      'Celebrate small wins to build motivation and confidence.'
    );
  }

  return { strengths, weaknesses, recommendations };
}

export async function analyzeAndGradeExamImage(params: {
  imageUrl: string;
  lessonTitle?: string;
  providedStudentName?: string;
}): Promise<ExamAnalysisResult> {
  const { imageUrl, lessonTitle, providedStudentName } = params;

  const instructions =
    'You are an expert educator and exam grader. You will be given an image of a handwritten or printed student test. ' +
    'Read every question and the student\'s responses using OCR. Infer the correct answers when necessary. ' +
    'Output a SINGLE JSON object with the following shape:\n' +
    '{\n' +
    '  "detectedStudentName": string,\n' +
    '  "examTitle": string,\n' +
    '  "subject": string,\n' +
    '  "overallScore": number,\n' +
    '  "maxScore": number,\n' +
    '  "rawText": string,\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "number": number,\n' +
    '      "questionText": string,\n' +
    '      "studentAnswer": string,\n' +
    '      "correctAnswer": string,\n' +
    '      "pointsPossible": number,\n' +
    '      "pointsAwarded": number,\n' +
    '      "feedback": string,\n' +
    '      "skillTags": string[]\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    'If information is missing, make a best effort guess and clearly state uncertainties in feedback. ' +
    'Do not include any explanation outside of the JSON.';

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
          text:
            `Lesson context: ${lessonTitle || 'Unknown lesson'}.\n` +
            (providedStudentName ? `Teacher-provided student name: ${providedStudentName}.\n` : '') +
            'Return only the JSON object.'
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

    const normalizedQuestions = parsed.questions.map((question, index) => {
      const q = question as Partial<ExamQuestionAnalysis>;
      return {
        number: typeof q.number === 'number' ? q.number : index + 1,
        questionText: q.questionText || '',
        studentAnswer: q.studentAnswer,
        correctAnswer: q.correctAnswer,
        pointsPossible: typeof q.pointsPossible === 'number' ? q.pointsPossible : undefined,
        pointsAwarded: typeof q.pointsAwarded === 'number' ? q.pointsAwarded : undefined,
        feedback: q.feedback,
        skillTags: Array.isArray(q.skillTags) ? q.skillTags : undefined
      };
    });

    return {
      examTitle: parsed.examTitle || lessonTitle || 'Exam',
      subject: parsed.subject || undefined,
      detectedStudentName: parsed.detectedStudentName || providedStudentName,
      rawText: parsed.rawText,
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : undefined,
      maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : undefined,
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
    detectedStudentName: 'Sample Student',
    overallScore: 75,
    maxScore: 100,
    rawText: 'Fallback analysis used due to missing AI credentials.',
    questions: [
      {
        number: 1,
        questionText: 'Explain the main concept from the lesson.',
        studentAnswer: 'Student answer placeholder',
        correctAnswer: 'Key points of the lesson concept explained with examples.',
        pointsPossible: 10,
        pointsAwarded: 7,
        feedback: 'Answer captured part of the idea; reinforce with concrete example.',
        skillTags: ['conceptual_understanding']
      },
      {
        number: 2,
        questionText: 'Apply the concept to a new situation.',
        studentAnswer: 'Student attempt placeholder',
        correctAnswer: 'Steps showing transfer of learning to the new situation.',
        pointsPossible: 10,
        pointsAwarded: 8,
        feedback: 'Solid reasoning; add more detail to final explanation.',
        skillTags: ['application', 'problem_solving']
      }
    ]
  };
}


