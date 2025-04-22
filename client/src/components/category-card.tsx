import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatHours, formatPercent, getCategoryIcon, getCategoryColor } from "@/lib/utils";

interface CategoryCardProps {
  name: string;
  icon: string;
  goalHours: number;
  actualHours: number;
  progress: number;
}

export default function CategoryCard({
  name,
  icon,
  goalHours,
  actualHours,
  progress
}: CategoryCardProps) {
  const categoryColor = getCategoryColor(name);
  const iconClass = getCategoryIcon(icon);
  
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <div className={`h-8 w-8 rounded-md ${categoryColor.bg} text-white flex items-center justify-center mr-2`}>
            <i className={iconClass}></i>
          </div>
          <h3 className="font-medium">{name}</h3>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">Goal</span>
          <span className="font-medium">{formatHours(goalHours)}</span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">Actual</span>
          <span className="font-medium">{formatHours(actualHours)}</span>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium">{formatPercent(progress)}</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-gray-200"
            indicatorClassName={categoryColor.bg}
          />
        </div>
      </CardContent>
    </Card>
  );
}
