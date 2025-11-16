import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';
import { normalizePerformanceLevel } from '@/lib/student-level';

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
    const { name, age, avatarUrl, performanceLevel } = body;

    let normalizedName: string | undefined;
    if (typeof name !== 'undefined') {
      if (typeof name !== 'string') {
        return new Response(JSON.stringify({
          success: false,
          message: 'Student name must be a string'
        }), { status: 400 });
      }

      if (name.trim().length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Student name cannot be empty'
        }), { status: 400 });
      }

      normalizedName = name.trim();
    }

    let normalizedPerformanceLevel: number | undefined;
    try {
      normalizedPerformanceLevel = normalizePerformanceLevel(performanceLevel);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        message: 'Le niveau doit être un entier entre 1 et 5.'
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

    const data: Prisma.StudentUpdateInput = {};

    if (typeof normalizedName !== 'undefined') {
      data.name = normalizedName;
    }
    if (typeof age !== 'undefined') {
      data.age = age ?? null;
    }
    if (typeof avatarUrl !== 'undefined') {
      data.avatarUrl = avatarUrl || null;
    }
    if (typeof normalizedPerformanceLevel !== 'undefined') {
      data.performanceLevel = normalizedPerformanceLevel;
    }

    if (Object.keys(data).length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Aucune donnée à mettre à jour.'
      }), { status: 400 });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data
    });

    return new Response(JSON.stringify({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Update student error:', error);
    let message =
      error instanceof Error ? error.message : 'Failed to update student';

    if (
      message.includes('Unknown argument `performanceLevel`') ||
      message.includes('Unknown column') ||
      message.includes('column "performanceLevel"')
    ) {
      message =
        'Votre base ou Prisma Client est en retard. Lancez `npx prisma migrate deploy` (ou `prisma migrate dev`) puis `npx prisma generate`, redémarrez le serveur et réessayez.';
    }

    return new Response(JSON.stringify({
      success: false,
      message
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