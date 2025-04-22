import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCategoryColor, formatPercent } from "@/lib/utils";

interface CategoryDetailProps {
  category: any;
  currentReality: { name: string; value: string }[];
  goals: { name: string; value: string }[];
}

export default function CategoryDetail({
  category,
  currentReality,
  goals
}: CategoryDetailProps) {
  const colorStyles = getCategoryColor(category.color);
  
  return (
    <Card className="overflow-hidden">
      <div className={`${colorStyles.bg} h-2`}></div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <div className={`h-6 w-6 rounded ${colorStyles.bg} flex items-center justify-center mr-2`}>
            <i className={`${category.icon} text-white text-xs`}></i>
          </div>
          {category.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Overall Progress</span>
            <span className={`font-medium ${colorStyles.text}`}>{formatPercent(category.progress)}</span>
          </div>
          <Progress value={category.progress} className={`h-2 ${colorStyles.bg}`} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Reality</h4>
            <ul className="space-y-2">
              {currentReality.map((item, index) => (
                <li key={index} className="text-sm flex justify-between">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Goals</h4>
            <ul className="space-y-2">
              {goals.map((item, index) => (
                <li key={index} className="text-sm flex justify-between">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Weekly Goal: {category.goalHours} hours</p>
          <p>Actual: {category.actualHours.toFixed(1)} hours</p>
        </div>
      </CardContent>
    </Card>
  );
}