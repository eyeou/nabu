import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export const programSchema = z.object({
  teacherId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
});

export const lessonSchema = z.object({
  programId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().int().optional(),
  testData: z.string().optional(),
});

export const lessonLinkSchema = z.object({
  fromLessonId: z.string().uuid(),
  toLessonId: z.string().uuid(),
  relationType: z.string().min(1),
});

export const classSchema = z.object({
  teacherId: z.string().uuid(),
  name: z.string().min(1),
});

export const studentSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  avatarUrl: z.string().url().optional(),
});

export const studentSummarySchema = z.object({
  studentId: z.string().uuid(),
  subject: z.string().min(1),
  bulletPoints: z.array(z.string().min(1)),
});
