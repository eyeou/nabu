import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';
import { DEFAULT_PERFORMANCE_LEVEL, normalizePerformanceLevel } from '@/lib/student-level';

export interface BulkStudentInput {
  name: string;
  age?: number;
  performanceLevel?: number;
}

// POST /api/students/bulk - Create multiple students at once
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
    const { classId, students } = body as {
      classId: string;
      students: BulkStudentInput[];
    };

    if (!classId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Class ID is required'
        }),
        { status: 400 }
      );
    }

    if (!Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Students array is required and must not be empty'
        }),
        { status: 400 }
      );
    }

    // Verify class ownership
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.teacherId
      }
    });

    if (!classData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Class not found or access denied'
        }),
        { status: 404 }
      );
    }

    // Validate all students have names
    const invalidStudents = students.filter(
      (student) => !student.name || student.name.trim().length === 0
    );

    if (invalidStudents.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'All students must have a name'
        }),
        { status: 400 }
      );
    }

    let studentsWithLevels: Array<{ student: BulkStudentInput; normalizedLevel: number }>;
    try {
      studentsWithLevels = students.map((student) => {
        const normalizedLevel =
          normalizePerformanceLevel(student.performanceLevel) ?? DEFAULT_PERFORMANCE_LEVEL;
        return { student, normalizedLevel };
      });
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Chaque niveau doit être un entier entre 1 et 5.'
        }),
        { status: 400 }
      );
    }

    // Create all students in a transaction
    const createdStudents = await prisma.$transaction(
      studentsWithLevels.map(({ student, normalizedLevel }) =>
        prisma.student.create({
          data: {
            classId,
            name: student.name.trim(),
            age: student.age || null,
            avatarUrl: null,
            performanceLevel: normalizedLevel
          }
        })
      )
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: createdStudents,
        message: `Successfully created ${createdStudents.length} student${createdStudents.length > 1 ? 's' : ''}`
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Bulk create students error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to create students'
      }),
      { status: 500 }
    );
  }
}
