import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { Teacher } from '@/types';
import bcrypt from 'bcryptjs';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
);

export interface JWTPayload {
  teacherId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createToken(teacher: Omit<Teacher, 'passwordHash'>): Promise<string> {
  return new SignJWT({
    teacherId: teacher.id,
    email: teacher.email,
    name: teacher.name,
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Get teacher from request
export async function getTeacherFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch (error) {
    console.error('Failed to get teacher from request:', error);
    return null;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): boolean {
  // At least 8 characters, one letter, one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

// Create response with auth token
export function createAuthResponse(teacher: Omit<Teacher, 'passwordHash'>, token: string) {
  const response = new Response(JSON.stringify({
    success: true,
    teacher,
    message: 'Authentication successful'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Set HTTP-only cookie for browser requests
  response.headers.set('Set-Cookie', [
    `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`,
    `teacher-id=${teacher.id}; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`
  ].join(', '));

  return response;
}