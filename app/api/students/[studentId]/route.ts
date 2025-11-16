import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

type StudentRouteParams = Promise<{ studentId: string }>;

// GET /api/students/[studentId] - Fetch specific student with progress
export async function GET(
  request: NextRequest,
  context: { params: StudentRouteParams }
) {
  try {
    const { studentId } = await context.params;
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            teacherId: true
          }
        },
        summaries: {
          orderBy: {
            updatedAt: 'desc'
          }
        },
        comments: {
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
        },
        lessonStatuses: {
          include: {
            lesson: {
              include: {
                program: {
                  select: {
                    id: true,
                    title: true,
                    teacherId: true
                  }
                }
              }
            }
          }
        },
        studentAssessments: {
          include: {
            assessment: {
              select: {
                id: true,
                title: true,
                lesson: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!student || student.class.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student not found or access denied'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      data: student
    }), { status: 200 });

  } catch (error) {
    console.error('Get student error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch student'
    }), { status: 500 });
  }
}

// PUT /api/students/[studentId] - Update student
export async function PUT(
  request: NextRequest,
  context: { params: StudentRouteParams }
) {
  try {
    const { studentId } = await context.params;
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const body = await request.json();
    const { name, age, avatarUrl } = body;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student name is required'
      }), { status: 400 });
    }

    // Verify student exists and teacher has access
    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        class: {
          select: { teacherId: true }
        }
      }
    });

    if (!student || student.class.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student not found or access denied'
      }), { status: 404 });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: name.trim(),
        age: age || null,
        avatarUrl: avatarUrl || null
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Update student error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update student'
    }), { status: 500 });
  }
}

// DELETE /api/students/[studentId] - Delete student
export async function DELETE(
  request: NextRequest,
  context: { params: StudentRouteParams }
) {
  try {
    const { studentId } = await context.params;
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    // Verify student exists and teacher has access
    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        class: {
          select: { teacherId: true }
        }
      }
    });

    if (!student || student.class.teacherId !== teacher.teacherId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Student not found or access denied'
      }), { status: 404 });
    }

    await prisma.student.delete({
      where: { id: studentId }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Student deleted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Delete student error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete student'
    }), { status: 500 });
  }
}