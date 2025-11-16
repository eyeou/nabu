"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentRegistryUpload, { ExtractedStudent } from '@/components/StudentRegistryUpload';

type Step = 'class-info' | 'add-students' | 'upload-registry';

export default function CreateClassPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('class-info');
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdClassId, setCreatedClassId] = useState<string>('');
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedClassId(data.data.id);
        setStep('add-students');
      }
    } catch (err) {
      console.error('Failed to create class:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStudentsExtracted = (students: ExtractedStudent[]) => {
    setExtractedStudents(students);
    handleBulkCreateStudents(students);
  };

  const handleBulkCreateStudents = async (students: ExtractedStudent[]) => {
    setIsCreating(true);

    try {
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: createdClassId,
          students
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/classes/${createdClassId}`);
      }
    } catch (err) {
      console.error('Failed to create students:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkipStudents = () => {
    router.push(`/classes/${createdClassId}`);
  };

  if (step === 'upload-registry') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setStep('add-students')}
            className="text-gray-500 hover:text-gray-700 mb-8 text-sm"
          >
            ← Back
          </button>

          <StudentRegistryUpload
            onStudentsExtracted={handleStudentsExtracted}
            onCancel={() => setStep('add-students')}
          />
        </div>
      </div>
    );
  }

  if (step === 'add-students') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => router.push(`/classes/${createdClassId}`)}
            className="text-gray-500 hover:text-gray-700 mb-8 text-sm"
          >
            ← Skip to class
          </button>

          <div className="bg-white rounded-2xl p-12 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">👥</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Add Students</h1>
              <p className="text-gray-500 mt-2">
                Class "{name}" created successfully!
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep('upload-registry')}
                className="w-full px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>📄</span>
                Import from Registry
              </button>

              <button
                onClick={handleSkipStudents}
                className="w-full px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Add Students Later
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-6">
              You can also add students manually from the class page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 mb-8 text-sm"
        >
          ← Back
        </button>

        <div className="bg-white rounded-2xl p-12 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">🏫</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">New Class</h1>
          </div>

          <form onSubmit={handleCreateClass} className="space-y-6">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Class name"
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                disabled={isCreating}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="flex-1 px-6 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
