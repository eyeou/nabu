import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// GET /api/classes/[classId] - Fetch specific class with students
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const { classId } = params;

    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.teacherId
      },
      include: {
        students: {
          include: {
            summaries: {
              select: {
                id: true,
                subject: true,
                bulletPointsJson: true,
                updatedAt: true
              }
            },
            lessonStatuses: {
              include: {
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    programId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!classData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class not found or access denied'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      data: classData
    }), { status: 200 });

  } catch (error) {
    console.error('Get class error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch class'
    }), { status: 500 });
  }
}

// PUT /api/classes/[classId] - Update class
export async function PUT(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const { classId } = params;

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class name is required'
      }), { status: 400 });
    }

    const result = await prisma.class.updateMany({
      where: {
        id: classId,
        teacherId: teacher.teacherId
      },
      data: {
        name: name.trim()
      }
    });

    if (result.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class not found or access denied'
      }), { status: 404 });
    }

    // Fetch updated class
    const updatedClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true
          }
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Update class error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update class'
    }), { status: 500 });
  }
}

// DELETE /api/classes/[classId] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const { classId } = params;

    const result = await prisma.class.deleteMany({
      where: {
        id: classId,
        teacherId: teacher.teacherId
      }
    });

    if (result.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class not found or access denied'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Class deleted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Delete class error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete class'
    }), { status: 500 });
  }
}