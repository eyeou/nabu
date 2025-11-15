import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createToken, isValidEmail, isValidPassword, createAuthResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Email, password, and name are required'
      }), { status: 400 });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Please provide a valid email address'
      }), { status: 400 });
    }

    if (!isValidPassword(password)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Password must be at least 8 characters with letters and numbers'
      }), { status: 400 });
    }

    // Check if teacher already exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { email }
    });

    if (existingTeacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'An account with this email already exists'
      }), { status: 409 });
    }

    // Hash password and create teacher
    const passwordHash = await hashPassword(password);
    const teacher = await prisma.teacher.create({
      data: {
        email,
        passwordHash,
        name,
      }
    });

    // Create JWT token
    const token = await createToken({
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt
    });

    // Return success response with cookie
    return createAuthResponse({
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt
    }, token);

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), { status: 500 });
  }
}