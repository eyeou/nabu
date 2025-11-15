"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ProgramGraph from '@/components/ProgramGraph';
import LessonEditor from '@/components/LessonEditor';
import { Program, Lesson, LessonLink } from '@/types';

export default function ProgramBuilderPage() {
  const params = useParams();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [links, setLinks] = useState<LessonLink[]>([]);
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
        setLinks(data.data.links || []);
      }
    } catch (error) {
      console.error('Failed to fetch program:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    try {
      const lessonTitle = prompt('Enter lesson title:');
      if (!lessonTitle) return;

      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

  const handleSaveLesson = async (lessonData: Partial<Lesson>) => {
    if (!selectedLesson) return;

    try {
      const response = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lessonData)
      });

      const data = await response.json();
      if (data.success) {
        setLessons(lessons.map(lesson => 
          lesson.id === selectedLesson.id ? { ...lesson, ...lessonData } : lesson
        ));
      }
    } catch (error) {
      console.error('Failed to save lesson:', error);
    }
  };

  const handleCloseLessonEditor = () => {
    setSelectedLesson(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Program Not Found</h1>
          <p className="text-gray-600">The requested program could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{program.title}</h1>
          {program.description && (
            <p className="text-gray-600 mt-2">{program.description}</p>
          )}
        </div>
        <Button onClick={handleCreateLesson}>
          Add New Lesson
        </Button>
      </div>

      {/* Program Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{lessons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lesson Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{links.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {lessons.length > 0 ? '0%' : 'N/A'}
            </div>
            <p className="text-sm text-gray-500 mt-1">Average progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Program Graph */}
      <div className="mb-8">
        <ProgramGraph
          lessons={lessons}
          links={links}
          onLessonClick={handleLessonClick}
        />
      </div>

      {/* Lesson List */}
      <Card>
        <CardHeader>
          <CardTitle>All Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 mb-4">No lessons created yet</p>
              <Button onClick={handleCreateLesson}>
                Create Your First Lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((lesson, index) => (
                  <div 
                    key={lesson.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                        <p className="text-sm text-gray-500">
                          {lesson.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      {lesson.testData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Has Test Data
                        </span>
                      )}
                      <span>Order: {lesson.orderIndex}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lesson Editor Modal */}
      {selectedLesson && (
        <LessonEditor
          lesson={selectedLesson}
          onSave={handleSaveLesson}
          onClose={handleCloseLessonEditor}
        />
      )}
    </div>
  );
}