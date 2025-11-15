import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeacherFromRequest } from '@/lib/auth';

// POST /api/lessons - Create new lesson
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
    const { programId, title, description, orderIndex, testData } = body;

    if (!programId || !title || title.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program ID and lesson title are required'
      }), { status: 400 });
    }

    // Verify program ownership
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        teacherId: teacher.teacherId
      }
    });

    if (!program) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Program not found or access denied'
      }), { status: 404 });
    }

    // Get next order index if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrder = await prisma.lesson.findFirst({
        where: { programId },
        select: { orderIndex: true },
        orderBy: { orderIndex: 'desc' }
      });
      finalOrderIndex = (maxOrder?.orderIndex || 0) + 1;
    }

    const lesson = await prisma.lesson.create({
      data: {
        programId,
        title: title.trim(),
        description: description?.trim() || null,
        orderIndex: finalOrderIndex,
        testData: testData?.trim() || null
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: lesson,
      message: 'Lesson created successfully'
    }), { status: 201 });

  } catch (error) {
    console.error('Create lesson error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create lesson'
    }), { status: 500 });
  }
}