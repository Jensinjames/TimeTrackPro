import { memo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, AlertCircle } from "lucide-react";
import { CategoryWithSubcategories } from "@shared/schema";
import { categoryColors, getCategoryIcon } from "@/lib/utils";
import CategoryForm, { CategoryFormData } from "@/components/category-form";
import SubcategoryForm from "@/components/subcategory-form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryListProps {
  categories: CategoryWithSubcategories[] | undefined;
  isLoading: boolean;
  onCategorySelect: (category: CategoryWithSubcategories) => void;
  onDeleteCategory: (id: number) => void;
  selectedCategoryId?: number;
}

function CategoryList({
  categories = [],
  isLoading,
  onCategorySelect,
  onDeleteCategory,
  selectedCategoryId
}: CategoryListProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryFormData] = useState({
    name: "",
    icon: "sun",
    color: "#3b82f6",
    goalHours: 1,
    goalPeriod: "daily"
  });

  // Handle adding a new category
  const handleAddCategory = () => {
    setIsAddingCategory(true);
  };

  // Handle when a new category is successfully created
  const handleCategoryAdded = (category: any) => {
    onCategorySelect(category);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Categories</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddCategory}
          className="flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add</span>
        </Button>
      </div>
      
      {categories.length === 0 && !isAddingCategory && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No categories found. Click "Add" to create your first category.
          </AlertDescription>
        </Alert>
      )}
      
      {isAddingCategory && (
        <CategoryForm 
          isNew={true} 
          category={newCategoryFormData}
          onSuccess={handleCategoryAdded}
          onClose={() => setIsAddingCategory(false)}
        />
      )}
      
      <div className="space-y-1">
        {categories.map(category => (
          <div 
            key={category.id}
            className={`
              flex items-center justify-between p-2 rounded-md cursor-pointer 
              ${selectedCategoryId === category.id ? 'bg-gray-100' : 'hover:bg-gray-50'}
              transition-colors duration-150
            `}
            onClick={() => onCategorySelect(category)}
          >
            <div className="flex items-center gap-2">
              <div className={`
                w-6 h-6 rounded-full ${categoryColors[category.color]?.light || "bg-gray-100"}
                flex items-center justify-center
              `}>
                <i className={`${getCategoryIcon(category.icon)} ${categoryColors[category.color]?.text || "text-gray-500"} text-xs`}></i>
              </div>
              <span>{category.name}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="ml-2 p-0 h-auto">
                      <Badge variant={category.goalPeriod === 'monthly' ? 'secondary' : 'outline'} className="text-xs px-1.5 py-0">
                        {category.goalPeriod === 'monthly' ? 'Monthly' : 'Daily'}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{category.goalPeriod === 'monthly' ? 'Monthly' : 'Daily'} goal: {category.goalHours} hour{category.goalHours !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div>
              <Badge className="text-xs">{category.subcategories.length} item{category.subcategories.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(CategoryList);