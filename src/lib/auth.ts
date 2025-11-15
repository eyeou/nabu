import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function findTeacherByEmail(email: string) {
  return prisma.teacher.findUnique({ where: { email } });
}

export async function createTeacher(data: {
  email: string;
  password: string;
  name: string;
}) {
  const hashed = await hashPassword(data.password);
  return prisma.teacher.create({
    data: {
      email: data.email,
      passwordHash: hashed,
      name: data.name,
    },
  });
}

export function generateMockToken(teacherId: string) {
  return Buffer.from(`${teacherId}:${Date.now()}`).toString("base64");
}
