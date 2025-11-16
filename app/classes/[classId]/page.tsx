"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Student } from '@/types';
type StoredQuestion = {
  number?: number;
  questionText?: string;
  studentAnswer?: string;
  correctAnswer?: string;
  pointsAwarded?: number;
  pointsPossible?: number;
  feedback?: string;
};
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import StudentRegistryUpload, { ExtractedStudent } from '@/components/StudentRegistryUpload';

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchClass = useCallback(async () => {
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
  }, [classId]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  const fetchStudentDetails = useCallback(async (studentId: string) => {
    setStudentDetailLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedStudentDetails(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch student details:', error);
    } finally {
      setStudentDetailLoading(false);
    }
  }, []);

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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        // Remove from students list
        setStudents(students.filter(s => s.id !== studentId));
        // Close detail panel if this student was selected
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(null);
          setSelectedStudentDetails(null);
        }
      } else {
        alert(data.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student');
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentDetails(student.id);
  };

  const handleStudentsExtracted = async (extractedStudents: ExtractedStudent[]) => {
    setIsImporting(true);

    try {
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          students: extractedStudents
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowImportModal(false);
        await fetchClass();
      }
    } catch (error) {
      console.error('Failed to import students:', error);
    } finally {
      setIsImporting(false);
    }
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                📄 Import Students
              </button>
              <button
                onClick={handleAddStudent}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                + New Student
              </button>
            </div>
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
              <div key={student.id} className="flex flex-col items-center group relative">
                <button
                  onClick={() => handleStudentClick(student)}
                  className="w-24 h-24 rounded-full bg-green-400 hover:bg-green-500 transition-all duration-300 group-hover:scale-110 shadow-lg flex items-center justify-center text-white font-bold text-lg relative"
                >
                  {student.name.charAt(0).toUpperCase()}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStudent(student.id, student.name);
                  }}
                  className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title={`Delete ${student.name}`}
                >
                  ×
                </button>
                <div className="mt-3 text-sm text-gray-700 text-center font-medium">
                  {student.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase text-gray-400">Student</p>
                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">
                    Age {selectedStudent.age ?? '—'}
                  </Badge>
                  {selectedStudentDetails?.class?.name && (
                    <Badge variant="outline">{selectedStudentDetails.class.name}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <button
                  onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="Delete student"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedStudentDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
              <div className="text-sm text-gray-500">
                {studentDetailLoading
                  ? 'Loading learning data...'
                  : 'Latest AI insights for this student.'}
              </div>
              <Link
                href={`/students/${selectedStudent.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Open full student page →
              </Link>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">AI summary</p>
                    {studentDetailLoading && (
                      <span className="text-xs text-gray-400">Loading...</span>
                    )}
                  </div>
                  {selectedStudentDetails?.summaries?.length ? (
                    selectedStudentDetails.summaries.map(summary => (
                      <div key={summary.id}>
                        <p className="text-xs uppercase text-gray-400 mb-1">{summary.subject}</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {JSON.parse(summary.bulletPointsJson || '[]').map(
                            (point: string, index: number) => (
                              <li key={index} className="flex gap-2">
                                <span>•</span>
                                <span>{point}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      Upload a test copy to generate an AI summary.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">Recent exams</p>
                    {studentDetailLoading && (
                      <span className="text-xs text-gray-400">Loading...</span>
                    )}
                  </div>
                  {selectedStudentDetails?.studentAssessments?.length ? (
                    selectedStudentDetails.studentAssessments.slice(0, 2).map(assessment => (
                      <div key={assessment.id} className="border rounded-lg p-3 bg-gray-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800">
                            {assessment.assessment?.title || 'Assessment'}
                          </p>
                          <span className="text-xs text-gray-400">
                            {assessment.createdAt
                              ? new Date(assessment.createdAt).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Score:{' '}
                          {typeof assessment.overallScore === 'number' &&
                          typeof assessment.maxScore === 'number'
                            ? `${assessment.overallScore}/${assessment.maxScore}`
                            : 'Pending'}
                        </p>
                        {Array.isArray(assessment.gradedResponses) && (
                          <details className="text-sm text-gray-600">
                            <summary className="cursor-pointer text-blue-600">
                              View AI corrections
                            </summary>
                            <ul className="mt-2 space-y-2 text-gray-600">
                              {(assessment.gradedResponses as StoredQuestion[])
                                .slice(0, 2)
                                .map((question, idx) => (
                                  <li key={idx} className="border rounded-md p-2 bg-white">
                                    <p className="font-medium">
                                      Q{question.number || idx + 1}: {question.questionText}
                                    </p>
                                    <p>Student: {question.studentAnswer || '—'}</p>
                                    <p>Answer: {question.correctAnswer || '—'}</p>
                                  </li>
                                ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No exam uploads yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Import Students Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Import Students</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                disabled={isImporting}
              >
                ×
              </button>
            </div>

            <StudentRegistryUpload
              onStudentsExtracted={handleStudentsExtracted}
              onCancel={() => setShowImportModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
