import { formatHours, formatPercent, getCategoryIcon, getCategoryColor } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CategoryCardProps {
  id: number;
  name: string;
  icon: string;
  color: string;
  goalHours: number;
  actualHours: number;
  progress: number;
  onClick: () => void;
  isSelected?: boolean;
}

export default function CategoryCard({
  id,
  name,
  icon,
  color,
  goalHours,
  actualHours,
  progress,
  onClick,
  isSelected = false
}: CategoryCardProps) {
  const colorStyles = getCategoryColor(color);
  
  return (
    <div 
      className={`rounded-lg transition-all cursor-pointer ${
        isSelected 
          ? `border-2 ${colorStyles.border} bg-white shadow-md`
          : 'border border-gray-200 bg-white hover:shadow-sm'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center mb-4">
          <div className={`h-10 w-10 rounded-full ${colorStyles.bg} flex items-center justify-center mr-3`}>
            <i className={`${getCategoryIcon(icon)} text-white text-lg`}></i>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{formatHours(actualHours)} / {formatHours(goalHours)}</p>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className={`font-medium ${colorStyles.text}`}>{formatPercent(progress)}</span>
          </div>
          <Progress value={progress} className={`h-2 ${colorStyles.bg}`} />
        </div>
      </div>
    </div>
  );
}