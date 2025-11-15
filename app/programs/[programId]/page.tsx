"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program, Lesson } from '@/types';

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgram();
  }, [programId]);

  const fetchProgram = async () => {
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
  };

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

      {/* Lessons as circles */}
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
            {lessons.map((lesson) => (
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

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedLesson.title}</h2>
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-600">
                  {selectedLesson.description || 'No description'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Files
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-400 mb-2">Upload documents</div>
                  <div className="text-sm text-gray-500">PDF, Word, etc.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
