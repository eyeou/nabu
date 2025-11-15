"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import StudentCard from '@/components/StudentCard';
import { Class, Student } from '@/types';

export default function ClassManagementPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    age: ''
  });

  useEffect(() => {
    fetchClass();
  }, [classId]);

  const fetchClass = async () => {
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
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) return;

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId,
          name: newStudent.name.trim(),
          age: newStudent.age ? parseInt(newStudent.age) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setStudents([...students, data.data]);
        setNewStudent({ name: '', age: '' });
        setShowAddStudent(false);
      }
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const generateMissingStudents = async () => {
    const studentsNeeded = 30 - students.length;
    if (studentsNeeded <= 0) return;

    try {
      const studentPromises = Array.from({ length: studentsNeeded }, (_, index) => {
        const studentNumber = students.length + index + 1;
        return fetch('/api/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            classId,
            name: `Student ${studentNumber}`,
            age: Math.floor(Math.random() * 5) + 8 // Ages 8-12
          })
        });
      });

      const responses = await Promise.all(studentPromises);
      const newStudents = await Promise.all(
        responses.map(response => response.json())
      );

      const successfulStudents = newStudents
        .filter(result => result.success)
        .map(result => result.data);

      setStudents([...students, ...successfulStudents]);
    } catch (error) {
      console.error('Failed to generate students:', error);
    }
  };

  const handleStudentClick = (student: Student) => {
    router.push(`/students/${student.id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Class Not Found</h1>
          <p className="text-gray-600">The requested class could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
          <p className="text-gray-600 mt-2">
            {students.length} of 30 students enrolled
          </p>
        </div>
        
        <div className="flex gap-3">
          {students.length < 30 && (
            <Button variant="outline" onClick={generateMissingStudents}>
              Fill to 30 Students
            </Button>
          )}
          
          <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
            <DialogTrigger asChild>
              <Button>Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    placeholder="Enter student name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentAge">Age (optional)</Label>
                  <Input
                    id="studentAge"
                    type="number"
                    min="5"
                    max="18"
                    value={newStudent.age}
                    onChange={(e) => setNewStudent({...newStudent, age: e.target.value})}
                    placeholder="Enter student age"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowAddStudent(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStudent} disabled={!newStudent.name.trim()}>
                    Add Student
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Class Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{students.length}/30</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Average Age</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {students.length > 0 
                ? Math.round(students.filter(s => s.age).reduce((sum, s) => sum + (s.age || 0), 0) / students.filter(s => s.age).length) || 'N/A'
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Progress Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0%</div>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Class Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">No Students Yet</h3>
              <p className="text-gray-500 mb-6">
                Start by adding students to your class to begin tracking their progress.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setShowAddStudent(true)}>
                  Add First Student
                </Button>
                <Button variant="outline" onClick={generateMissingStudents}>
                  Generate 30 Students
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {students.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onClick={() => handleStudentClick(student)}
                />
              ))}
              
              {/* Empty slots to show remaining capacity */}
              {students.length < 30 && Array.from({ length: 30 - students.length }, (_, index) => (
                <Card 
                  key={`empty-${index}`} 
                  className="p-4 border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors"
                  onClick={() => setShowAddStudent(true)}
                >
                  <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                    <div className="text-2xl mb-1">+</div>
                    <span className="text-xs">Add Student</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}