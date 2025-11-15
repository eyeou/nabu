"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateProgramPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Program title is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/programs/${data.data.id}`);
      } else {
        setError(data.message || 'Failed to create program');
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
        <h1 className="text-3xl font-bold text-gray-900">Create New Program</h1>
        <p className="text-gray-600 mt-2">
          Design a learning program with interconnected lessons for your students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Program Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Mathematics Fundamentals, Reading Comprehension..."
                required
                disabled={isCreating}
              />
              <p className="text-sm text-gray-500">
                Choose a clear, descriptive name for your learning program.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Program Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the goals, objectives, and scope of this program..."
                rows={4}
                disabled={isCreating}
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                Explain what students will learn and achieve through this program.
              </p>
            </div>

            {/* Program Creation Tips */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">💡 Program Creation Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Start with a clear learning objective</li>
                <li>• Break complex topics into manageable lessons</li>
                <li>• Consider prerequisite relationships between lessons</li>
                <li>• Plan for different learning levels and paces</li>
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
                disabled={isCreating || !formData.title.trim()}
              >
                {isCreating ? 'Creating Program...' : 'Create Program'}
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
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">1</div>
              <span>Add lessons to your program</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">2</div>
              <span>Connect lessons with learning relationships</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">3</div>
              <span>Add test data and assessment materials</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">4</div>
              <span>Assign to classes and track student progress</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}