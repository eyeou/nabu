"use client";

import { CircleNodeProps } from '@/types';
import { cn } from '@/lib/utils';

export default function CircleNode({
  title,
  type,
  status = 'default',
  onClick,
  className
}: CircleNodeProps) {
  const getStatusColor = () => {
    if (type === 'student') {
      return 'bg-blue-500 hover:bg-blue-600 border-blue-300';
    }
    
    switch (status) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600 border-green-300';
      case 'in_progress':
        return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-300';
      case 'mastered':
        return 'bg-purple-500 hover:bg-purple-600 border-purple-300';
      case 'not_started':
        return 'bg-gray-300 hover:bg-gray-400 border-gray-200';
      default:
        return 'bg-slate-500 hover:bg-slate-600 border-slate-300';
    }
  };

  const getStatusText = () => {
    if (type === 'student') return '';
    
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '⋯';
      case 'mastered': return '★';
      case 'not_started': return '';
      default: return '';
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center cursor-pointer transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "w-20 h-20 rounded-full border-4 flex items-center justify-center text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-200",
          getStatusColor()
        )}
      >
        {type === 'student' ? (
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/40"></div>
          </div>
        ) : (
          <span className="text-lg">{getStatusText()}</span>
        )}
      </div>
      
      <div className="mt-2 text-center max-w-24">
        <p className="text-sm font-medium text-gray-900 truncate" title={title}>
          {title}
        </p>
        {status !== 'default' && type === 'lesson' && (
          <p className="text-xs text-gray-500 capitalize">
            {status.replace('_', ' ')}
          </p>
        )}
      </div>
    </div>
  );
}