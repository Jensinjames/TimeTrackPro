import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock } from 'lucide-react';

interface UnaccountedBadgeProps {
  unaccountedMinutes: number;
  totalMinutes: number;
  className?: string;
}

export default function UnaccountedBadge({
  unaccountedMinutes, 
  totalMinutes,
  className
}: UnaccountedBadgeProps) {
  // Convert minutes to hours for display
  const unaccountedHours = (unaccountedMinutes / 60).toFixed(1);
  
  // Calculate percentage of unaccounted time
  const percentage = ((unaccountedMinutes / totalMinutes) * 100).toFixed(1);
  
  // Determine severity level based on unaccounted percentage
  const getSeverityColor = () => {
    if (parseFloat(percentage) > 30) return 'bg-red-100 text-red-800 border-red-300';
    if (parseFloat(percentage) > 15) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };
  
  return (
    <div 
      className={cn(
        'flex items-center gap-2 p-3 rounded-md border',
        getSeverityColor(),
        className
      )}
    >
      <div className="shrink-0">
        <Clock className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-medium">
          {unaccountedHours} hours ({percentage}%) unaccounted for
        </p>
        <p className="text-sm mt-0.5">
          {parseFloat(percentage) > 15 
            ? "Try to log more of your activities for better insights"
            : "Good job tracking your time!"}
        </p>
      </div>
      {parseFloat(percentage) > 15 && (
        <div className="shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}