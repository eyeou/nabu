"use client";

import { useState } from 'react';
import { LessonEditorProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';

export default function LessonEditor({ lesson, onSave, onClose }: LessonEditorProps) {
  const [formData, setFormData] = useState({
    title: lesson.title || '',
    description: lesson.description || '',
    testData: lesson.testData || ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save lesson:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Edit Lesson</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Lesson Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Lesson Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter lesson title..."
              className="w-full"
            />
          </div>

          {/* Lesson Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what students will learn in this lesson..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Test Data */}
          <div className="space-y-2">
            <Label htmlFor="testData">Test Data / Assessment Questions</Label>
            <Textarea
              id="testData"
              value={formData.testData}
              onChange={(e) => handleInputChange('testData', e.target.value)}
              placeholder="Add test questions, quizzes, or assessment data (JSON format supported)..."
              rows={6}
              className="w-full resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              This data will be used for AI-generated student summaries and progress tracking.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.title.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}