"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardCard from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Program, Class } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch programs
      const programsResponse = await fetch('/api/programs');
      const programsData = await programsResponse.json();
      
      // Fetch classes
      const classesResponse = await fetch('/api/classes');
      const classesData = await classesResponse.json();

      if (programsData.success) setPrograms(programsData.data || []);
      if (classesData.success) setClasses(classesData.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = () => {
    router.push('/programs/create');
  };

  const handleCreateClass = () => {
    router.push('/classes/create');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your programs and classes from one central location
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Programs"
          count={programs.length}
          description="Learning programs created"
          buttonText="Create Program"
          onClick={handleCreateProgram}
          color="blue"
          icon={
            <div className="text-lg">📚</div>
          }
        />
        
        <DashboardCard
          title="Classes"
          count={classes.length}
          description="Active classes"
          buttonText="Create Class"
          onClick={handleCreateClass}
          color="green"
          icon={
            <div className="text-lg">🏫</div>
          }
        />
        
        <DashboardCard
          title="Students"
          count={classes.reduce((total, cls) => total + (cls.students?.length || 0), 0)}
          description="Total students enrolled"
          buttonText="View All"
          onClick={() => {}}
          color="purple"
          icon={
            <div className="text-lg">👥</div>
          }
        />
        
        <DashboardCard
          title="Lessons"
          count={programs.reduce((total, program) => total + (program.lessons?.length || 0), 0)}
          description="Total lessons created"
          buttonText="Manage"
          onClick={() => {}}
          color="orange"
          icon={
            <div className="text-lg">📖</div>
          }
        />
      </div>

      {/* Recent Programs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Programs</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCreateProgram}>
              Create New
            </Button>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-gray-500 mb-4">No programs created yet</p>
                <Button onClick={handleCreateProgram}>
                  Create Your First Program
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {programs.slice(0, 5).map(program => (
                  <div 
                    key={program.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/programs/${program.id}`)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{program.title}</h3>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {program.description || 'No description'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400">
                      {program.lessons?.length || 0} lessons
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Classes</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCreateClass}>
              Create New
            </Button>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🏫</div>
                <p className="text-gray-500 mb-4">No classes created yet</p>
                <Button onClick={handleCreateClass}>
                  Create Your First Class
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.slice(0, 5).map(cls => (
                  <div 
                    key={cls.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/classes/${cls.id}`)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(cls.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400">
                      {cls.students?.length || 0} students
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}