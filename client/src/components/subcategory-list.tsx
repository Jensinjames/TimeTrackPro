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
        return <TimerIcon className="w-4 h-4 text-blue-500" />;
      case 'habit':
      case 'boolean':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return null;
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
        <h3 className="text-lg font-medium">Subcategories</h3>
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
        <SubcategoryForm 
          isNew={true} 
          subcategory={{...newSubcategoryFormData, categoryId}}
          onClose={() => setIsAddingSubcategory(false)}
        />
      )}
      
      <div className="space-y-1">
        {subcategories.map(subcategory => (
          <div 
            key={subcategory.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150"
            onClick={() => onSubcategoryEdit(subcategory)}
          >
            <div className="flex items-center gap-2">
              {getSubcategoryTypeIcon(subcategory.goalType)}
              <span>{subcategory.name}</span>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {getSubcategoryTypeLabel(subcategory.goalType, subcategory.goalMinutes)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(SubcategoryList);