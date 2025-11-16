"use client";

import { useState, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program, Lesson, Class, StudentSummary } from '@/types';

interface ClassWithStudents extends Class {
  students?: { id: string; name: string; age?: number; avatarUrl?: string | null }[];
}

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<ClassWithStudents[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [examPreviewUrls, setExamPreviewUrls] = useState<string[]>([]);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedSummaries, setGeneratedSummaries] = useState<StudentSummary[]>([]);

  const fetchProgram = useCallback(async () => {
    try {
      const response = await fetch(`/api/programs/${programId}`);
      const data = await response.json();

      if (data.success) {
        setProgram(data.data);
        setLessons(data.data.lessons || []);
      }
    } catch (error) {
      console.error('Failed to fetch program:', error);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();

      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateLesson = async () => {
    const lessonTitle = prompt('Lesson name:');
    if (!lessonTitle) return;

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          title: lessonTitle,
          description: '',
          orderIndex: lessons.length
        })
      });

      const data = await response.json();
      if (data.success) {
        setLessons([...lessons, data.data]);
      }
    } catch (error) {
      console.error('Failed to create lesson:', error);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setUploadMessage(null);
    setGeneratedSummaries([]);
  };

  const handleClassChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(event.target.value);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setExamFiles(files);
    setUploadMessage(null);
    setGeneratedSummaries([]);

    const previews = files.map(file => URL.createObjectURL(file));
    setExamPreviewUrls(previews);
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExamUpload = async () => {
    if (!selectedLesson) {
      setUploadMessage({ type: 'error', text: 'Please select a lesson first.' });
      return;
    }

    if (examFiles.length === 0) {
      setUploadMessage({ type: 'error', text: 'Please choose at least one photo of the exam.' });
      return;
    }

    if (!selectedClassId) {
      setUploadMessage({
        type: 'error',
        text: 'Please select a class. The AI will automatically detect student names from the exams.'
      });
      return;
    }

    setUploadingExam(true);
    setUploadMessage(null);

    try {
      const imageDataUrls = await Promise.all(examFiles.map(fileToDataUrl));
      const response = await fetch('/api/exams/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          imageDataUrls,
          classId: selectedClassId
        })
      });

      const data = await response.json();

      if (data.success) {
        setUploadMessage({ type: 'success', text: data.message || 'Exam processed successfully! AI detected student and generated feedback.' });
        setGeneratedSummaries(data.data?.summaries || []);
        setExamFiles([]);
        setExamPreviewUrls([]);
      } else {
        setUploadMessage({ type: 'error', text: data.message || 'Failed to process exam.' });
      }
    } catch (error) {
      console.error('Upload exam photo failed:', error);
      setUploadMessage({ type: 'error', text: 'Unexpected error while uploading exam.' });
    } finally {
      setUploadingExam(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Program not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/dashboard?view=programs')}
                className="text-gray-500 hover:text-gray-700 mb-2 text-sm"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{program.title}</h1>
            </div>
            <button
              onClick={handleCreateLesson}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              + New Lesson
            </button>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="container mx-auto px-8 py-12">
        {lessons.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No lessons yet</div>
            <button
              onClick={handleCreateLesson}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create First Lesson
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {lessons.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => handleLessonClick(lesson)}
                className="flex flex-col items-center group"
              >
                <div className="w-24 h-24 rounded-full bg-blue-400 hover:bg-blue-500 transition-all duration-300 group-hover:scale-110 shadow-lg flex items-center justify-center text-white font-bold text-lg">
                  {lesson.orderIndex + 1}
                </div>
                <div className="mt-3 text-sm text-gray-700 text-center font-medium">
                  {lesson.title}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lesson detail + upload modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs uppercase text-gray-400">Lesson</p>
                <h2 className="text-2xl font-bold text-gray-800">{selectedLesson.title}</h2>
              </div>
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-gray-600">
                  {selectedLesson.description?.trim() || 'No description yet.'}
                </p>
              </div>

              {/* Previous Tests Section */}
              <div className="border rounded-xl p-5 space-y-4 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Previous Tests</h3>
                  <p className="text-sm text-gray-500">
                    View previously uploaded exam files for this lesson
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  📁 No previous tests uploaded yet
                </div>
              </div>

              <div className="border rounded-xl p-5 space-y-4 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Upload Student Exams</h3>
                  <p className="text-sm text-gray-500">
                    Upload multiple exam papers. The AI will automatically detect each student&apos;s name, 
                    grade the exam, and generate personalized feedback for each student.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={handleClassChange}
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">
                        {classesLoading ? 'Loading classes...' : 'Select a class'}
                      </option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Select the class these exams belong to. The AI will match students automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exam Photos <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-3 text-center w-full">
                      <div className="w-full">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="text-sm w-full"
                        />
                      </div>
                      {examPreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {examPreviewUrls.map((url, index) => (
                            <img
                              key={url}
                              src={url}
                              alt={`Exam preview ${index + 1}`}
                              className="max-h-32 rounded-lg border object-contain w-full"
                            />
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📸 Upload multiple exam papers (JPG / PNG / HEIC)</p>
                        <p>🤖 AI will automatically detect student names from each paper</p>
                        <p>📊 Each student will receive personalized feedback</p>
                      </div>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div
                      className={`text-sm font-medium px-4 py-2 rounded-lg ${
                        uploadMessage.type === 'success'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {uploadMessage.text}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleExamUpload}
                      disabled={uploadingExam}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      {uploadingExam ? 'Analyzing...' : 'Upload & analyze'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
