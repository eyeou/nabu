"use client";

import { AISummaryBoxProps } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AISummaryBox({ summaries, loading = false }: AISummaryBoxProps) {
  const parseJsonBulletPoints = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return jsonString.split('\n').filter(point => point.trim());
    }
  };

  const getSummaryIcon = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'strengths':
        return '💪';
      case 'weaknesses':
        return '📈';
      case 'recommendations':
        return '💡';
      default:
        return '📋';
    }
  };

  const getSummaryColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'strengths':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'weaknesses':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'recommendations':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Student Analysis
            <div className="animate-pulse w-4 h-4 bg-blue-400 rounded-full"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-100 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Student Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-gray-500 mb-4">No AI analysis available yet</p>
            <Button variant="outline" size="sm">
              Generate Analysis
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              AI will analyze student performance across all lessons
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Student Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {summaries.map(summary => {
          const bulletPoints = parseJsonBulletPoints(summary.bulletPointsJson);
          
          return (
            <div key={summary.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getSummaryIcon(summary.subject)}
                </span>
                <Badge 
                  variant="outline"
                  className={getSummaryColor(summary.subject)}
                >
                  {summary.subject.charAt(0).toUpperCase() + summary.subject.slice(1)}
                </Badge>
                <span className="text-xs text-gray-400">
                  Updated {new Date(summary.updatedAt).toLocaleDateString()}
                </span>
              </div>
              
              <ul className="space-y-2 ml-6">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        
        <div className="pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" className="w-full">
            Regenerate Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}