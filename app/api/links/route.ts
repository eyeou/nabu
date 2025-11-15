import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// POST /api/links - Create lesson link
export async function POST(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const body = await request.json();
    const { fromLessonId, toLessonId, relationType } = body;

    if (!fromLessonId || !toLessonId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Both fromLessonId and toLessonId are required'
      }), { status: 400 });
    }

    if (fromLessonId === toLessonId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'A lesson cannot be linked to itself'
      }), { status: 400 });
    }

    // Verify both lessons exist and belong to programs owned by the teacher
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: [fromLessonId, toLessonId] }
      },
      include: {
        program: {
          select: { teacherId: true }
        }
      }
    });

    if (lessons.length !== 2) {
      return new Response(JSON.stringify({
        success: false,
        message: 'One or both lessons not found'
      }), { status: 404 });
    }

    const invalidLesson = lessons.find(lesson => lesson.program.teacherId !== teacher.teacherId);
    if (invalidLesson) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Access denied to one or more lessons'
      }), { status: 403 });
    }

    // Check if link already exists
    const existingLink = await prisma.lessonLink.findFirst({
      where: {
        fromLessonId,
        toLessonId
      }
    });

    if (existingLink) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Link between these lessons already exists'
      }), { status: 409 });
    }

    const link = await prisma.lessonLink.create({
      data: {
        fromLessonId,
        toLessonId,
        relationType: relationType || 'prerequisite'
      },
      include: {
        fromLesson: {
          select: { id: true, title: true }
        },
        toLesson: {
          select: { id: true, title: true }
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: link,
      message: 'Lesson link created successfully'
    }), { status: 201 });

  } catch (error) {
    console.error('Create link error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create lesson link'
    }), { status: 500 });
  }
}