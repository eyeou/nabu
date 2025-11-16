"use client";

import { ProgramGraphProps } from '@/types';
import CircleNode from './CircleNode';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ProgramGraph({
  lessons,
  links,
  onLessonClick,
  studentStatuses = []
}: ProgramGraphProps) {
  
  const getStudentStatusForLesson = (lessonId: string) => {
    const status = studentStatuses.find(s => s.lessonId === lessonId);
    return status?.masteryLevel || 'not_started';
  };

  const renderLessonConnections = () => {
    return links.map(link => {
      const fromLesson = lessons.find(l => l.id === link.fromLessonId);
      const toLesson = lessons.find(l => l.id === link.toLessonId);
      
      if (!fromLesson || !toLesson) return null;

      // Calculate connection line (simplified - in production you'd use SVG)
      return (
        <div
          key={link.id}
          className="absolute w-px h-8 bg-gray-300 transform origin-top"
          style={{
            left: '50%',
            top: '50%',
          }}
        />
      );
    });
  };

  if (lessons.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Graphe du programme</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Aucune leçon créée pour l’instant</p>
            <p className="text-sm text-gray-400">
              Commencez à construire votre programme en ajoutant des leçons
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Graphe du programme</CardTitle>
        <Button variant="outline" size="sm">
          Ajouter un lien
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Lesson Grid Layout */}
        <div className="relative">
          {renderLessonConnections()}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 p-4">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="flex justify-center">
                <CircleNode
                  id={lesson.id}
                  title={lesson.title}
                  type="lesson"
                  status={getStudentStatusForLesson(lesson.id)}
                  onClick={() => onLessonClick?.(lesson)}
                  className="transition-transform hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Graph Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Légende des statuts :</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span>Non commencé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>En cours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Terminé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span>Maîtrisé</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Cliquez sur un nœud pour modifier son contenu, sa description ou ses évaluations.
            Utilisez « Ajouter un lien » pour représenter les prérequis entre les leçons.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}