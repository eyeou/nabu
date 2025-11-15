import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, isValidEmail, createAuthResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Email and password are required'
      }), { status: 400 });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Please provide a valid email address'
      }), { status: 400 });
    }

    // Find teacher
    const teacher = await prisma.teacher.findUnique({
      where: { email }
    });

    if (!teacher) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid email or password'
      }), { status: 401 });
    }

    // Verify password
    const isValidPasswordValue = await verifyPassword(password, teacher.passwordHash);
    if (!isValidPasswordValue) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid email or password'
      }), { status: 401 });
    }

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
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), { status: 500 });
  }
}