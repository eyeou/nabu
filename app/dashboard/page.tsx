"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Program, Class } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'programs';
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [programsRes, classesRes] = await Promise.all([
        fetch('/api/programs'),
        fetch('/api/classes')
      ]);
      
      const programsData = await programsRes.json();
      const classesData = await classesRes.json();

      if (programsData.success) setPrograms(programsData.data || []);
      if (classesData.success) setClasses(classesData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Toggle */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-8 py-4">
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard?view=programs')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                view === 'programs'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Programmes
            </button>
            <button
              onClick={() => router.push('/dashboard?view=classes')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                view === 'classes'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Classes
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 py-12">
        {view === 'programs' ? (
          <div>
            {/* Programs View */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Programmes</h1>
              <button
                onClick={handleCreateProgram}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                + Nouveau programme
              </button>
            </div>

            {programs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-4">Aucun programme pour le moment</div>
                <button
                  onClick={handleCreateProgram}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Créer le premier programme
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {programs.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => router.push(`/programs/${program.id}`)}
                    className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-gray-100 hover:border-blue-300 text-left"
                  >
                    {/* Circles representing lessons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {program.lessons && program.lessons.length > 0 ? (
                        program.lessons.slice(0, 12).map((lesson) => (
                          <div
                            key={lesson.id}
                            className="w-10 h-10 rounded-full bg-blue-400 hover:bg-blue-500 transition-colors"
                            title={lesson.title}
                          ></div>
                        ))
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {program.title}
                    </h3>
                    
                    {program.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Classes View */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Classes</h1>
              <button
                onClick={handleCreateClass}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                + Nouvelle classe
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-4">Aucune classe pour le moment</div>
                <button
                  onClick={handleCreateClass}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Créer la première classe
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => router.push(`/classes/${cls.id}`)}
                    className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-gray-100 hover:border-green-300 text-left"
                  >
                    {/* Circles representing students */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {cls.students && cls.students.length > 0 ? (
                        cls.students.slice(0, 12).map((student) => (
                          <div
                            key={student.id}
                            className="w-10 h-10 rounded-full bg-green-400 hover:bg-green-500 transition-colors"
                            title={student.name}
                          ></div>
                        ))
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {cls.name}
                    </h3>
                    
                    <p className="text-sm text-gray-500">
                      {cls.students?.length || 0} élèves
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
