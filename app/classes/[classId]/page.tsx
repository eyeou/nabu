"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Student } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { parseCopyInsights } from '@/lib/copy-insights';

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
    const studentName = prompt("Nom de l'élève :");
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
    fetchStudentDetails(student.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Chargement…</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Classe introuvable</div>
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
                ← Retour
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{classData.name}</h1>
            </div>
            <button
              onClick={handleAddStudent}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              + Nouvel élève
            </button>
          </div>
        </div>
      </div>

      {/* Students as circles */}
      <div className="container mx-auto px-8 py-12">
        {students.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">Aucun élève pour le moment</div>
            <button
              onClick={handleAddStudent}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Ajouter le premier élève
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase text-gray-400">Élève</p>
                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">
                    Âge {selectedStudent.age ?? '—'}
                  </Badge>
                  {selectedStudentDetails?.class?.name && (
                    <Badge variant="outline">{selectedStudentDetails.class.name}</Badge>
                  )}
                </div>
              </div>
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

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
              <div className="text-sm text-gray-500">
                {studentDetailLoading
                  ? 'Chargement des données pédagogiques…'
                  : 'Dernières analyses IA pour cet élève.'}
              </div>
              <Link
                href={`/students/${selectedStudent.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ouvrir la fiche complète →
              </Link>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">Synthèse IA</p>
                    {studentDetailLoading && (
                      <span className="text-xs text-gray-400">Chargement…</span>
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
                      Importez une copie pour générer une synthèse IA.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">Examens récents</p>
                    {studentDetailLoading && (
                      <span className="text-xs text-gray-400">Chargement…</span>
                    )}
                  </div>
                  {selectedStudentDetails?.studentAssessments?.length ? (
                    selectedStudentDetails.studentAssessments.slice(0, 2).map(assessment => (
                      <div key={assessment.id} className="border rounded-lg p-3 bg-gray-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800">
                            {assessment.assessment?.title || 'Évaluation'}
                          </p>
                          <span className="text-xs text-gray-400">
                            {assessment.createdAt
                              ? new Date(assessment.createdAt).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        {(() => {
                          const insights = parseCopyInsights(assessment.gradedResponses);
                          const gradeDisplay =
                            insights.gradeText ||
                            (typeof assessment.overallScore === 'number' &&
                            typeof assessment.maxScore === 'number'
                              ? `${assessment.overallScore}/${assessment.maxScore}`
                              : 'Non renseignée');

                          return (
                            <>
                              <p className="text-sm text-gray-600">Note relevée : {gradeDisplay}</p>

                              {insights.adviceSummary.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase text-gray-400">Conseils clés</p>
                                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                                    {insights.adviceSummary.map((advice, index) => (
                                      <li key={`${assessment.id}-advice-${index}`} className="flex gap-2">
                                        <span>•</span>
                                        <span>{advice}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {insights.programRecommendations.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase text-gray-400 mb-1">Axes du programme</p>
                                  <div className="flex flex-wrap gap-2">
                                    {insights.programRecommendations.map((recommendation, index) => (
                                      <Badge key={`${assessment.id}-recommendation-${index}`} variant="outline">
                                        {recommendation}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {insights.questions.length > 0 && (
                                <details className="text-sm text-gray-600">
                                  <summary className="cursor-pointer text-blue-600">
                                    Voir les notes liées à la copie
                                  </summary>
                                  <ul className="mt-2 space-y-2 text-gray-600">
                                    {insights.questions.slice(0, 2).map((question, idx) => (
                                      <li key={idx} className="border rounded-md p-2 bg-white">
                                        <p className="font-medium">
                                          Q{question.number || idx + 1} : {question.questionText}
                                        </p>
                                        {question.teacherComment && (
                                          <p className="text-sm">Note prof : {question.teacherComment}</p>
                                        )}
                                        {(question.improvementAdvice || question.feedback) && (
                                          <p className="text-sm">
                                            Conseil : {question.improvementAdvice || question.feedback}
                                          </p>
                                        )}
                                        {(question.recommendedProgramFocus ||
                                          (question.skillTags && question.skillTags.length > 0)) && (
                                          <p className="text-xs text-gray-500">
                                            Programme :{' '}
                                            {[
                                              question.recommendedProgramFocus,
                                              ...(question.skillTags || [])
                                            ]
                                              .filter(Boolean)
                                              .join(', ')}
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucun examen importé.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
