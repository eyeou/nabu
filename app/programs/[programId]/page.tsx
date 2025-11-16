"use client";

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program, Lesson, Class, StudentSummary } from '@/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type UploadStatus = 'pending' | 'processing' | 'success' | 'error';

interface UploadStep {
  id: string;
  label: string;
  status: UploadStatus;
  detail?: string;
}

const uploadStatusTokens: Record<
  UploadStatus,
  {
    label: string;
    textColor: string;
    dotClass: string;
  }
> = {
  pending: {
    label: 'En attente',
    textColor: 'text-gray-500',
    dotClass: 'bg-gray-300'
  },
  processing: {
    label: 'Lecture…',
    textColor: 'text-blue-600',
    dotClass: 'bg-blue-500 animate-pulse'
  },
  success: {
    label: 'Validée',
    textColor: 'text-green-600',
    dotClass: 'bg-green-500'
  },
  error: {
    label: 'Erreur',
    textColor: 'text-red-600',
    dotClass: 'bg-red-500'
  }
};

const buildUploadSteps = (files: File[], includeAnalysisStep = false): UploadStep[] => {
  const timestamp = Date.now();
  const steps = files.map((file, index) => ({
    id: `${timestamp}-${index}`,
    label: file.name?.trim() || `Copie ${index + 1}`,
    status: 'pending' as UploadStatus
  }));

  if (includeAnalysisStep && steps.length > 0) {
    steps.push({
      id: `${timestamp}-analysis`,
      label: 'Analyse IA',
      status: 'pending' as UploadStatus
    });
  }

  return steps;
};

const UploadProgressRing = ({ completed, total }: { completed: number; total: number }) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
        />
        <circle
          className="text-blue-500 transition-[stroke-dashoffset] duration-300 ease-out"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-semibold text-gray-800">{safePercentage}%</span>
        <span className="text-[10px] font-medium text-gray-500">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
};

interface ClassWithStudents extends Class {
  students?: { id: string; name: string; age?: number; avatarUrl?: string | null }[];
}

interface ProcessedCopyResult {
  studentId: string;
  studentName: string;
  wasCreated: boolean;
  gradeText?: string;
  assessmentId: string;
  studentAssessmentId: string;
  summaries: StudentSummary[];
}

