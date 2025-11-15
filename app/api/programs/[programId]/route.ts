import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// GET /api/programs/[programId] - Fetch specific program with lessons and links
export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const program = await prisma.program.findFirst({
      where: {
        id: params.programId,
        teacherId: teacher.teacherId
      },
      include: {
        lessons: {
          include: {
            fromLinks: {
              include: {
                toLesson: {
                  select: { id: true, title: true }
                }
              }
            },
            toLinks: {
              include: {
                fromLesson: {
                  select: { id: true, title: true }
                }
              }
            }
          },
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    if (!program) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program not found or access denied'
      }), { status: 404 });
    }

    // Get all lesson links for the program
    const lessonIds = program.lessons.map(lesson => lesson.id);
    const links = await prisma.lessonLink.findMany({
      where: {
        OR: [
          { fromLessonId: { in: lessonIds } },
          { toLessonId: { in: lessonIds } }
        ]
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...program,
        links
      }
    }), { status: 200 });

  } catch (error) {
    console.error('Get program error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch program'
    }), { status: 500 });
  }
}

// PUT /api/programs/[programId] - Update program
export async function PUT(
  request: NextRequest,
  { params }: { params: { programId: string } }
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
    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program title is required'
      }), { status: 400 });
    }

    const program = await prisma.program.updateMany({
      where: {
        id: params.programId,
        teacherId: teacher.teacherId
      },
      data: {
        title: title.trim(),
        description: description?.trim() || null
      }
    });

    if (program.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program not found or access denied'
      }), { status: 404 });
    }

    // Fetch updated program
    const updatedProgram = await prisma.program.findUnique({
      where: { id: params.programId },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            orderIndex: true
          }
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: updatedProgram,
      message: 'Program updated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Update program error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update program'
    }), { status: 500 });
  }
}

// DELETE /api/programs/[programId] - Delete program
export async function DELETE(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const result = await prisma.program.deleteMany({
      where: {
        id: params.programId,
        teacherId: teacher.teacherId
      }
    });

    if (result.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program not found or access denied'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Program deleted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Delete program error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete program'
    }), { status: 500 });
  }
}