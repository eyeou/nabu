import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// GET /api/programs - Fetch all programs for authenticated teacher
export async function GET(request: NextRequest) {
  try {
    const teacher = await getTeacherFromRequest(request);
    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), { status: 401 });
    }

    const programs = await prisma.program.findMany({
      where: {
        teacherId: teacher.teacherId
      },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            orderIndex: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: programs
    }), { status: 200 });

  } catch (error) {
    console.error('Get programs error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch programs'
    }), { status: 500 });
  }
}

// POST /api/programs - Create new program
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
    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program title is required'
      }), { status: 400 });
    }

    const program = await prisma.program.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        teacherId: teacher.teacherId
      },
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
      data: program,
      message: 'Program created successfully'
    }), { status: 201 });

  } catch (error) {
    console.error('Create program error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create program'
    }), { status: 500 });
  }
}