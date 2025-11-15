import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// POST /api/students - Create new student
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
    const { classId, name, age, avatarUrl } = body;

    if (!classId || !name || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class ID and student name are required'
      }), { status: 400 });
    }

    // Verify class ownership
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.teacherId
      }
    });

    if (!classData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class not found or access denied'
      }), { status: 404 });
    }

    const student = await prisma.student.create({
      data: {
        classId,
        name: name.trim(),
        age: age || null,
        avatarUrl: avatarUrl || null
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: student,
      message: 'Student created successfully'
    }), { status: 201 });

  } catch (error) {
    console.error('Create student error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create student'
    }), { status: 500 });
  }
}