import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

type StudentRouteParams = Promise<{ studentId: string }>;

async function assertTeacherCanAccessStudent(studentId: string, teacherId: string) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      class: {
        teacherId
      }
    }
  });

  if (!student) {
    throw new Error('STUDENT_NOT_FOUND_OR_UNAUTHORIZED');
  }
}

export async function GET(
  request: NextRequest,
  context: { params: StudentRouteParams }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const { studentId } = await context.params;
    try {
      await assertTeacherCanAccessStudent(studentId, teacher.teacherId);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        message: 'Élève introuvable ou accès refusé.'
      }), { status: 404 });
    }

    const comments = await prisma.studentComment.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: comments
    }), { status: 200 });
  } catch (error) {
    console.error('Get student comments error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch comments'
    }), { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: StudentRouteParams }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const { studentId } = await context.params;
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Le commentaire ne peut pas être vide.'
      }), { status: 400 });
    }

    await assertTeacherCanAccessStudent(studentId, teacher.teacherId);

    const comment = await prisma.studentComment.create({
      data: {
        studentId,
        teacherId: teacher.teacherId,
        content: content.trim()
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: comment,
      message: 'Commentaire enregistré.'
    }), { status: 201 });
  } catch (error) {
    console.error('Create student comment error:', error);
    const message =
      error instanceof Error && error.message === 'STUDENT_NOT_FOUND_OR_UNAUTHORIZED'
        ? 'Élève introuvable ou accès refusé.'
        : 'Failed to create comment';

    return new Response(JSON.stringify({
      success: false,
      message
    }), { status: error instanceof Error && error.message === 'STUDENT_NOT_FOUND_OR_UNAUTHORIZED' ? 404 : 500 });
  }
}

