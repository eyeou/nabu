import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// PUT /api/lessons/[lessonId] - Update lesson
export async function PUT(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const body = await request.json();
    const { title, description, testData, orderIndex } = body;

    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Lesson title is required'
      }), { status: 400 });
    }

    // Verify lesson exists and teacher owns the program
    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId },
      include: {
        program: {
          select: { teacherId: true }
        }
      }
    });

    if (!lesson || lesson.program.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Lesson not found or access denied'
      }), { status: 404 });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: params.lessonId },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        testData: testData?.trim() || null,
        ...(orderIndex !== undefined && { orderIndex })
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: updatedLesson,
      message: 'Lesson updated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Update lesson error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update lesson'
    }), { status: 500 });
  }
}

// DELETE /api/lessons/[lessonId] - Delete lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    // Verify lesson exists and teacher owns the program
    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId },
      include: {
        program: {
          select: { teacherId: true }
        }
      }
    });

    if (!lesson || lesson.program.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Lesson not found or access denied'
      }), { status: 404 });
    }

    await prisma.lesson.delete({
      where: { id: params.lessonId }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Lesson deleted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Delete lesson error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete lesson'
    }), { status: 500 });
  }
}