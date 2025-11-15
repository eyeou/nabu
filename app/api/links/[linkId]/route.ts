import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// DELETE /api/links/[linkId] - Delete lesson link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    // Verify link exists and teacher owns both lessons
    const link = await prisma.lessonLink.findFirst({
      where: { id: params.linkId },
      include: {
        fromLesson: {
          include: {
            program: {
              select: { teacherId: true }
            }
          }
        },
        toLesson: {
          include: {
            program: {
              select: { teacherId: true }
            }
          }
        }
      }
    });

    if (!link) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Link not found'
      }), { status: 404 });
    }

    if (
      link.fromLesson.program.teacherId !== teacher.teacherId ||
      link.toLesson.program.teacherId !== teacher.teacherId
    ) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Access denied'
      }), { status: 403 });
    }

    await prisma.lessonLink.delete({
      where: { id: params.linkId }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Lesson link deleted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Delete link error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete lesson link'
    }), { status: 500 });
  }
}