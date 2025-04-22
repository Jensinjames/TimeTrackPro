import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCategoryIcon } from "@/lib/utils";
import { categoryColors } from "@/lib/utils";

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
  isSelected = false,
}: CategoryCardProps) {
  // Handle both named colors and hex codes
  const colorStyle = categoryColors[color] || 
                    (color && color.startsWith('#') ? categoryColors[color] : null) || 
                    categoryColors.blue;
  const iconClass = getCategoryIcon(icon);
  
  return (
    <Card 
      className={`
        overflow-hidden cursor-pointer transition-all hover:shadow-md
        ${isSelected ? `ring-2 ${colorStyle.ring}` : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`${colorStyle.bg} h-2`}></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-medium text-lg">{name}</h3>
              <p className="text-sm text-gray-500">
                {actualHours.toFixed(1)} / {goalHours} hrs
              </p>
            </div>
            <div className={`
              h-10 w-10 rounded-full ${colorStyle.light} 
              flex items-center justify-center
            `}>
              <i className={`${iconClass} ${colorStyle.text}`}></i>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span className={colorStyle.text}>{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2" 
              // Use className for styling directly without custom props
              // that aren't supported by the component
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}