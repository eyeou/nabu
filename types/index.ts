// Database model types
export interface Teacher {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  programs?: Program[];
  classes?: Class[];
  comments?: StudentComment[];
}

export interface Program {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  teacher?: Teacher;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  programId: string;
  title: string;
  description?: string;
  orderIndex: number;
  testData?: string;
  createdAt: Date;
  updatedAt: Date;
  program?: Program;
  fromLinks?: LessonLink[];
  toLinks?: LessonLink[];
  studentStatuses?: StudentLessonStatus[];
}

export interface LessonLink {
  id: string;
  fromLessonId: string;
  toLessonId: string;
  relationType: 'prerequisite' | 'related' | 'sequence';
  createdAt: Date;
  fromLesson?: Lesson;
  toLesson?: Lesson;
}

export interface Class {
  id: string;
  teacherId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  teacher?: Teacher;
  students?: Student[];
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  age?: number;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  class?: Class;
  lessonStatuses?: StudentLessonStatus[];
  summaries?: StudentSummary[];
  studentAssessments?: StudentAssessment[];
  comments?: StudentComment[];
}

export interface StudentLessonStatus {
  id: string;
  studentId: string;
  lessonId: string;
  masteryLevel: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  notes?: string;
  score?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  lesson?: Lesson;
}

export interface StudentSummary {
  id: string;
  studentId: string;
  subject: string;
  bulletPointsJson: string;
  generatedAt: Date;
  updatedAt: Date;
  student?: Student;
}

export interface StudentComment {
  id: string;
  studentId: string;
  teacherId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  teacher?: Teacher;
}

export interface Assessment {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  sourceImageUrl?: string;
  extractedData?: any;
  createdAt: Date;
  updatedAt: Date;
  lesson?: Lesson;
  studentAssessments?: StudentAssessment[];
}

export interface StudentAssessment {
  id: string;
  assessmentId: string;
  studentId: string;
  detectedStudentName?: string;
  overallScore?: number;
  maxScore?: number;
  gradedResponses?: any;
  createdAt: Date;
  updatedAt: Date;
  assessment?: Assessment;
  student?: Student;
}

// API Request/Response types
export interface CreateTeacherRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  teacher?: Omit<Teacher, 'passwordHash'>;
  token?: string;
  message?: string;
}

export interface CreateProgramRequest {
  title: string;
  description?: string;
}

export interface CreateLessonRequest {
  programId: string;
  title: string;
  description?: string;
  orderIndex?: number;
  testData?: string;
}

export interface CreateLessonLinkRequest {
  fromLessonId: string;
  toLessonId: string;
  relationType: 'prerequisite' | 'related' | 'sequence';
}

export interface CreateClassRequest {
  name: string;
}

export interface CreateStudentRequest {
  classId: string;
  name: string;
  age?: number;
  avatarUrl?: string;
}

export interface BulkCreateStudentsRequest {
  classId: string;
  students: Array<{
    name: string;
    age?: number;
  }>;
}

export interface ExtractStudentsRequest {
  imageUrls: string[];
}

export interface ExtractedStudentData {
  name: string;
  age?: number;
}

export interface StudentRegistryExtractionResult {
  students: ExtractedStudentData[];
  rawText?: string;
  detectedFormat?: string;
}

export interface UpdateStudentStatusRequest {
  studentId: string;
  lessonId: string;
  masteryLevel: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  notes?: string;
  score?: number;
}

// UI Component types
export interface CircleNodeProps {
  id: string;
  title: string;
  type: 'lesson' | 'student';
  status?: string;
  onClick?: () => void;
  className?: string;
}

export interface LessonEditorProps {
  lesson: Lesson;
  onSave: (lesson: Partial<Lesson>) => void;
  onClose: () => void;
}

export interface ProgramGraphProps {
  lessons: Lesson[];
  links: LessonLink[];
  onLessonClick?: (lesson: Lesson) => void;
  onCreateLink?: (fromId: string, toId: string) => void;
  studentStatuses?: StudentLessonStatus[];
}

export interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

export interface AISummaryBoxProps {
  summaries: StudentSummary[];
  loading?: boolean;
}

// Utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Chart data for student progress
export interface ProgressChartData {
  lessonId: string;
  lessonTitle: string;
  masteryLevel: string;
  score?: number;
  completedAt?: Date;
}