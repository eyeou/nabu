"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AISummaryBox from '@/components/AISummaryBox';
import ProgramGraph from '@/components/ProgramGraph';
import { Student, StudentLessonStatus, StudentSummary, Lesson, LessonLink } from '@/types';

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [lessonStatuses, setLessonStatuses] = useState<StudentLessonStatus[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [links, setLinks] = useState<LessonLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      const data = await response.json();

      if (data.success) {
        setStudent(data.data);
        setSummaries(data.data.summaries || []);
        setLessonStatuses(data.data.lessonStatuses || []);
        
        // Extract lessons from lesson statuses
        const uniqueLessons = data.data.lessonStatuses?.map((status: StudentLessonStatus) => status.lesson).filter(Boolean) || [];
        setLessons(uniqueLessons);
        
        // For now, we'll use empty links - in a real app, you'd fetch these
        setLinks([]);
      }
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();
      if (data.success) {
        setSummaries(data.data);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getOverallProgress = () => {
    if (lessonStatuses.length === 0) return 0;
    
    const completedCount = lessonStatuses.filter(status => 
      ['completed', 'mastered'].includes(status.masteryLevel)
    ).length;
    
    return Math.round((completedCount / lessonStatuses.length) * 100);
  };

  const getMasteryDistribution = () => {
    const distribution = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      mastered: 0
    };

    lessonStatuses.forEach(status => {
      distribution[status.masteryLevel as keyof typeof distribution]++;
    });

    return distribution;
  };

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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Student Not Found</h1>
          <p className="text-gray-600">The requested student could not be found.</p>
        </div>
      </div>
    );
  }

  const masteryDistribution = getMasteryDistribution();

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
                alt={`${student.name}'s avatar`}
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
                <Badge variant="secondary">Age {student.age}</Badge>
              )}
              <Badge variant="outline">{student.class?.name || 'Unknown Class'}</Badge>
              <span className="text-gray-500 text-sm">
                ID: {student.id.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleGenerateSummary} 
          disabled={generatingSummary}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {generatingSummary ? 'Generating...' : 'Generate AI Analysis'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600">{getOverallProgress()}%</span>
                  </div>
                  <Progress value={getOverallProgress()} className="h-3" />
                </div>

                {/* Mastery Distribution */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">{masteryDistribution.not_started}</div>
                    <div className="text-sm text-gray-600">Not Started</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{masteryDistribution.in_progress}</div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{masteryDistribution.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{masteryDistribution.mastered}</div>
                    <div className="text-sm text-gray-600">Mastered</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Graph with Student Progress */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Learning Path Progress</h2>
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
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Learning Path Assigned</h3>
                  <p className="text-gray-500">
                    This student hasn't been assigned to any lessons yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {lessonStatuses.length > 0 ? (
                <div className="space-y-4">
                  {lessonStatuses
                    .filter(status => status.updatedAt)
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 5)
                    .map(status => (
                      <div key={status.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{status.lesson?.title}</h4>
                          <p className="text-sm text-gray-600">
                            Status changed to {status.masteryLevel.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(status.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Summary Box */}
          <AISummaryBox
            summaries={summaries}
            loading={generatingSummary}
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Lessons Assigned</span>
                <span className="font-medium">{lessonStatuses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Score</span>
                <span className="font-medium">
                  {lessonStatuses.filter(s => s.score).length > 0
                    ? Math.round(lessonStatuses.filter(s => s.score).reduce((sum, s) => sum + (s.score || 0), 0) / lessonStatuses.filter(s => s.score).length) + '%'
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time in Class</span>
                <span className="font-medium">
                  {Math.floor((new Date().getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-medium">
                  {new Date(student.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full">
                Update Progress
              </Button>
              <Button variant="outline" className="w-full">
                Add Notes
              </Button>
              <Button variant="outline" className="w-full">
                View Full Report
              </Button>
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                Remove from Class
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}