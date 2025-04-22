import { getCategoryIcon, getCategoryColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import RingProgress from "@/components/ui/ring-progress";
import { CategoryWithSubcategories } from "@shared/schema";

interface CategoryDetailProps {
  category: CategoryWithSubcategories & { progress: number };
  currentReality: { name: string; value: string }[];
  goals: { name: string; value: string }[];
}

export default function CategoryDetail({
  category,
  currentReality,
  goals,
}: CategoryDetailProps) {
  const { name, icon, progress } = category;
  const categoryColor = getCategoryColor(name);
  const iconClass = getCategoryIcon(icon);
  
  return (
    <Card className="overflow-hidden">
      <div className={`flex items-center justify-between ${categoryColor.light} px-4 py-3`}>
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-md ${categoryColor.bg} text-white flex items-center justify-center mr-2`}>
            <i className={iconClass}></i>
          </div>
          <h3 className="font-medium">{name}</h3>
        </div>
        <button className={`text-gray-600 hover:bg-white hover:${categoryColor.text} p-1 rounded`}>
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Current Reality</h4>
            <p className="text-sm text-gray-700 mb-3">
              {name === "Faith" && "Current spiritual practices and mindfulness activities"}
              {name === "Life" && "Current work-life balance and relationships"}
              {name === "Work" && "Current career status and achievements"}
              {name === "Health" && "Current physical and mental health metrics"}
            </p>
            
            <div className="space-y-2">
              {currentReality.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Goals</h4>
            <p className="text-sm text-gray-700 mb-3">
              {name === "Faith" && "Target spiritual growth and practice objectives"}
              {name === "Life" && "Desired lifestyle and relationship targets"}
              {name === "Work" && "Professional aspirations and milestones"}
              {name === "Health" && "Target health indicators and wellness objectives"}
            </p>
            
            <div className="space-y-2">
              {goals.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <RingProgress progress={progress} color={categoryColor.bg.replace("bg-", "")} />
        </div>
        
        <div className="mt-4 text-center">
          <a href="#" className="text-sm text-blue-600 hover:text-blue-500 inline-flex items-center">
            View Details
            <i className="fas fa-arrow-right ml-1 text-xs"></i>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
