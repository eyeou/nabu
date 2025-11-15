import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';
import { generateStudentAnalysisFromLLM, StudentForAnalysis } from '@/lib/ai';

// POST /api/summaries/generate - Generate AI student summary using LLM
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
    const { studentId } = body;

    if (!studentId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Student ID is required'
        }),
        { status: 400 }
      );
    }

    // Verify student exists and teacher has access
    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        class: {
          select: { teacherId: true, name: true }
        },
        lessonStatuses: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                testData: true
              }
            }
          }
        }
      }
    });

    if (!student || student.class.teacherId !== teacher.teacherId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Student not found or access denied'
        }),
        { status: 404 }
      );
    }

    // Shape data for the LLM helper
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
          lessonTitle: ls.lesson?.title || 'Unknown lesson',
          masteryLevel: ls.masteryLevel,
          score: ls.score ?? undefined,
          notes: ls.notes ?? null,
          updatedAt: ls.updatedAt?.toISOString()
        })) ?? []
    };

    // Call LLM (Blackbox / GPT) to generate structured analysis
    const analysis = await generateStudentAnalysisFromLLM(studentForAnalysis);

    // Save summaries to database
    const summariesToUpsert = [
      { subject: 'strengths', bulletPoints: analysis.strengths },
      { subject: 'weaknesses', bulletPoints: analysis.weaknesses },
      { subject: 'recommendations', bulletPoints: analysis.recommendations }
    ];

    const summaryPromises = summariesToUpsert.map(({ subject, bulletPoints }) =>
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
    );

    const summaries = await Promise.all(summaryPromises);

    return new Response(
      JSON.stringify({
        success: true,
        data: summaries,
        message: 'Student summaries generated successfully'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Generate summary error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to generate student summaries'
      }),
      { status: 500 }
    );
  }
}