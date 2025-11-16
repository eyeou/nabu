"use client";

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Program, Lesson, Class, StudentSummary } from '@/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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

  const [classes, setClasses] = useState<ClassWithStudents[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [examPreviewUrls, setExamPreviewUrls] = useState<string[]>([]);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processedResults, setProcessedResults] = useState<ProcessedCopyResult[]>([]);

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

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setUploadMessage(null);
    setProcessedResults([]);
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
        setUploadMessage({ type: 'success', text: data.message || 'Copie analysée avec succès !' });
        setProcessedResults(data.data?.processedStudents || []);
        setExamFiles([]);
        setExamPreviewUrls([]);
      } else {
        setUploadMessage({ type: 'error', text: data.message || 'Échec de l’analyse de la copie.' });
      }
    } catch (error) {
      console.error('Upload exam photo failed:', error);
      setUploadMessage({ type: 'error', text: 'Erreur inattendue lors du téléversement.' });
    } finally {
      setUploadingExam(false);
    }
  };

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
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/dashboard?view=programs')}
                className="text-gray-500 hover:text-gray-700 mb-2 text-sm"
              >
                ← Retour
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{program.title}</h1>
            </div>
            <button
              onClick={handleCreateLesson}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              + Nouvelle leçon
            </button>
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs uppercase text-gray-400">Leçon</p>
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
