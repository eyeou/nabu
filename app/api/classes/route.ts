import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// GET /api/classes - Fetch all classes for authenticated teacher
export async function GET(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacher.teacherId
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: classes
    }), { status: 200 });

  } catch (error) {
    console.error('Get classes error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch classes'
    }), { status: 500 });
  }
}

// POST /api/classes - Create new class
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
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Class name is required'
      }), { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name: name.trim(),
        teacherId: teacher.teacherId
      },
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
      data: newClass,
      message: 'Class created successfully'
    }), { status: 201 });

  } catch (error) {
    console.error('Create class error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create class'
    }), { status: 500 });
  }
}