const parseBulletPoints = (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return jsonString.split('\n').filter(point => point.trim());
  }
};

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [programDeleteLoading, setProgramDeleteLoading] = useState(false);
  const [programDeleteError, setProgramDeleteError] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [lessonDeleteError, setLessonDeleteError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassWithStudents[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [examPreviewUrls, setExamPreviewUrls] = useState<string[]>([]);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processedResults, setProcessedResults] = useState<ProcessedCopyResult[]>([]);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([]);

  const updateStepStatus = useCallback((stepId: string, status: UploadStatus, detail?: string) => {
    setUploadSteps(prevSteps =>
      prevSteps.map(step => (step.id === stepId ? { ...step, status, detail } : step))
    );
  }, []);

  const resetUploadUi = useCallback(() => {
    setExamFiles([]);
    setExamPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return [];
    });
    setUploadSteps([]);
  }, []);

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
    const lessonTitle = prompt('Nom de la leçon :');
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

  const handleDeleteProgram = async () => {
    if (!program) return;
    const confirmed = window.confirm(
      `Supprimer définitivement le programme "${program.title}" ? Toutes les leçons et évaluations associées seront supprimées.`
    );

    if (!confirmed) return;

    setProgramDeleteLoading(true);
    setProgramDeleteError(null);

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        router.push('/dashboard?view=programs');
      } else {
        setProgramDeleteError(data.message || 'Impossible de supprimer ce programme.');
      }
    } catch (error) {
      console.error('Failed to delete program:', error);
      setProgramDeleteError('Une erreur est survenue pendant la suppression du programme.');
    } finally {
      setProgramDeleteLoading(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    resetUploadUi();
    setSelectedLesson(lesson);
    setUploadMessage(null);
    setProcessedResults([]);
    setLessonDeleteError(null);
  };

  const handleCloseLessonModal = () => {
    resetUploadUi();
    setSelectedLesson(null);
    setLessonDeleteError(null);
    setUploadMessage(null);
    setProcessedResults([]);
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la leçon "${lesson.title}" ainsi que ses évaluations ?`
    );
    if (!confirmed) return;

    setDeletingLessonId(lesson.id);
    setLessonDeleteError(null);

    try {
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setLessons(prev => prev.filter(l => l.id !== lesson.id));
        if (selectedLesson?.id === lesson.id) {
          handleCloseLessonModal();
        }
      } else {
        setLessonDeleteError(data.message || 'Impossible de supprimer cette leçon.');
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      setLessonDeleteError('Une erreur est survenue pendant la suppression de la leçon.');
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleClassChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(event.target.value);
    setProcessedResults([]);
    setUploadMessage(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setExamFiles(files);
    setUploadMessage(null);
    setProcessedResults([]);

    const previews = files.map(file => URL.createObjectURL(file));
    setExamPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return previews;
    });

    if (files.length === 0) {
      setUploadSteps([]);
      return;
    }

    const pendingSteps = buildUploadSteps(files);
    setUploadSteps(pendingSteps);
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
      setUploadMessage({ type: 'error', text: 'Veuillez d’abord sélectionner une leçon.' });
      return;
    }

    if (examFiles.length === 0) {
      setUploadMessage({ type: 'error', text: 'Ajoutez au moins une photo de copie.' });
      return;
    }

    if (!selectedClassId) {
      setUploadMessage({
        type: 'error',
        text: 'Choisissez la classe concernée pour rattacher ou créer automatiquement les élèves.'
      });
      return;
    }

    setUploadingExam(true);
    setUploadMessage(null);
    setProcessedResults([]);
    const runSteps = buildUploadSteps(examFiles, true);
    setUploadSteps(runSteps);
    const fileStepIds = runSteps.slice(0, examFiles.length).map(step => step.id);
    const analysisStepId = runSteps[runSteps.length - 1]?.id;

    try {
      const imageDataUrls: string[] = [];

      for (let i = 0; i < examFiles.length; i += 1) {
        const stepId = runSteps[i]?.id;
        if (stepId) {
          updateStepStatus(stepId, 'processing', 'Lecture de la copie…');
        }

        try {
          const dataUrl = await fileToDataUrl(examFiles[i]);
          imageDataUrls.push(dataUrl);
          if (stepId) {
            updateStepStatus(stepId, 'processing', 'Lecture terminée, en attente du retour IA');
          }
        } catch (error) {
          console.error('Reading exam file failed:', error);
          if (stepId) {
            updateStepStatus(stepId, 'error', 'Lecture impossible');
          }
          setUploadMessage({
            type: 'error',
            text: 'Impossible de lire certaines copies. Vérifiez vos fichiers et réessayez.'
          });
          setUploadingExam(false);
          return;
        }
      }

      if (analysisStepId) {
        updateStepStatus(analysisStepId, 'processing', 'Analyse IA en cours…');
      }

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
        setUploadMessage({ type: 'success', text: data.message || 'Copie analysée avec succès !' });
        setProcessedResults(data.data?.processedStudents || []);
        fileStepIds.forEach(stepId => {
          updateStepStatus(stepId, 'success', 'Retour transmis');
        });
        if (analysisStepId) {
          updateStepStatus(analysisStepId, 'success', 'Synthèse mise à jour');
        }
        setExamFiles([]);
        setExamPreviewUrls(prev => {
          prev.forEach(url => URL.revokeObjectURL(url));
          return [];
        });
      } else {
        fileStepIds.forEach(stepId => {
          updateStepStatus(stepId, 'error', data.message || 'Analyse impossible');
        });
        if (analysisStepId) {
          updateStepStatus(analysisStepId, 'error', data.message || 'Analyse impossible');
        }
        setUploadMessage({ type: 'error', text: data.message || 'Échec de l’analyse de la copie.' });
      }
    } catch (error) {
      console.error('Upload exam photo failed:', error);
      fileStepIds.forEach(stepId => {
        updateStepStatus(stepId, 'error', 'Erreur réseau');
      });
      if (analysisStepId) {
        updateStepStatus(analysisStepId, 'error', 'Erreur réseau');
      }
      setUploadMessage({ type: 'error', text: 'Erreur inattendue lors du téléversement.' });
    } finally {
      setUploadingExam(false);
    }
  };

  const completedUploadSteps = uploadSteps.filter(
    step => step.status === 'success' || step.status === 'error'
  ).length;
  const totalUploadSteps = uploadSteps.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Chargement…</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Programme introuvable</div>
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
                onClick={() => router.push('/dashboard?view=programs')}
                className="text-gray-500 hover:text-gray-700 mb-2 text-sm"
              >
                ← Retour
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{program.title}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={handleCreateLesson}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  + Nouvelle leçon
                </button>
                <button
                  onClick={handleDeleteProgram}
                  disabled={programDeleteLoading}
                  className="px-6 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {programDeleteLoading ? 'Suppression…' : 'Supprimer le programme'}
                </button>
              </div>
              {programDeleteError && (
                <p className="text-sm text-red-600 text-right">{programDeleteError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="container mx-auto px-8 py-12">
        {lessons.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">Aucune leçon pour l’instant</div>
            <button
              onClick={handleCreateLesson}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Créer la première leçon
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {lessons.map(lesson => (
                <div key={lesson.id} className="relative flex flex-col items-center group">
                  <button
                    type="button"
                    onClick={() => handleLessonClick(lesson)}
                    className="flex flex-col items-center group w-full"
                  >
                    <div className="w-24 h-24 rounded-full bg-blue-400 hover:bg-blue-500 transition-all duration-300 group-hover:scale-110 shadow-lg flex items-center justify-center text-white font-bold text-lg mx-auto">
                      {lesson.orderIndex + 1}
                    </div>
                    <div className="mt-3 text-sm text-gray-700 text-center font-medium">
                      {lesson.title}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteLesson(lesson);
                    }}
                    disabled={deletingLessonId === lesson.id}
                    className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-70"
                    title={`Supprimer ${lesson.title}`}
                  >
                    {deletingLessonId === lesson.id ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
            {lessonDeleteError && !selectedLesson && (
              <p className="text-sm text-red-600">{lessonDeleteError}</p>
            )}
          </div>
        )}
      </div>

      {/* Lesson detail + upload modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 sm:p-8 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 gap-4">
              <div>
                <p className="text-xs uppercase text-gray-400">Leçon</p>
                <h2 className="text-2xl font-bold text-gray-800">{selectedLesson.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteLesson(selectedLesson)}
                  disabled={deletingLessonId === selectedLesson.id}
                  className="text-sm text-red-600 border border-red-200 rounded-md px-3 py-1 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingLessonId === selectedLesson.id ? 'Suppression…' : 'Supprimer la leçon'}
                </button>
                <button
                  onClick={handleCloseLessonModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
            </div>
            {lessonDeleteError && (
              <p className="text-sm text-red-600 mb-4">{lessonDeleteError}</p>
            )}

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-gray-600">
                  {selectedLesson.description?.trim() || 'Pas encore de description.'}
                </p>
              </div>

              <div className="border rounded-xl p-5 space-y-4 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Téléverser une copie d’examen</h3>
                  <p className="text-sm text-gray-500">
                    Ajoutez toutes les copies corrigées (jusqu&apos;à 30). L&apos;IA lit chaque page,
                    détecte le nom inscrit, capture la note et pousse les conseils directement sur la fiche
                    élève correspondante.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                      <select
                        value={selectedClassId}
                        onChange={handleClassChange}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">
                          {classesLoading ? 'Chargement des classes…' : 'Choisissez une classe'}
                        </option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        La classe permet de rattacher automatiquement les élèves détectés (création incluse).
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border px-4 py-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-800 mb-1">Détection automatique</p>
                    <p>
                      Ajoutez jusqu&apos;à 30 copies à la fois. Le nom présent sur chaque page sert à
                      identifier l&apos;élève (création automatique si introuvable). Assurez-vous que le
                      nom est lisible sur toutes les pages.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photos des copies (multi-pages)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-3 text-center w-full">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="text-sm"
                      />
                      {examPreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {examPreviewUrls.map((url, index) => (
                            <img
                              key={url}
                              src={url}
                              alt={`Aperçu de la copie ${index + 1}`}
                              className="max-h-32 rounded-lg border object-contain w-full"
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        JPG / PNG / HEIC. Ajoutez toutes les pages de la copie pour une analyse complète.
                      </p>
                    </div>
                  </div>

                  {uploadSteps.length > 0 && (
                    <div className="rounded-xl border border-blue-100 bg-white/80 p-4 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <UploadProgressRing
                          completed={completedUploadSteps}
                          total={totalUploadSteps}
                        />
                        <div className="flex-1 min-w-[10rem]">
                          <p className="text-sm font-semibold text-gray-800">Suivi des copies</p>
                          <p className="text-xs text-gray-500">
                            {completedUploadSteps}/{totalUploadSteps} étapes traitées
                          </p>
                          {uploadingExam && (
                            <p className="text-xs text-blue-600 font-medium mt-1">Analyse en cours…</p>
                          )}
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                        {uploadSteps.map(step => {
                          const statusToken = uploadStatusTokens[step.status];
                          return (
                            <div
                              key={step.id}
                              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${statusToken.dotClass}`}
                                  aria-hidden="true"
                                />
                                <span className="font-medium text-gray-700 truncate" title={step.label}>
                                  {step.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-right">
                                <span className={`text-xs font-semibold ${statusToken.textColor}`}>
                                  {statusToken.label}
                                </span>
                                {step.detail && (
                                  <span
                                    className={`text-xs ${
                                      step.status === 'error' ? 'text-red-500' : 'text-gray-500'
                                    }`}
                                  >
                                    {step.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                      {uploadingExam ? 'Analyse en cours…' : 'Téléverser et analyser'}
                    </button>
                  </div>
                </div>
              </div>

              {processedResults.length > 0 && (
                <div className="border rounded-xl p-5 space-y-5 bg-white">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Copies traitées ({processedResults.length})
                    </h3>
                    <p className="text-sm text-gray-500">
                      Les profils élèves ont été mis à jour automatiquement avec la note détectée et les
                      recommandations IA.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {processedResults.map(result => (
                      <div
                        key={result.studentAssessmentId}
                        className="border rounded-lg p-4 bg-gray-50 space-y-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{result.studentName}</p>
                              {result.wasCreated && (
                                <Badge variant="outline" className="text-green-700 border-green-200">
                                  Nouveau profil
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Note détectée : {result.gradeText || 'Non communiquée'}
                            </p>
                          </div>
                          <Link
                            href={`/students/${result.studentId}`}
                            className="text-blue-600 text-sm font-medium hover:text-blue-700"
                          >
                            Ouvrir la fiche →
                          </Link>
                        </div>

                        {result.summaries.length > 0 && (
                          <div className="grid gap-4 sm:grid-cols-3">
                            {result.summaries.map(summary => {
                              const bulletPoints = parseBulletPoints(summary.bulletPointsJson || '[]');
                              return (
                                <div key={summary.id} className="border rounded-lg p-3 bg-white">
                                  <p className="text-xs uppercase text-gray-400 mb-2">{summary.subject}</p>
                                  <ul className="space-y-1 text-sm text-gray-700">
                                    {bulletPoints.map((point, index) => (
                                      <li key={`${summary.id}-${index}`} className="flex gap-2 items-start">
                                        <span className="text-blue-400 mt-0.5">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
