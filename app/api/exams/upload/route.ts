import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';
import {
  analyzeAndGradeExamImage,
  generateStudentAnalysisFromLLM,
  StudentAnalysisOutput,
  StudentForAnalysis
} from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
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
      studentId,
      classId,
      providedStudentName
    }: {
      lessonId?: string;
      imageUrl?: string;
      imageDataUrl?: string;
      studentId?: string;
      classId?: string;
      providedStudentName?: string;
    } = body;

    if (!lessonId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lesson ID is required'
        }),
        { status: 400 }
      );
    }

    const imageSource = imageUrl || imageDataUrl;

    if (!imageSource) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Provide either imageUrl or imageDataUrl for the exam photo'
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
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lesson not found or access denied'
        }),
        { status: 404 }
      );
    }

    const examAnalysis = await analyzeAndGradeExamImage({
      imageUrl: imageSource,
      lessonTitle: lesson.title,
      providedStudentName
    });

    let student;
    try {
      student = await resolveStudent({
        teacherId: teacher.teacherId,
        studentId,
        possibleName: providedStudentName || examAnalysis.detectedStudentName,
        classId
      });
    } catch (studentError) {
      const errorMessage = mapStudentResolutionError(
        studentError instanceof Error ? studentError.message : undefined
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage
        }),
        { status: 400 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        lessonId: lesson.id,
        title: examAnalysis.examTitle || `${lesson.title} Assessment`,
        description: examAnalysis.subject || null,
        sourceImageUrl: imageSource,
        extractedData: {
          rawText: examAnalysis.rawText,
          questions: examAnalysis.questions
        }
      }
    });

    const studentAssessment = await prisma.studentAssessment.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        detectedStudentName: examAnalysis.detectedStudentName,
        overallScore: examAnalysis.overallScore ?? null,
        maxScore: examAnalysis.maxScore ?? null,
        gradedResponses: examAnalysis.questions
      }
    });

    await upsertStudentLessonStatus({
      studentId: student.id,
      lessonId: lesson.id,
      examAnalysis
    });

    const summaries = await regenerateStudentSummaries(student.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          assessment,
          studentAssessment,
          summaries
        },
        message: 'Exam processed successfully'
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Exam upload error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to process exam upload'
      }),
      { status: 500 }
    );
  }
}

async function resolveStudent(params: {
  teacherId: string;
  studentId?: string;
  possibleName?: string;
  classId?: string;
}) {
  const { teacherId, studentId, possibleName, classId } = params;

  if (studentId) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        class: { teacherId }
      }
    });

    if (!existingStudent) {
      throw new Error('STUDENT_NOT_FOUND_OR_UNAUTHORIZED');
    }

    return existingStudent;
  }

  if (possibleName) {
    const matchedStudent = await prisma.student.findFirst({
      where: {
        name: {
          equals: possibleName,
          mode: 'insensitive'
        },
        class: {
          teacherId
        }
      }
    });

    if (matchedStudent) {
      return matchedStudent;
    }
  }

  if (!classId) {
    throw new Error('STUDENT_NOT_FOUND_AND_NO_CLASS');
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

  if (!possibleName) {
    throw new Error('MISSING_STUDENT_NAME_FOR_CREATION');
  }

  return prisma.student.create({
    data: {
      classId: classRecord.id,
      name: possibleName.trim()
    }
  });
}

function mapStudentResolutionError(code?: string) {
  switch (code) {
    case 'STUDENT_NOT_FOUND_OR_UNAUTHORIZED':
      return 'Student not found or you do not have access to this student.';
    case 'STUDENT_NOT_FOUND_AND_NO_CLASS':
      return 'No matching student found. Please specify a classId to create one.';
    case 'CLASS_NOT_FOUND_OR_UNAUTHORIZED':
      return 'Class not found or you do not have access to this class.';
    case 'MISSING_STUDENT_NAME_FOR_CREATION':
      return 'Please provide studentName so a new student can be created.';
    default:
      return 'Unable to resolve student for this exam upload.';
  }
}

async function upsertStudentLessonStatus(params: {
  studentId: string;
  lessonId: string;
  examAnalysis: Awaited<ReturnType<typeof analyzeAndGradeExamImage>>;
}) {
  const { studentId, lessonId, examAnalysis } = params;

  const totalScore =
    typeof examAnalysis.overallScore === 'number' ? examAnalysis.overallScore : undefined;
  const maxScore =
    typeof examAnalysis.maxScore === 'number' && examAnalysis.maxScore > 0
      ? examAnalysis.maxScore
      : undefined;
  const percent = typeof totalScore === 'number' && typeof maxScore === 'number'
    ? totalScore / maxScore
    : undefined;

  const masteryLevel = (() => {
    if (!percent && percent !== 0) return 'in_progress';
    if (percent >= 0.85) return 'mastered';
    if (percent >= 0.7) return 'completed';
    if (percent >= 0.4) return 'in_progress';
    return 'not_started';
  })();

  const incorrectNotes = examAnalysis.questions
    .filter(q => (q.pointsAwarded ?? q.pointsPossible ?? 0) < (q.pointsPossible ?? 0))
    .map(
      q =>
        `Q${q.number}: ${
          q.feedback ||
          'Needs review. Correct answer: ' + (q.correctAnswer || 'See reference solution.')
        }`
    )
    .join(' | ');

  const statusNotes = [
    `Auto-generated from exam upload on ${new Date().toLocaleDateString()}.`,
    incorrectNotes || 'All questions answered correctly.'
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
      })) ?? []
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

