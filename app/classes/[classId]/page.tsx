"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Student } from '@/types';

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClass();
  }, [classId]);

  const fetchClass = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`);
      const data = await response.json();

      if (data.success) {
        setClassData(data.data);
        setStudents(data.data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    const studentName = prompt('Student name:');
    if (!studentName) return;

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          name: studentName.trim(),
          age: null
        })
      });

      const data = await response.json();
      if (data.success) {
        setStudents([...students, data.data]);
      }
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Class not found</div>
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
                onClick={() => router.push('/dashboard?view=classes')}
                className="text-gray-500 hover:text-gray-700 mb-2 text-sm"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{classData.name}</h1>
            </div>
            <button
              onClick={handleAddStudent}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              + New Student
            </button>
          </div>
        </div>
      </div>

      {/* Students as circles */}
      <div className="container mx-auto px-8 py-12">
        {students.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No students yet</div>
            <button
              onClick={handleAddStudent}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Add First Student
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className="flex flex-col items-center group"
              >
                <div className="w-24 h-24 rounded-full bg-green-400 hover:bg-green-500 transition-all duration-300 group-hover:scale-110 shadow-lg flex items-center justify-center text-white font-bold text-lg">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="mt-3 text-sm text-gray-700 text-center font-medium">
                  {student.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <p className="text-gray-600">
                  {selectedStudent.age || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress
                </label>
                <div className="text-gray-600">
                  No progress data yet
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
