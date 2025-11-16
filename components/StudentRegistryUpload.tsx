"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Papa from 'papaparse';

export interface ExtractedStudent {
  name: string;
  age?: number;
}

interface StudentRegistryUploadProps {
  onStudentsExtracted: (students: ExtractedStudent[]) => void;
  onCancel?: () => void;
}

export default function StudentRegistryUpload({
  onStudentsExtracted,
  onCancel
}: StudentRegistryUploadProps): React.ReactElement {
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const [error, setError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length > 2) {
      setError('Maximum 2 files allowed');
      return;
    }

    const validFiles = selectedFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'text/csv'];
      return validTypes.includes(file.type) || file.name.endsWith('.csv');
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('Only JPG, PNG, and CSV files are allowed');
      return;
    }

    setFiles(validFiles);
    setError('');
  };

  const parseCSV = async (file: File): Promise<ExtractedStudent[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const students: ExtractedStudent[] = [];
            
            for (const row of results.data as any[]) {
              // Try to find name and age fields (case-insensitive)
              const nameField = Object.keys(row).find(key => 
                key.toLowerCase().includes('name') || key.toLowerCase() === 'student'
              );
              const ageField = Object.keys(row).find(key => 
                key.toLowerCase().includes('age')
              );

              if (nameField && row[nameField]) {
                const name = String(row[nameField]).trim();
                const age = ageField && row[ageField] ? parseInt(String(row[ageField])) : undefined;

                if (name) {
                  students.push({
                    name,
                    age: age && !isNaN(age) ? age : undefined
                  });
                }
              }
            }

            resolve(students);
          } catch (err) {
            reject(new Error('Failed to parse CSV file'));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  };

  const convertFilesToDataUrls = async (files: File[]): Promise<string[]> => {
    const dataUrls: string[] = [];

    for (const file of files) {
      console.log(`🔄 Processing file: ${file.name} (${file.type})`);
      
      if (file.type.startsWith('image/')) {
        // For images, convert to data URL
        console.log('🖼️ Processing image file...');
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        dataUrls.push(dataUrl);
        console.log(`✅ Added image (${(dataUrl.length / 1024).toFixed(1)} KB)`);
      } else {
        console.warn(`⚠️ Skipping unsupported file type: ${file.type}`);
      }
    }

    console.log(`✅ Total data URLs prepared: ${dataUrls.length}`);
    return dataUrls;
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      // Check if any file is CSV
      const csvFile = files.find(f => f.type === 'text/csv' || f.name.endsWith('.csv'));
      
      if (csvFile) {
        // Handle CSV directly
        const students = await parseCSV(csvFile);
        setExtractedStudents(students);
        setShowPreview(true);
      } else {
        // Handle images with AI extraction
        const imageUrls = await convertFilesToDataUrls(files);

        const response = await fetch('/api/students/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ imageUrls })
        });

        const data = await response.json();

        if (data.success) {
          setExtractedStudents(data.data.students);
          setShowPreview(true);
        } else {
          setError(data.message || 'Failed to extract students');
        }
      }
    } catch (err) {
      console.error('Extract error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract students from registry');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStudentChange = (index: number, field: 'name' | 'age', value: string) => {
    const updated = [...extractedStudents];
    if (field === 'name') {
      updated[index].name = value;
    } else {
      const ageNum = parseInt(value);
      updated[index].age = isNaN(ageNum) ? undefined : ageNum;
    }
    setExtractedStudents(updated);
  };

  const handleRemoveStudent = (index: number) => {
    setExtractedStudents(extractedStudents.filter((_, i) => i !== index));
  };

  const handleAddStudent = () => {
    setExtractedStudents([...extractedStudents, { name: '', age: undefined }]);
  };

  const handleConfirm = () => {
    const validStudents = extractedStudents.filter(s => s.name.trim().length > 0);
    if (validStudents.length === 0) {
      setError('At least one student with a name is required');
      return;
    }
    onStudentsExtracted(validStudents);
  };

  if (showPreview) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Review Extracted Students</CardTitle>
          <p className="text-sm text-gray-500">
            Review and edit the extracted student information before creating them.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedStudents.map((student, index) => (
              <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label htmlFor={`name-${index}`} className="text-xs">
                      Name *
                    </Label>
                    <Input
                      id={`name-${index}`}
                      value={student.name}
                      onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                      placeholder="Student name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`age-${index}`} className="text-xs">
                      Age (optional)
                    </Label>
                    <Input
                      id={`age-${index}`}
                      type="number"
                      value={student.age || ''}
                      onChange={(e) => handleStudentChange(index, 'age', e.target.value)}
                      placeholder="Age"
                      className="mt-1"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStudent(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddStudent}
            className="w-full"
          >
            + Add Another Student
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setExtractedStudents([]);
                setFiles([]);
              }}
              className="flex-1"
            >
              Start Over
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={extractedStudents.filter(s => s.name.trim()).length === 0}
            >
              Confirm & Create Students
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Class Registry</CardTitle>
        <p className="text-sm text-gray-500">
          Upload photos (JPG/PNG) or CSV of your class registry (max 2 files). We'll automatically extract student names and ages.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="registry-files">Select Files</Label>
          <Input
            id="registry-files"
            type="file"
            accept=".jpg,.jpeg,.png,.csv"
            multiple
            onChange={handleFileChange}
            className="mt-2"
            disabled={isExtracting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: JPG, PNG, CSV (max 2 files)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Tip: CSV files are processed instantly. Photos use AI extraction.
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files:</Label>
            <ul className="text-sm space-y-1">
              {files.map((file, index) => (
                <li key={index} className="text-gray-600">
                  • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isExtracting}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleExtract}
            disabled={files.length === 0 || isExtracting}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            {isExtracting ? 'Extracting...' : 'Extract Students'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
