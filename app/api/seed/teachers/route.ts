import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

const fakeTeachers = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@naboo.edu',
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@naboo.edu',
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@naboo.edu',
  },
  {
    name: 'David Kim',
    email: 'david.kim@naboo.edu',
  },
  {
    name: 'Jessica Williams',
    email: 'jessica.williams@naboo.edu',
  },
  {
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@naboo.edu',
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@naboo.edu',
  },
  {
    name: 'James Thompson',
    email: 'james.thompson@naboo.edu',
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@naboo.edu',
  },
  {
    name: 'Robert Anderson',
    email: 'robert.anderson@naboo.edu',
  },
  {
    name: 'Lisa Zhang',
    email: 'lisa.zhang@naboo.edu',
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@naboo.edu',
  },
  {
    name: 'Aisha Okafor',
    email: 'aisha.okafor@naboo.edu',
  },
  {
    name: 'Daniel O\'Connor',
    email: 'daniel.oconnor@naboo.edu',
  },
  {
    name: 'Fatima Al-Rashid',
    email: 'fatima.alrashid@naboo.edu',
  }
];

export async function POST(request: NextRequest) {
  try {
    // Check if teachers already exist
    const existingTeachers = await prisma.teacher.findMany();
    if (existingTeachers.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `Found ${existingTeachers.length} existing teachers. Seeding skipped to avoid duplicates.`,
        existingCount: existingTeachers.length
      }), { status: 409 });
    }

    // Hash the default password for all fake teachers
    const defaultPassword = 'password123';
    const hashedPassword = await hashPassword(defaultPassword);

    // Create fake teachers
    const createdTeachers = [];
    const errors = [];

    for (const teacherData of fakeTeachers) {
      try {
        const teacher = await prisma.teacher.create({
          data: {
            name: teacherData.name,
            email: teacherData.email,
            passwordHash: hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        });
        createdTeachers.push(teacher);
      } catch (error) {
        errors.push({
          teacher: teacherData.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully created ${createdTeachers.length} fake teacher profiles`,
      data: {
        created: createdTeachers,
        errors: errors,
        defaultPassword: 'password123',
        totalCreated: createdTeachers.length,
        totalErrors: errors.length
      }
    }), { 
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Teacher seeding error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during teacher seeding',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

export async function GET() {
  try {
    // Get current teacher count and list
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Found ${teachers.length} teachers in database`,
      data: {
        teachers: teachers,
        count: teachers.length,
        defaultPassword: 'password123'
      }
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching teachers:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error while fetching teachers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}