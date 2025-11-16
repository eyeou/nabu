import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';
import {
  analyzeAndGradeExamImage,
  generateStudentAnalysisFromLLM,
  StudentAnalysisOutput,
  StudentForAnalysis,
  ExamAnalysisResult
} from '@/lib/ai';
import { parseCopyInsights } from '@/lib/copy-insights';

export async function POST(request: NextRequest) {
  try {
    console.info('📥 Received exam upload request');
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      console.warn('🚫 Exam upload blocked: unauthenticated request');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required'
        }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      lessonId,
      imageUrl,
      imageDataUrl,
      imageUrls,
      imageDataUrls,
      classId
    }: {
      lessonId?: string;
      imageUrl?: string;
      imageDataUrl?: string;
      imageUrls?: string[];
      imageDataUrls?: string[];
      classId?: string;
    } = body;

    if (!lessonId) {
      console.warn('⚠️ Exam upload missing lessonId');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lesson ID is required'
        }),
        { status: 400 }
      );
    }

    const imageSources = [
      ...(imageUrl ? [imageUrl] : []),
      ...(Array.isArray(imageUrls) ? imageUrls : []),
      ...(imageDataUrl ? [imageDataUrl] : []),
      ...(Array.isArray(imageDataUrls) ? imageDataUrls : [])
    ].filter(Boolean);

    if (imageSources.length === 0) {
      console.warn('⚠️ Exam upload missing image payload');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Provide at least one exam photo (imageUrl or imageDataUrl)'
        }),
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        program: {
          teacherId: teacher.teacherId
        }
      },
      include: {
        program: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!lesson) {
      console.warn('🚫 Lesson not found or unauthorized during exam upload');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lesson not found or access denied'
        }),
        { status: 404 }
      );
    }

    const ocrConcurrency = Math.max(
      1,
      Math.min(
        imageSources.length,
        Number.isNaN(Number(process.env.EXAM_OCR_CONCURRENCY))
          ? 3
          : Number(process.env.EXAM_OCR_CONCURRENCY ?? 3)
      )
    );

    const ocrResults = await processInParallel(
      imageSources,
      ocrConcurrency,
      async (source, index) => {
        console.info(`🧠 Sending exam image page ${index + 1}/${imageSources.length} to AI...`);
        const analysis = await analyzeAndGradeExamImage({
          imageUrl: source,
          lessonTitle: lesson.title
        });
        return { source, analysis, pageIndex: index };
      }
    );

    const analysesByStudent = new Map<
      string,
      { displayName: string; analyses: ExamAnalysisResult[]; imageSources: string[] }
    >();
    const namelessPages: number[] = [];

    for (const { source, analysis: result, pageIndex } of ocrResults) {
      const detectedName = result.detectedStudentName?.trim();
      if (!detectedName) {
        namelessPages.push(pageIndex + 1);
        continue;
      }

      const normalized = normalizeStudentName(detectedName);
      const existing = analysesByStudent.get(normalized);
      if (!existing) {
        analysesByStudent.set(normalized, {
          displayName: detectedName,
          analyses: [result],
          imageSources: [source]
        });
      } else {
        existing.analyses.push(result);
        existing.imageSources.push(source);
      }
    }

    if (analysesByStudent.size === 0) {
      console.warn('🚫 No student names detected on uploaded copies');
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Aucun nom n’a été détecté sur les copies envoyées. Vérifiez que chaque page contient clairement le nom de l’élève.'
        }),
        { status: 422 }
      );
    }

    if (namelessPages.length > 0) {
      console.warn('⚠️ Missing names on some pages:', namelessPages);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Impossible d'affecter certaines pages (numéros: ${namelessPages.join(
            ', '
          )}). Assurez-vous que le nom figure sur chaque page.`
        }),
        { status: 422 }
      );
    }

    const processedStudents: Array<{
      studentId: string;
      studentName: string;
      wasCreated: boolean;
      gradeText?: string;
      assessmentId: string;
      studentAssessmentId: string;
      summaries: Awaited<ReturnType<typeof upsertSummaries>>;
    }> = [];

    for (const [, group] of analysesByStudent.entries()) {
      const mergedAnalysis = mergeExamAnalyses(group.analyses);
      const extractedScore = extractScoresFromGradeText(mergedAnalysis.gradeText);

      let resolvedStudent: Awaited<ReturnType<typeof resolveStudent>>;
      try {
        console.info(`👤 Resolving student record for ${group.displayName}...`);
        resolvedStudent = await resolveStudent({
          teacherId: teacher.teacherId,
          possibleName: mergedAnalysis.detectedStudentName,
          classId
        });
        console.info(
          `👤 Student resolved: ${resolvedStudent.student.name} (${resolvedStudent.student.id}) ${
            resolvedStudent.wasCreated ? '[created]' : ''
          }`
        );
      } catch (studentError) {
        const errorMessage = mapStudentResolutionError(
          studentError instanceof Error ? studentError.message : undefined
        );
        console.warn('🚫 Unable to resolve student for exam upload:', errorMessage);
        return new Response(
          JSON.stringify({
            success: false,
            message: `${group.displayName}: ${errorMessage}`
          }),
          { status: 400 }
        );
      }

      const student = resolvedStudent.student;
      console.info('🗂️ Saving assessment + copy insights...');
      const assessment = await prisma.assessment.create({
        data: {
          lessonId: lesson.id,
          title: mergedAnalysis.examTitle || `${lesson.title} Assessment`,
          description: mergedAnalysis.subject || null,
          sourceImageUrl: group.imageSources.join(','),
          extractedData: {
            rawText: mergedAnalysis.rawText,
            gradeText: mergedAnalysis.gradeText,
            adviceSummary: mergedAnalysis.adviceSummary,
            programRecommendations: mergedAnalysis.programRecommendations,
            questions: mergedAnalysis.questions
          }
        }
      });

      const gradedResponsesPayload = {
        gradeText: mergedAnalysis.gradeText,
        adviceSummary: mergedAnalysis.adviceSummary ?? [],
        programRecommendations: mergedAnalysis.programRecommendations ?? [],
        questions: mergedAnalysis.questions
      };

      const studentAssessment = await prisma.studentAssessment.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.id,
          detectedStudentName: mergedAnalysis.detectedStudentName,
          overallScore: extractedScore?.totalScore ?? null,
          maxScore: extractedScore?.maxScore ?? null,
          gradedResponses: gradedResponsesPayload
        }
      });

      console.info('📊 Updating lesson status with detected grade...');
      await upsertStudentLessonStatus({
        studentId: student.id,
        lessonId: lesson.id,
        examAnalysis: mergedAnalysis,
        extractedScore
      });

      console.info('🧾 Regenerating AI summary for student...');
      const summaries = await regenerateStudentSummaries(student.id);

      processedStudents.push({
        studentId: student.id,
        studentName: student.name,
        wasCreated: resolvedStudent.wasCreated,
        gradeText: mergedAnalysis.gradeText,
        assessmentId: assessment.id,
        studentAssessmentId: studentAssessment.id,
        summaries
      });
    }

    console.info('✨ Exam upload pipeline completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          processedStudents
        },
        message: `Copies analysées pour ${processedStudents.length} élève${
          processedStudents.length > 1 ? 's' : ''
        }.`
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('💥 Exam upload error:', error);
    const message =
      error instanceof Error
        ? `Failed to process exam upload: ${error.message}`
        : 'Failed to process exam upload';
    return new Response(
      JSON.stringify({
        success: false,
        message
      }),
      { status: 500 }
    );
  }
}

async function resolveStudent(params: {
  teacherId: string;
  possibleName?: string | null;
  classId?: string;
}): Promise<{ student: { id: string; name: string }; wasCreated: boolean }> {
  const { teacherId, possibleName, classId } = params;

  if (!possibleName || !possibleName.trim()) {
    throw new Error('DETECTED_NAME_REQUIRED');
  }

  const cleanedName = possibleName.trim();

  const matchedStudent = await prisma.student.findFirst({
    where: {
      name: {
        equals: cleanedName,
        mode: 'insensitive'
      },
      class: {
        teacherId
      }
    }
  });

  if (matchedStudent) {
    return { student: matchedStudent, wasCreated: false };
  }

  if (!classId) {
    throw new Error('CLASS_ID_REQUIRED_FOR_CREATION');
  }

  const classRecord = await prisma.class.findFirst({
    where: {
      id: classId,
      teacherId
    }
  });

  if (!classRecord) {
    throw new Error('CLASS_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const createdStudent = await prisma.student.create({
    data: {
      classId: classRecord.id,
      name: cleanedName
    }
  });

  return { student: createdStudent, wasCreated: true };
}

function mapStudentResolutionError(code?: string) {
  switch (code) {
    case 'DETECTED_NAME_REQUIRED':
      return 'Nom manquant : vérifiez que chaque copie contient clairement le nom de l’élève.';
    case 'CLASS_ID_REQUIRED_FOR_CREATION':
      return 'Sélectionnez une classe pour créer automatiquement les élèves détectés.';
    case 'CLASS_NOT_FOUND_OR_UNAUTHORIZED':
      return 'Class not found or you do not have access to this class.';
    default:
      return 'Unable to resolve student for this exam upload.';
  }
}

function normalizeStudentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function upsertStudentLessonStatus(params: {
  studentId: string;
  lessonId: string;
  examAnalysis: Awaited<ReturnType<typeof analyzeAndGradeExamImage>>;
  extractedScore?: { totalScore: number; maxScore: number } | null;
}) {
  const { studentId, lessonId, examAnalysis, extractedScore } = params;

  const gradeScore = extractedScore ?? extractScoresFromGradeText(examAnalysis.gradeText);

  const totalScore =
    gradeScore && gradeScore.maxScore > 0 ? gradeScore.totalScore : undefined;
  const maxScore =
    gradeScore && gradeScore.maxScore > 0 ? gradeScore.maxScore : undefined;

  const percent =
    typeof totalScore === 'number' && typeof maxScore === 'number' && maxScore > 0
      ? totalScore / maxScore
      : undefined;

  const masteryLevel = (() => {
    if (!percent && percent !== 0) return 'in_progress';
    if (percent >= 0.85) return 'mastered';
    if (percent >= 0.7) return 'completed';
    if (percent >= 0.4) return 'in_progress';
    return 'not_started';
  })();

  const focusNotes = examAnalysis.questions
    .map(question => ({
      number: question.number,
      note: question.improvementAdvice || question.teacherComment || question.feedback
    }))
    .filter(item => item.note)
    .slice(0, 5)
    .map(item => `Q${item.number}: ${item.note}`)
    .join(' | ');

  const statusNotes = [
    `Analyse automatisée du ${new Date().toLocaleDateString()}.`,
    examAnalysis.gradeText ? `Note détectée : ${examAnalysis.gradeText}.` : null,
    focusNotes || examAnalysis.adviceSummary?.[0] || 'Conseils disponibles dans la fiche élève.'
  ]
    .filter(Boolean)
    .join(' ');

  await prisma.studentLessonStatus.upsert({
    where: {
      studentId_lessonId: {
        studentId,
        lessonId
      }
    },
    update: {
      score: totalScore ?? null,
      masteryLevel,
      notes: statusNotes,
      completedAt: new Date()
    },
    create: {
      studentId,
      lessonId,
      score: totalScore ?? null,
      masteryLevel,
      notes: statusNotes,
      completedAt: new Date(),
      createdAt: new Date()
    }
  });
}

function extractScoresFromGradeText(
  gradeText?: string | null
): { totalScore: number; maxScore: number } | null {
  if (!gradeText) return null;
  const normalized = gradeText.replace(',', '.');

  const fractionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fractionMatch) {
    const totalScore = parseFloat(fractionMatch[1]);
    const maxScore = parseFloat(fractionMatch[2]);
    if (!Number.isNaN(totalScore) && !Number.isNaN(maxScore) && maxScore > 0) {
      return { totalScore, maxScore };
    }
  }

  const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1]);
    if (!Number.isNaN(percent)) {
      return { totalScore: percent, maxScore: 100 };
    }
  }

  return null;
}

async function regenerateStudentSummaries(studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId },
    include: {
      class: {
        select: { name: true, teacherId: true }
      },
      lessonStatuses: {
        include: {
          lesson: {
            select: {
              title: true
            }
          }
        }
      },
      studentAssessments: {
        include: {
          assessment: {
            select: {
              title: true,
              lesson: {
                select: { title: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }
    }
  });

  if (!student) {
    throw new Error('STUDENT_NOT_FOUND_FOR_SUMMARY');
  }

  const studentForAnalysis: StudentForAnalysis = {
    id: student.id,
    classId: student.classId,
    name: student.name,
    age: student.age ?? undefined,
    avatarUrl: student.avatarUrl ?? undefined,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    className: student.class?.name,
    lessonStatuses:
      student.lessonStatuses?.map(ls => ({
        lessonTitle: ls.lesson?.title || 'Lesson',
        masteryLevel: ls.masteryLevel,
        score: ls.score ?? undefined,
        notes: ls.notes ?? null,
        updatedAt: ls.updatedAt?.toISOString()
      })) ?? [],
    assessments:
      student.studentAssessments?.map(sa => {
        const insights = parseCopyInsights(sa.gradedResponses);
        return {
          examTitle: sa.assessment?.title || 'Assessment',
          lessonTitle: sa.assessment?.lesson?.title,
          overallScore: sa.overallScore ?? undefined,
          maxScore: sa.maxScore ?? undefined,
          gradeText: insights.gradeText,
          adviceSummary: insights.adviceSummary,
          programRecommendations: insights.programRecommendations,
          questions: insights.questions.map((question, index) => ({
            number: typeof question.number === 'number' ? question.number : index + 1,
            questionText: question.questionText || `Question ${index + 1}`,
            studentAnswer: question.studentAnswer,
            teacherComment: question.teacherComment,
            improvementAdvice: question.improvementAdvice,
            recommendedProgramFocus: question.recommendedProgramFocus,
            feedback: question.feedback,
            skillTags: question.skillTags
          }))
        };
      }) ?? []
  };

  const analysis = await generateStudentAnalysisFromLLM(studentForAnalysis);
  return upsertSummaries(studentId, analysis);
}

async function upsertSummaries(studentId: string, analysis: StudentAnalysisOutput) {
  const summaryPayload = [
    { subject: 'strengths', bulletPoints: analysis.strengths },
    { subject: 'weaknesses', bulletPoints: analysis.weaknesses },
    { subject: 'recommendations', bulletPoints: analysis.recommendations }
  ];

  return Promise.all(
    summaryPayload.map(({ subject, bulletPoints }) =>
      prisma.studentSummary.upsert({
        where: {
          studentId_subject: {
            studentId,
            subject
          }
        },
        update: {
          bulletPointsJson: JSON.stringify(bulletPoints)
        },
        create: {
          studentId,
          subject,
          bulletPointsJson: JSON.stringify(bulletPoints)
        }
      })
    )
  );
}

function mergeExamAnalyses(analyses: ExamAnalysisResult[]): ExamAnalysisResult {
  if (analyses.length === 0) {
    throw new Error('No analyses to merge');
  }

  const mergedQuestions = analyses.flatMap(analysis => analysis.questions);
  const declaredOverallScore = analyses.find(a => typeof a.overallScore === 'number')?.overallScore;
  const declaredMaxScore = analyses.find(a => typeof a.maxScore === 'number')?.maxScore;
  const detectedName = analyses.find(a => a.detectedStudentName)?.detectedStudentName;
  const gradeText = pickBestGradeText(analyses.map(a => a.gradeText));
  const combinedAdvice = Array.from(
    new Set(
      analyses
        .flatMap(a => a.adviceSummary ?? [])
        .map(advice => advice.trim())
        .filter(Boolean)
    )
  );
  const combinedProgramRecommendations = Array.from(
    new Set(
      analyses
        .flatMap(a => a.programRecommendations ?? [])
        .map(rec => rec.trim())
        .filter(Boolean)
    )
  );

  return {
    examTitle: analyses[0].examTitle,
    subject: analyses.find(a => a.subject)?.subject,
    detectedStudentName: detectedName,
    rawText: analyses.map(a => a.rawText).filter(Boolean).join('\n---\n'),
    overallScore: declaredOverallScore ?? analyses[0].overallScore,
    maxScore: declaredMaxScore ?? analyses[0].maxScore,
    gradeText,
    adviceSummary: combinedAdvice,
    programRecommendations: combinedProgramRecommendations,
    questions: mergedQuestions
  };
}

function pickBestGradeText(gradeTexts: Array<string | undefined>): string | undefined {
  const cleaned = gradeTexts
    .map(text => text?.trim())
    .filter((text): text is string => Boolean(text));

  if (cleaned.length === 0) {
    return undefined;
  }

  let bestText = cleaned[0];
  let bestScore = scoreGradeCandidate(bestText);

  for (let index = 1; index < cleaned.length; index += 1) {
    const candidate = cleaned[index];
    const candidateScore = scoreGradeCandidate(candidate);
    if (candidateScore > bestScore) {
      bestText = candidate;
      bestScore = candidateScore;
    }
  }

  return bestText;
}

function scoreGradeCandidate(text: string): number {
  const normalized = text.toLowerCase();
  let score = 0;

  if (/(?:\/|\bsur\b)\s*20\b/.test(normalized)) {
    score += 4;
  }

  if (/(?:\/|\bsur\b)\s*\d+/.test(normalized)) {
    score += 2;
  }

  if (/\d+\s*%/.test(normalized)) {
    score += 1.5;
  }

  if (/\bnote\b/.test(normalized) || /\btotal\b/.test(normalized)) {
    score += 1;
  }

  if (/[0-9]/.test(normalized)) {
    score += 0.5;
  }

  return score;
}

async function processInParallel<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const currentIndex = cursor++;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await handler(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

