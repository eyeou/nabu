export interface Teacher {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Program {
  id: string;
  teacherId: string;
  title: string;
  description?: string | null;
}

export interface Lesson {
  id: string;
  programId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  testData?: string | null;
}

export interface LessonLink {
  id: string;
  fromLessonId: string;
  toLessonId: string;
  relationType: string;
}

export interface Class {
  id: string;
  teacherId: string;
  name: string;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  age: number;
  avatarUrl?: string | null;
}

export type MasteryLevel = "NOT_STARTED" | "EMERGING" | "PROFICIENT" | "MASTERED";

export interface StudentLessonStatus {
  id: string;
  studentId: string;
  lessonId: string;
  masteryLevel: MasteryLevel;
  notes?: string | null;
}

export interface StudentSummary {
  id: string;
  studentId: string;
  subject: string;
  bulletPointsJson: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

export interface ProgramPayload {
  title: string;
  description?: string;
}

export interface LessonPayload {
  programId: string;
  title: string;
  description?: string;
  orderIndex?: number;
  testData?: string;
}

export interface LessonLinkPayload {
  fromLessonId: string;
  toLessonId: string;
  relationType: string;
}

export interface ClassPayload {
  teacherId: string;
  name: string;
}

export interface StudentPayload {
  classId: string;
  name: string;
  age: number;
  avatarUrl?: string;
}

export interface StudentSummaryPayload {
  studentId: string;
  subject: string;
  bulletPoints: string[];
}
