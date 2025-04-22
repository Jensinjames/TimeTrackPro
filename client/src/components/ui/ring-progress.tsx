import { cn } from "@/lib/utils";

interface RingProgressProps {
  progress: number;
  color?: string;
  className?: string;
  size?: string;
  strokeWidth?: number;
  showLabel?: boolean;
  labelClassName?: string;
}

export default function RingProgress({
  progress,
  color = "#16A34A",
  className,
  size = "w-32 h-32",
  strokeWidth = 2,
  showLabel = true,
  labelClassName,
}: RingProgressProps) {
  // Calculate circle properties
  const radius = 15.915; // Smaller than viewBox to account for stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={cn("relative", size, className)}>
      <svg className="w-full h-full" viewBox="0 0 36 36">
        {/* Background circle */}
        <circle 
          cx="18" 
          cy="18" 
          r={radius} 
          fill="none" 
          stroke="#e6e6e6" 
          strokeWidth={strokeWidth} 
        />
        
        {/* Progress circle */}
        <circle 
          className="progress-ring transform -rotate-90 origin-center"
          cx="18" 
          cy="18" 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-xl font-bold", labelClassName)}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}
