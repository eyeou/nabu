"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateClassPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (value: string) => {
    setFormData({ name: value });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Class name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/classes/${data.data.id}`);
      } else {
        setError(data.message || 'Failed to create class');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Class</h1>
        <p className="text-gray-600 mt-2">
          Set up a new class to manage and track student progress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="e.g., 3rd Grade Mathematics, Advanced Reading..."
                required
                disabled={isCreating}
              />
              <p className="text-sm text-gray-500">
                Choose a name that identifies the class level, subject, or academic year.
              </p>
            </div>

            {/* Class Setup Tips */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">🎯 Class Setup Tips</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Include grade level or subject in the name</li>
                <li>• Consider the academic term or year</li>
                <li>• Keep names clear and descriptive</li>
                <li>• You can add up to 30 students per class</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || !formData.name.trim()}
              >
                {isCreating ? 'Creating Class...' : 'Create Class'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Next Steps Preview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">1</div>
              <span>Add students to your class (up to 30)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">2</div>
              <span>Assign learning programs to students</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">3</div>
              <span>Track individual student progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">4</div>
              <span>Generate AI-powered learning insights</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Capacity Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="text-blue-600 text-lg">👥</div>
          <div>
            <h3 className="font-medium text-blue-900">Class Capacity</h3>
            <p className="text-sm text-blue-800">
              Each class can accommodate up to 30 students. You can add students individually
              or use our bulk generation feature to create placeholder students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}