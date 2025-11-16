"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Student } from '@/types';
import StudentRegistryUpload, { ExtractedStudent } from '@/components/StudentRegistryUpload';
import { DEFAULT_PERFORMANCE_LEVEL, STUDENT_PERFORMANCE_LEVELS } from '@/lib/student-level';

type StudentSortMode = 'alphabetical' | 'level';

const levelFallback =
  STUDENT_PERFORMANCE_LEVELS.find((level) => level.value === DEFAULT_PERFORMANCE_LEVEL) ||
  STUDENT_PERFORMANCE_LEVELS[0];

const getLevelInfo = (level?: number | null) =>
  STUDENT_PERFORMANCE_LEVELS.find((definition) => definition.value === level) || levelFallback;

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [classDeleteLoading, setClassDeleteLoading] = useState(false);
  const [classDeleteError, setClassDeleteError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<StudentSortMode>('alphabetical');
  const [levelUpdatingId, setLevelUpdatingId] = useState<string | null>(null);
  const [levelUpdateError, setLevelUpdateError] = useState<string | null>(null);

  const fetchClass = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        credentials: 'include'
      });
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

  const handleDeleteClass = async () => {
    if (!classData) return;
    const confirmed = window.confirm(
      `Supprimer définitivement la classe "${classData.name}" ? Tous les élèves associés seront également supprimés.`
    );

    if (!confirmed) return;

    setClassDeleteLoading(true);
    setClassDeleteError(null);

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        router.push('/dashboard?view=classes');
      } else {
        setClassDeleteError(data.message || 'Impossible de supprimer cette classe.');
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      setClassDeleteError('Une erreur est survenue pendant la suppression de la classe.');
    } finally {
      setClassDeleteLoading(false);
    }
  };

  const handleStudentClick = (student: Student) => {
    router.push(`/students/${student.id}`);
  };

  const handleDeleteStudentFromList = async (studentId: string, studentName: string) => {
    const confirmed = window.confirm(
      `Supprimer définitivement ${studentName} ? Toutes ses données seront effacées.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
      } else {
        alert(data.message || 'Impossible de supprimer cet élève.');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Une erreur est survenue pendant la suppression.');
    }
  };

  const handleStudentsExtracted = async (extractedStudents: ExtractedStudent[]) => {
    if (extractedStudents.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          classId,
          students: extractedStudents
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchClass();
        setShowImportModal(false);
      } else {
        alert(data.message || "Impossible d'importer les élèves.");
      }
    } catch (error) {
      console.error('Failed to import students:', error);
      alert("Une erreur est survenue pendant l'import.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleStudentLevelChange = async (student: Student, newLevel: number) => {
    if (!student) return;
    const currentLevel = student.performanceLevel ?? DEFAULT_PERFORMANCE_LEVEL;
    if (newLevel === currentLevel) {
      return;
    }

    setLevelUpdatingId(student.id);
    setLevelUpdateError(null);

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ performanceLevel: newLevel })
      });
      const data = await response.json();
      if (data.success) {
        setStudents((prev) =>
          prev.map((current) =>
            current.id === student.id ? { ...current, performanceLevel: newLevel } : current
          )
        );
      } else {
        setLevelUpdateError(data.message || 'Impossible de mettre à jour le niveau.');
      }
    } catch (error) {
      console.error('Failed to update student level:', error);
      setLevelUpdateError('Impossible de mettre à jour le niveau.');
    } finally {
      setLevelUpdatingId(null);
    }
  };

  const alphabeticalStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      ),
    [students]
  );

  const studentsByLevel = useMemo(() => {
    const grouped: Record<number, Student[]> = {};
    STUDENT_PERFORMANCE_LEVELS.forEach((level) => {
      grouped[level.value] = [];
    });

    students.forEach((student) => {
      const levelValue = student.performanceLevel ?? DEFAULT_PERFORMANCE_LEVEL;
      if (!grouped[levelValue]) {
        grouped[levelValue] = [];
      }
      grouped[levelValue].push(student);
    });

    return grouped;
  }, [students]);

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
          <div className="flex flex-wrap justify-between gap-4 items-center">
            <div>
              <button
                onClick={() => router.push('/dashboard?view=classes')}
                className="text-gray-500 hover:text-gray-700 mb-2 text-sm"
              >
                ← Retour
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{classData.name}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  📄 Importer des élèves
                </button>
                <button
                  onClick={handleAddStudent}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  + Nouvel élève
                </button>
                <button
                  onClick={handleDeleteClass}
                  disabled={classDeleteLoading}
                  className="px-6 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {classDeleteLoading ? 'Suppression…' : 'Supprimer la classe'}
                </button>
              </div>
              {classDeleteError && (
                <p className="text-sm text-red-600 text-right">{classDeleteError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Students */}
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
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {(['alphabetical', 'level'] as StudentSortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      sortMode === mode
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'alphabetical' ? 'Ordre alphabétique' : 'Tri par niveau'}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {STUDENT_PERFORMANCE_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${level.accent}`}></span>
                    <span>{level.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Les niveaux sont recalculés automatiquement à partir de la moyenne des dernières copies importées.
              Ajustez-les ici si vous souhaitez surclasser ou baisser un élève ponctuellement.
            </p>

            {levelUpdateError && (
              <p className="mb-4 text-sm text-red-600">{levelUpdateError}</p>
            )}

            {sortMode === 'alphabetical' ? (
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Élève
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Niveau
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alphabeticalStudents.map((student) => {
                      const levelInfo = getLevelInfo(student.performanceLevel);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-semibold ${levelInfo.accent}`}
                              >
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">
                                  ID {student.id.slice(-6).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${levelInfo.badgeBg} ${levelInfo.badgeText}`}
                              >
                                {levelInfo.label}
                              </span>
                              <select
                                value={(student.performanceLevel ?? DEFAULT_PERFORMANCE_LEVEL).toString()}
                                onChange={(event) =>
                                  handleStudentLevelChange(student, Number(event.target.value))
                                }
                                disabled={levelUpdatingId === student.id}
                                className="rounded-lg border border-gray-200 px-3 py-1 text-sm focus:border-gray-400 focus:outline-none"
                              >
                                {STUDENT_PERFORMANCE_LEVELS.map((level) => (
                                  <option key={level.value} value={level.value}>
                                    {level.value} — {level.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => handleStudentClick(student)}
                                className="rounded-lg border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50"
                              >
                                Voir la fiche
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteStudentFromList(student.id, student.name)
                                }
                                className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-8">
                {STUDENT_PERFORMANCE_LEVELS.map((levelDefinition) => {
                  const studentsInLevel = studentsByLevel[levelDefinition.value] || [];
                  return (
                    <div
                      key={levelDefinition.value}
                      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Niveau {levelDefinition.value}
                          </p>
                          <h3 className="text-xl font-bold text-gray-800">{levelDefinition.label}</h3>
                          <p className="text-sm text-gray-500">{levelDefinition.description}</p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-medium ${levelDefinition.badgeBg} ${levelDefinition.badgeText}`}
                        >
                          {studentsInLevel.length} élève
                          {studentsInLevel.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {studentsInLevel.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Aucun élève classé ici pour le moment.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {[...studentsInLevel]
                            .sort((a, b) =>
                              a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
                            )
                            .map((student) => (
                              <div
                                key={student.id}
                                className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm transition hover:shadow-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-semibold ${levelDefinition.accent}`}
                                    >
                                      {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{student.name}</p>
                                      <p className="text-xs text-gray-500">
                                        ID {student.id.slice(-6).toUpperCase()}
                                      </p>
                                    </div>
                                  </div>
                                  <select
                                    value={(student.performanceLevel ?? DEFAULT_PERFORMANCE_LEVEL).toString()}
                                    onChange={(event) =>
                                      handleStudentLevelChange(student, Number(event.target.value))
                                    }
                                    disabled={levelUpdatingId === student.id}
                                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-gray-400 focus:outline-none"
                                  >
                                    {STUDENT_PERFORMANCE_LEVELS.map((level) => (
                                      <option key={level.value} value={level.value}>
                                        {level.value} — {level.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleStudentClick(student)}
                                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Voir la fiche
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteStudentFromList(student.id, student.name)
                                    }
                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Students Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Importer des élèves</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Téléchargez une photo ou un CSV de votre registre pour créer plusieurs élèves automatiquement.
                </p>
              </div>
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
