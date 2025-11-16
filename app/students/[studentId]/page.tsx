"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Activity, FileText, MessageSquare, RefreshCcw, Link as LinkIcon } from 'lucide-react';
import AISummaryBox from '@/components/AISummaryBox';
import ProgramGraph from '@/components/ProgramGraph';
import { parseCopyInsights } from '@/lib/copy-insights';
import {
  Student,
  StudentLessonStatus,
  StudentSummary,
  Lesson,
  LessonLink,
  StudentAssessment,
  StudentComment
} from '@/types';

const masteryLabelMap: Record<string, string> = {
  not_started: 'Non commencé',
  in_progress: 'En cours',
  completed: 'Terminé',
  mastered: 'Maîtrisé'
};

const ACTIVITY_PREVIEW_COUNT = 3;
const ASSESSMENT_PREVIEW_COUNT = 2;

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawStudentId = params?.studentId;
  const studentId = Array.isArray(rawStudentId)
    ? rawStudentId[0]
    : typeof rawStudentId === 'string'
      ? rawStudentId
      : undefined;

  const [student, setStudent] = useState<Student | null>(null);
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [lessonStatuses, setLessonStatuses] = useState<StudentLessonStatus[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [links, setLinks] = useState<LessonLink[]>([]);
  const [studentAssessments, setStudentAssessments] = useState<StudentAssessment[]>([]);
  const [studentComments, setStudentComments] = useState<StudentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [summaryRefreshMessage, setSummaryRefreshMessage] = useState<string | null>(null);
  const [summaryRefreshError, setSummaryRefreshError] = useState<string | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllAssessments, setShowAllAssessments] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const parcoursSectionRef = useRef<HTMLDivElement | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const timelineSectionRef = useRef<HTMLDivElement | null>(null);

  const clearQuickActionFeedback = () => {
    setQuickActionMessage(null);
    setQuickActionError(null);
  };
  const fetchStudent = useCallback(async () => {
    if (!studentId) {
      setStudent(null);
      setSummaries([]);
      setLessonStatuses([]);
      setLessons([]);
      setLinks([]);
      setStudentAssessments([]);
      setStudentComments([]);
      setLoadError('Impossible de retrouver cet élève (identifiant manquant). Vérifiez l’URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setStudent(data.data);
        setSummaries(data.data.summaries || []);
        setLessonStatuses(data.data.lessonStatuses || []);
        
        // Extract lessons from lesson statuses
        const uniqueLessons = data.data.lessonStatuses?.map((status: StudentLessonStatus) => status.lesson).filter(Boolean) || [];
        setLessons(uniqueLessons);
        setStudentAssessments(data.data.studentAssessments || []);
        setStudentComments(data.data.comments || []);
        
        // For now, we'll use empty links - in a real app, you'd fetch these
        setLinks([]);
        setLoadError(null);
      } else {
        setStudent(null);
        setSummaries([]);
        setLessonStatuses([]);
        setLessons([]);
        setLinks([]);
        setStudentAssessments([]);
        setStudentComments([]);
        setLoadError(data.message || 'Impossible de charger les informations de l’élève.');
      }
    } catch (error) {
      console.error('Failed to fetch student:', error);
      setLoadError('Impossible de charger les informations de l’élève. Vérifiez votre connexion et vos droits.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const activityEntries = useMemo(() => {
    return lessonStatuses
      .filter(status => status.updatedAt)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime()
      );
  }, [lessonStatuses]);

  const assessmentEntries = useMemo(() => {
    return [...studentAssessments].sort(
      (a, b) =>
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }, [studentAssessments]);

  const overviewStats = useMemo(() => {
    const totalLessons = lessonStatuses.length;
    const masteredCount = lessonStatuses.filter(status => status.masteryLevel === 'mastered').length;
    const completedCount = lessonStatuses.filter(status =>
      ['completed', 'mastered'].includes(status.masteryLevel)
    ).length;
    const inProgressCount = lessonStatuses.filter(status => status.masteryLevel === 'in_progress').length;
    const notStartedCount = lessonStatuses.filter(status => status.masteryLevel === 'not_started').length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const lastActivityDate = activityEntries[0]?.updatedAt
      ? new Date(activityEntries[0].updatedAt).toLocaleDateString()
      : 'N/A';
    const lastAssessmentDate = assessmentEntries[0]?.createdAt
      ? new Date(assessmentEntries[0].createdAt).toLocaleDateString()
      : 'N/A';

    return {
      totalLessons,
      masteredCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      progressPercent,
      assessmentsCount: studentAssessments.length,
      commentsCount: studentComments.length,
      lastActivityDate,
      lastAssessmentDate
    };
  }, [lessonStatuses, studentAssessments, studentComments, activityEntries, assessmentEntries]);

  const visibleActivityEntries = showAllActivity
    ? activityEntries
    : activityEntries.slice(0, ACTIVITY_PREVIEW_COUNT);
  const hasMoreActivity = activityEntries.length > ACTIVITY_PREVIEW_COUNT;

  const visibleAssessmentEntries = showAllAssessments
    ? assessmentEntries
    : assessmentEntries.slice(0, ASSESSMENT_PREVIEW_COUNT);
  const hasMoreAssessments = assessmentEntries.length > ASSESSMENT_PREVIEW_COUNT;

  const {
    progressPercent,
    masteredCount,
    completedCount,
    inProgressCount,
    notStartedCount,
    assessmentsCount,
    commentsCount,
    lastActivityDate,
    lastAssessmentDate
  } = overviewStats;

  const formatMasteryLabel = (mastery: string) => {
    return masteryLabelMap[mastery] || mastery;
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId) {
      setCommentError('Impossible de retrouver cet élève pour le moment.');
      return;
    }
    if (!newComment.trim()) {
      setCommentError('Ajoutez un commentaire avant de valider.');
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const response = await fetch(`/api/students/${studentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setStudentComments(prev => [data.data as StudentComment, ...prev]);
        setNewComment('');
      } else {
        setCommentError(data.message || 'Impossible d’enregistrer le commentaire.');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      setCommentError('Impossible d’enregistrer le commentaire.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!student || !studentId) return;
    const confirmed = window.confirm(
      'Supprimer définitivement cet élève ? Toutes les copies, commentaires et statuts associés seront supprimés.'
    );
    if (!confirmed) return;

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        router.push('/classes');
      } else {
        setDeleteError(data.message || 'Impossible de supprimer cet élève.');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      setDeleteError('Une erreur est survenue pendant la suppression.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleScrollToParcours = () => {
    clearQuickActionFeedback();
    parcoursSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setQuickActionMessage('Parcours d’apprentissage affiché.');
  };

  const handleScrollToTimeline = () => {
    clearQuickActionFeedback();
    timelineSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setQuickActionMessage('Section activités et copies affichée.');
  };

  const handleScrollToComments = () => {
    clearQuickActionFeedback();
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setQuickActionMessage('Section commentaires affichée.');
  };

  const handleRefreshStudentData = useCallback(async () => {
    clearQuickActionFeedback();
    try {
      await fetchStudent();
      setQuickActionMessage('Données élève actualisées.');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setQuickActionError('Impossible d’actualiser les données.');
    }
  }, [fetchStudent]);

  const handleCopyStudentLink = useCallback(async () => {
    clearQuickActionFeedback();
    try {
      if (typeof window === 'undefined' || !navigator?.clipboard) {
        throw new Error('CLIPBOARD_UNAVAILABLE');
      }
      await navigator.clipboard.writeText(window.location.href);
      setQuickActionMessage('Lien de la fiche élève copié.');
    } catch (error) {
      console.error('Copy student link failed:', error);
      setQuickActionError('Copie impossible sur cet appareil.');
    }
  }, []);

  const handleRegenerateSummaries = useCallback(async () => {
    if (!studentId) {
      setSummaryRefreshError('Impossible de relancer l’analyse sans identifiant élève.');
      return;
    }

    setSummaryRefreshing(true);
    setSummaryRefreshError(null);
    setSummaryRefreshMessage(null);

    try {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ studentId })
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setSummaries(data.data as StudentSummary[]);
        setSummaryRefreshMessage('Analyse IA mise à jour.');
      } else {
        setSummaryRefreshError(data.message || 'Impossible de relancer l’analyse.');
      }
    } catch (error) {
      console.error('Failed to regenerate summaries:', error);
      setSummaryRefreshError('Impossible de relancer l’analyse.');
    } finally {
      setSummaryRefreshing(false);
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded mb-6"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Élève introuvable</h1>
          <p className="text-gray-600">
            {loadError || 'Impossible de trouver l’élève demandé.'}
          </p>
          <Button variant="outline" onClick={fetchStudent}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center space-x-6">
          {/* Student Avatar */}
          <div className="relative">
            {student.avatarUrl ? (
              <img 
                src={student.avatarUrl} 
                alt={`Avatar de ${student.name}`}
                className="w-20 h-20 rounded-full object-cover border-4 border-blue-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center border-4 border-blue-200">
                <span className="text-white font-bold text-2xl">
                  {student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          {/* Student Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              {student.age && (
                <Badge variant="secondary">Âge {student.age}</Badge>
              )}
              <Badge variant="outline">{student.class?.name || 'Classe inconnue'}</Badge>
              <span className="text-gray-500 text-sm">
                ID : {student.id.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          disabled
          className="bg-gray-200 text-gray-500 cursor-not-allowed"
        >
          L’analyse IA apparaît après l’import d’une copie
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Vue d’ensemble</CardTitle>
              <CardDescription>
                Statut synthétique du parcours de {student.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      Progression globale
                    </span>
                    <span className="text-sm text-gray-600">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Leçons terminées', value: completedCount },
                    { label: 'Leçons maîtrisées', value: masteredCount },
                    { label: 'En cours', value: inProgressCount },
                    { label: 'À démarrer', value: notStartedCount }
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="text-xl font-semibold">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Examens importés</p>
                    <p className="text-xl font-semibold">{assessmentsCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Dernière copie : {lastAssessmentDate}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Commentaires partagés</p>
                    <p className="text-xl font-semibold">{commentsCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Dernière activité : {lastActivityDate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Graph with Student Progress */}
          <div ref={parcoursSectionRef} id="parcours-section">
            <h2 className="text-xl font-semibold mb-4">Parcours d’apprentissage</h2>
            {lessons.length > 0 ? (
              <ProgramGraph
                lessons={lessons}
                links={links}
                studentStatuses={lessonStatuses}
                onLessonClick={(lesson) => console.log('Clicked lesson:', lesson)}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun parcours attribué</h3>
                  <p className="text-gray-500">
                    Cet élève n’a pas encore de leçons assignées.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div ref={timelineSectionRef} id="timeline-section">
            <Card>
              <CardHeader>
                <CardTitle>Suivi des activités</CardTitle>
                <CardDescription>
                  Déroulez les sections pour consulter les statuts et les copies corrigées.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion
                  type="multiple"
                  defaultValue={['activity', 'assessments']}
                  className="rounded-lg border"
                >
                  <AccordionItem value="activity" className="px-4">
                    <AccordionTrigger className="px-0">
                      <div className="flex w-full items-center justify-between">
                        <span>Activité récente</span>
                        <span className="text-xs text-gray-500">{activityEntries.length}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {visibleActivityEntries.length > 0 ? (
                        <div className="space-y-4">
                          {visibleActivityEntries.map(status => (
                            <div
                              key={status.id}
                              className="flex flex-col gap-1 rounded-lg border bg-gray-50 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{status.lesson?.title}</p>
                                  <p className="text-sm text-gray-600">
                                    Nouveau statut : {formatMasteryLabel(status.masteryLevel)}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {status.updatedAt
                                    ? new Date(status.updatedAt).toLocaleDateString()
                                    : ''}
                                </span>
                              </div>
                              {status.notes && (
                                <p className="text-sm text-gray-500 border-t pt-2">
                                  Note : {status.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-gray-500">
                          Aucune activité récente enregistrée.
                        </div>
                      )}
                      {hasMoreActivity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowAllActivity(prev => !prev)}
                        >
                          {showAllActivity
                            ? 'Afficher moins d’activités'
                            : `Voir ${activityEntries.length - ACTIVITY_PREVIEW_COUNT} activité(s) supplémentaire(s)`}
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="assessments" className="px-4">
                    <AccordionTrigger className="px-0">
                      <div className="flex w-full items-center justify-between">
                        <span>Examens récents</span>
                        <span className="text-xs text-gray-500">{assessmentEntries.length}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {assessmentEntries.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">
                          Aucune copie importée pour l’instant.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {visibleAssessmentEntries.map(assessment => {
                            const insights = parseCopyInsights(assessment.gradedResponses);
                            const gradeDisplay =
                              insights.gradeText ||
                              (typeof assessment.overallScore === 'number' &&
                              typeof assessment.maxScore === 'number'
                                ? `${assessment.overallScore}/${assessment.maxScore}`
                                : 'Non renseignée');

                            return (
                              <div
                                key={assessment.id}
                                className="rounded-lg border bg-gray-50 p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {assessment.assessment?.title || 'Évaluation'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Note relevée : {gradeDisplay}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {assessment.createdAt
                                      ? new Date(assessment.createdAt).toLocaleDateString()
                                      : ''}
                                  </span>
                                </div>

                                {insights.adviceSummary.length > 0 && (
                                  <div>
                                    <p className="text-xs uppercase text-gray-400">Conseils clés</p>
                                    <ul className="mt-1 space-y-1 text-sm text-gray-700">
                                      {insights.adviceSummary.map((advice, index) => (
                                        <li key={index} className="flex gap-2">
                                          <span>•</span>
                                          <span>{advice}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {insights.programRecommendations.length > 0 && (
                                  <div>
                                    <p className="text-xs uppercase text-gray-400 mb-1">
                                      Axes du programme
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {insights.programRecommendations.map((recommendation, index) => (
                                        <Badge
                                          key={`${assessment.id}-rec-${index}`}
                                          variant="outline"
                                          className="whitespace-normal break-words text-left leading-tight flex-wrap justify-start"
                                        >
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
                                      {insights.questions.slice(0, 3).map((question, idx) => (
                                        <li key={idx} className="border rounded-md p-2 bg-white">
                                          <p className="font-medium">
                                            Q{question.number || idx + 1} : {question.questionText}
                                          </p>
                                          {question.studentAnswer && (
                                            <p className="text-sm">Élève : {question.studentAnswer}</p>
                                          )}
                                          {question.teacherComment && (
                                            <p className="text-sm">Note prof : {question.teacherComment}</p>
                                          )}
                                          {question.improvementAdvice && (
                                            <p className="text-sm">
                                              Conseil : {question.improvementAdvice}
                                            </p>
                                          )}
                                          {!question.improvementAdvice && question.feedback && (
                                            <p className="text-sm">
                                              Conseil : {question.feedback}
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {hasMoreAssessments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowAllAssessments(prev => !prev)}
                        >
                          {showAllAssessments
                            ? 'Afficher moins de copies'
                            : `Voir ${assessmentEntries.length - ASSESSMENT_PREVIEW_COUNT} copie(s) supplémentaire(s)`}
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Teacher Comments */}
          <div ref={commentsSectionRef} id="commentaires-section">
            <Card>
              <CardHeader>
                <CardTitle>Commentaires du professeur</CardTitle>
                <CardDescription>
                  Gardez une trace des points d’attention, objectifs et retours partagés en classe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Ajouter un commentaire personnalisé
                    </label>
                    <Textarea
                      value={newComment}
                      onChange={event => setNewComment(event.target.value)}
                      placeholder="Exemple : « Revoir les fractions équivalentes avant le prochain contrôle »"
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  {commentError && (
                    <p className="text-sm text-red-600">{commentError}</p>
                  )}
                  <Button type="submit" disabled={commentSubmitting}>
                    {commentSubmitting ? 'Enregistrement…' : 'Publier le commentaire'}
                  </Button>
                </form>

                <div className="pt-4 border-t border-gray-100 space-y-3" aria-live="polite">
                  {studentComments.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Aucun commentaire pour le moment. Utilisez ce bloc pour partager vos retours pédagogiques.
                    </p>
                  ) : (
                    studentComments.map(comment => (
                      <div key={comment.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>{comment.teacher?.name || 'Enseignant·e'}</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Summary Box */}
          <AISummaryBox
            summaries={summaries}
            loading={loading}
            onRefresh={handleRegenerateSummaries}
            refreshing={summaryRefreshing}
            refreshError={summaryRefreshError}
            refreshMessage={summaryRefreshMessage}
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques rapides</CardTitle>
              <CardDescription>Indicateurs calculés à partir des statuts enregistrés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Leçons assignées</span>
                <span className="font-medium">{lessonStatuses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Score moyen</span>
                <span className="font-medium">
                  {lessonStatuses.filter(s => s.score).length > 0
                    ? Math.round(
                        lessonStatuses
                          .filter(s => s.score)
                          .reduce((sum, s) => sum + (s.score || 0), 0) /
                        lessonStatuses.filter(s => s.score).length
                      ) + '%'
                    : 'N/D'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ancienneté dans la classe</span>
                <span className="font-medium">
                  {Math.floor(
                    (new Date().getTime() - new Date(student.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  jours
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dernière mise à jour</span>
                <span className="font-medium">
                  {new Date(student.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
              <CardDescription>Accédez instantanément aux sections utiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleRefreshStudentData}
              >
                <RefreshCcw className="h-4 w-4" />
                Actualiser les données
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleScrollToParcours}
              >
                <Activity className="h-4 w-4" />
                Voir le parcours
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleScrollToTimeline}
              >
                <FileText className="h-4 w-4" />
                Ouvrir les activités
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleScrollToComments}
              >
                <MessageSquare className="h-4 w-4" />
                Ajouter un commentaire
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleCopyStudentLink}
              >
                <LinkIcon className="h-4 w-4" />
                Copier le lien élève
              </Button>

              {quickActionMessage && (
                <p className="text-xs text-green-600 text-center">{quickActionMessage}</p>
              )}
              {quickActionError && (
                <p className="text-xs text-red-600 text-center">{quickActionError}</p>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-100">
                {deleteError && (
                  <p className="text-sm text-red-600">{deleteError}</p>
                )}
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDeleteStudent}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? 'Suppression…' : 'Supprimer cet élève'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}