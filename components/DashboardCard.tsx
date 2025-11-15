"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardCardProps {
  title: string;
  count: number;
  description: string;
  buttonText: string;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export default function DashboardCard({
  title,
  count,
  description,
  buttonText,
  onClick,
  icon,
  color = 'blue'
}: DashboardCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'from-green-50 to-green-100 border-green-200 text-green-800';
      case 'purple':
        return 'from-purple-50 to-purple-100 border-purple-200 text-purple-800';
      case 'orange':
        return 'from-orange-50 to-orange-100 border-orange-200 text-orange-800';
      default:
        return 'from-blue-50 to-blue-100 border-blue-200 text-blue-800';
    }
  };

  const getIconColor = () => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'purple': return 'bg-purple-500';
      case 'orange': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 bg-gradient-to-br ${getColorClasses()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {icon && (
            <div className={`w-10 h-10 rounded-lg ${getIconColor()} flex items-center justify-center text-white`}>
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-3xl font-bold">{count}</div>
          <p className="text-sm opacity-80">{description}</p>
        </div>
        
        <Button 
          onClick={onClick}
          variant="secondary" 
          className="w-full bg-white/50 hover:bg-white/80 backdrop-blur-sm"
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}