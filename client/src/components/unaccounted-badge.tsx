import { AlertCircle } from 'lucide-react';
import { formatHours } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

type UnaccountedBadgeProps = {
  unaccountedMinutes: number;
  totalMinutes: number; // Total minutes in the period (typically 1440 for a day)
  showProgress?: boolean;
  className?: string;
};

export default function UnaccountedBadge({ 
  unaccountedMinutes, 
  totalMinutes, 
  showProgress = true, 
  className = '' 
}: UnaccountedBadgeProps) {
  // Don't show anything if there's no unaccounted time
  if (unaccountedMinutes <= 0) return null;
  
  const unaccountedHours = unaccountedMinutes / 60;
  const unaccountedPercentage = (unaccountedMinutes / totalMinutes) * 100;
  const accountedPercentage = 100 - unaccountedPercentage;
  
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
              <AlertCircle className="h-3 w-3" />
              <span>Unaccounted: {formatHours(unaccountedHours)}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>There are {formatHours(unaccountedHours)} not allocated to any category.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showProgress && (
        <div className="w-full flex flex-col space-y-1">
          <Progress 
            value={accountedPercentage} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Accounted: {accountedPercentage.toFixed(0)}%</span>
            <span>Unaccounted: {unaccountedPercentage.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}