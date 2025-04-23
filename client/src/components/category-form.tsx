import { useState, useEffect, memo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define a proper type for the category
export interface CategoryFormData {
  id?: number;
  name: string;
  icon: string;
  color: string;
  goalHours: number;
  goalPeriod: string; // Changed to allow any string for compatibility with API
  [key: string]: any; // Allow additional properties
}

// Hour options for dropdown selection
const hourOptions = [
  { value: "0.25", label: "15 min" },
  { value: "0.5", label: "30 min" },
  { value: "0.75", label: "45 min" },
  { value: "1", label: "1 hour" },
  { value: "1.5", label: "1.5 hours" },
  { value: "2", label: "2 hours" },
  { value: "2.5", label: "2.5 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
  { value: "5", label: "5 hours" },
  { value: "6", label: "6 hours" },
  { value: "7", label: "7 hours" },
  { value: "8", label: "8 hours" },
  { value: "10", label: "10 hours" },
  { value: "12", label: "12 hours" },
];

// Default initial category state
const defaultCategory: CategoryFormData = {
  name: "",
  icon: "sun",
  color: "#3b82f6",
  goalHours: 1,
  goalPeriod: "daily"
};

interface CategoryFormProps {
  category?: CategoryFormData; // The category to edit, undefined for new category
  onClose: () => void;
  onSuccess?: (category: CategoryFormData) => void;
  isNew?: boolean;
}

function CategoryForm({ 
  category: initialCategory, 
  onClose, 
  onSuccess,
  isNew = false 
}: CategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize with provided category or default values
  const [category, setCategory] = useState<CategoryFormData>(initialCategory || {...defaultCategory});
  
  // Debounce category changes to reduce renders
  const debouncedCategory = useDebounce<CategoryFormData>(category, 100);
  
  // Update local state if initialCategory changes externally
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryFormData) => {
      const res = await apiRequest("POST", "/api/categories", categoryData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Targeted query invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      toast({
        title: "Category created",
        description: "Category has been created successfully",
      });
      
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryFormData) => {
      const res = await apiRequest("PATCH", `/api/categories/${categoryData.id}`, {
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
        goalHours: categoryData.goalHours,
        goalPeriod: categoryData.goalPeriod
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update category");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Targeted query invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Also invalidate dashboard to reflect the changes there
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Category updated",
        description: "Category has been updated successfully",
      });
      
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setCategory((prev: CategoryFormData) => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (isNew) {
      createCategoryMutation.mutate(debouncedCategory);
    } else {
      updateCategoryMutation.mutate(debouncedCategory);
    }
  };
  
  // Determine if the form inputs are valid
  const isValid = debouncedCategory.name && debouncedCategory.goalHours;
  
  // Determine if the form is submitting
  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      {/* Category ID indicator for debugging and identification */}
      {category.id && (
        <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
          <div>Category ID: <span className="font-mono">{category.id}</span></div>
          <div>Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>
            Name
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input 
            value={category.name} 
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Category name"
            className="bg-white"
            data-category-id={category.id}
          />
        </div>
        
        <div>
          <Label>
            Icon
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            value={category.icon}
            onValueChange={(value) => handleInputChange('icon', value)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-2 gap-1">
                <SelectItem value="pray">
                  <div className="flex items-center">
                    <i className="fas fa-pray mr-2"></i>
                    <span>Pray</span>
                  </div>
                </SelectItem>
                <SelectItem value="sun">
                  <div className="flex items-center">
                    <i className="fas fa-sun mr-2"></i>
                    <span>Sun</span>
                  </div>
                </SelectItem>
                <SelectItem value="briefcase">
                  <div className="flex items-center">
                    <i className="fas fa-briefcase mr-2"></i>
                    <span>Work</span>
                  </div>
                </SelectItem>
                <SelectItem value="dumbbell">
                  <div className="flex items-center">
                    <i className="fas fa-dumbbell mr-2"></i>
                    <span>Fitness</span>
                  </div>
                </SelectItem>
                <SelectItem value="book">
                  <div className="flex items-center">
                    <i className="fas fa-book mr-2"></i>
                    <span>Book</span>
                  </div>
                </SelectItem>
                <SelectItem value="graduation-cap">
                  <div className="flex items-center">
                    <i className="fas fa-graduation-cap mr-2"></i>
                    <span>Education</span>
                  </div>
                </SelectItem>
                <SelectItem value="users">
                  <div className="flex items-center">
                    <i className="fas fa-users mr-2"></i>
                    <span>Social</span>
                  </div>
                </SelectItem>
                <SelectItem value="heart">
                  <div className="flex items-center">
                    <i className="fas fa-heart mr-2"></i>
                    <span>Heart</span>
                  </div>
                </SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>
            Goal (hours)
            <span className="text-red-500 ml-1">*</span>
            <span className="text-xs text-gray-500 ml-2">Time Allocation</span>
          </Label>
          <Select
            value={category.goalHours.toString()}
            onValueChange={(value) => handleInputChange('goalHours', parseFloat(value))}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select hours" />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-2 gap-1">
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>
            Goal Period
            <span className="text-red-500 ml-1">*</span>
            <span className="text-xs text-gray-500 ml-2">Tracking Interval</span>
          </Label>
          <Select
            value={category.goalPeriod || "daily"}
            onValueChange={(value) => handleInputChange('goalPeriod', value)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly (Averaged)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>
          Color
          <span className="text-red-500 ml-1">*</span>
          <span className="text-xs text-gray-500 ml-2">Visual Identifier</span>
        </Label>
        <div className="flex items-center space-x-2">
          <Input 
            type="color"
            value={category.color} 
            onChange={(e) => handleInputChange('color', e.target.value)}
            className="h-10 w-24"
          />
          <div 
            className="h-8 w-8 rounded-full border border-gray-200" 
            style={{ backgroundColor: category.color }}
          ></div>
          <div className="text-xs font-mono">{category.color}</div>
        </div>
      </div>
      
      <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
        <div className="text-xs text-gray-500">
          {isNew ? 'Creating new category' : `Editing category: ${category.name}`}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            size="sm"
          >
            {isSubmitting ? 
              <span className="flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Saving...
              </span> : 
              isNew ? "Create" : "Update"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(CategoryForm);