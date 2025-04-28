import { memo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, TimerIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Subcategory } from "@shared/schema";
import SubcategoryForm from "@/components/subcategory-form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubcategoryListProps {
  subcategories: Subcategory[] | undefined;
  isLoading: boolean;
  categoryId: number;
  onSubcategoryEdit: (subcategory: Subcategory) => void;
  onDeleteSubcategory: (id: number) => void;
}

function SubcategoryList({
  subcategories = [],
  isLoading,
  categoryId,
  onSubcategoryEdit,
  onDeleteSubcategory
}: SubcategoryListProps) {
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryFormData] = useState({
    name: "",
    goalType: "time",
    goalHours: 1,
    categoryId
  } as any);

  // Handle adding a new subcategory
  const handleAddSubcategory = () => {
    setIsAddingSubcategory(true);
  };

  // Get icon for subcategory type
  const getSubcategoryTypeIcon = (type: string) => {
    switch (type) {
      case 'time':
        return <TimerIcon className="w-3 h-3 text-blue-500" />;
      case 'habit':
      case 'boolean':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-purple-500" />;
    }
  };
  
  // Get label for subcategory type
  const getSubcategoryTypeLabel = (type: string, minutes?: number) => {
    switch (type) {
      case 'time':
        if (!minutes) return "Time";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
      case 'habit':
        return "Habit";
      case 'boolean':
        return "Task";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-8 w-full bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-8 w-full bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Select a category to view and manage subcategories.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Subcategories</h3>
          <div className="text-xs text-gray-500">
            Category ID: <span className="font-mono">{categoryId}</span> • 
            <span className="ml-1">{subcategories.length} items</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddSubcategory}
          className="flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add</span>
        </Button>
      </div>
      
      {subcategories.length === 0 && !isAddingSubcategory && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No subcategories found. Click "Add" to create your first subcategory.
          </AlertDescription>
        </Alert>
      )}
      
      {isAddingSubcategory && (
        <div className="border border-blue-200 rounded-md bg-blue-50 p-1 mb-2">
          <div className="text-xs text-blue-700 font-medium mb-1 px-2 py-1 bg-blue-100 rounded-sm">
            New Subcategory for Category ID: {categoryId}
          </div>
          <SubcategoryForm 
            isNew={true} 
            subcategory={{...newSubcategoryFormData, categoryId}}
            onClose={() => setIsAddingSubcategory(false)}
          />
        </div>
      )}
      
      {/* Subcategory Type Legends */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
          <TimerIcon className="w-3 h-3 text-blue-500" />
          <span>Time</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span>Habit</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
          <AlertCircle className="w-3 h-3 text-purple-500" />
          <span>Task</span>
        </div>
      </div>
      
      <div className="space-y-1">
        {subcategories.map(subcategory => (
          <div 
            key={subcategory.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150 border border-transparent hover:border-gray-200"
            onClick={() => onSubcategoryEdit(subcategory)}
            data-subcategory-id={subcategory.id}
            data-parent-category-id={categoryId}
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                {getSubcategoryTypeIcon(subcategory.goalType)}
              </div>
              <span className="font-medium">{subcategory.name}</span>
              <span className="text-xs text-gray-500 font-mono">(ID: {subcategory.id})</span>
            </div>
            
            <div className="flex items-center gap-2">
              {subcategory.goalType === 'time' && (
                <span className="text-xs text-gray-500">
                  {Math.round(subcategory.goalMinutes / 60 * 100) / 100} hours
                </span>
              )}
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  subcategory.goalType === 'time' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : subcategory.goalType === 'habit'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {getSubcategoryTypeLabel(subcategory.goalType, subcategory.goalMinutes)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
      
      {/* Last updated timestamp */}
      <div className="text-xs text-gray-500 text-right mt-4">
        Last refreshed: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default memo(SubcategoryList);