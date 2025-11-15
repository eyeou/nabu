"use client";

import { StudentCardProps } from '@/types';
import { Card } from '@/components/ui/card';

export default function StudentCard({ student, onClick }: StudentCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex flex-col items-center space-y-3">
        {/* Student Avatar */}
        {student.avatarUrl ? (
          <img 
            src={student.avatarUrl} 
            alt={`${student.name}'s avatar`}
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center border-4 border-blue-200">
            <span className="text-white font-bold text-lg">
              {getInitials(student.name)}
            </span>
          </div>
        )}
        
        {/* Student Info */}
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 truncate max-w-32" title={student.name}>
            {student.name}
          </h3>
          {student.age && (
            <p className="text-sm text-gray-500">Age {student.age}</p>
          )}
        </div>
        
        {/* Quick Status Indicator */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-gray-500">Active</span>
        </div>
      </div>
    </Card>
  );
}