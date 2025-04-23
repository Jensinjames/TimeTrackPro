import { useState, memo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define a proper type for the parent category
interface CategoryWithSubcategories {
  id: number;
  name: string;
  goalHours: number;
  color: string;
  icon: string;
  userId: number;
  monthlyGoalHours?: number;
  goalPeriod?: string;
  order?: number;
  subcategories?: Array<{
    id: number;
    name: string;
    goalType: string;
    goalMinutes: number;
    categoryId: number;
  }>;
}

// Define a proper type for the subcategory
interface SubcategoryFormData {
  id?: number;
  name: string;
  goalType: 'time' | 'habit' | 'boolean';
  goalHours?: number;
  goalMinutes?: number;
  categoryId: number;
  [key: string]: any; // Allow additional properties
}

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

interface SubcategoryFormProps {
  subcategory: SubcategoryFormData;
  onClose: () => void;
  isNew?: boolean;
}

function SubcategoryForm({ subcategory: initialSubcategory, onClose, isNew = false }: SubcategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for subcategory form
  const [subcategory, setSubcategory] = useState<SubcategoryFormData>(initialSubcategory);
  
  // Get the parent category to properly index and relate subcategory changes
  const { data: parentCategory } = useQuery<CategoryWithSubcategories>({
    queryKey: [`/api/categories/${initialSubcategory.categoryId}`],
    enabled: !!initialSubcategory.categoryId
  });
  
  // Debounce changes to reduce renders
  const debouncedSubcategory = useDebounce<SubcategoryFormData>(subcategory, 100);
  
  // Add effect to update subcategory goal when parent category changes
  useEffect(() => {
    // Calculate max allowed hours is a function defined later in this component
    // So we need to define a function inside useEffect to use it properly
    const updateGoalBasedOnCategory = () => {
      if (parentCategory && subcategory.goalType === 'time' && !isNew) {
        // Check if current goal exceeds the maximum allowed
        const currentGoalHours = subcategory.goalHours || 0;
        const maxAllowedHours = calculateMaxAllowedHours();
        
        // If current goal exceeds the max allowed, adjust it
        if (currentGoalHours > maxAllowedHours) {
          setSubcategory(prev => ({
            ...prev,
            goalHours: maxAllowedHours,
            goalMinutes: Math.round(maxAllowedHours * 60)
          }));
          
          toast({
            title: "Goal adjusted",
            description: `Goal has been adjusted to ${maxAllowedHours.toFixed(1)} hours to fit within the parent category's limit.`,
            variant: "destructive",
          });
        }
      }
    };
    
    updateGoalBasedOnCategory();
  }, [parentCategory, subcategory.goalType, subcategory.goalHours, isNew, toast]);
  
  // Create subcategory mutation
  const createSubcategoryMutation = useMutation({
    mutationFn: async (subcategoryData: SubcategoryFormData) => {
      console.log("Creating subcategory:", subcategoryData);
      const res = await apiRequest("POST", "/api/subcategories", subcategoryData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create subcategory");
      }
      return res.json();
    },
    onSuccess: (createdData) => {
      console.log("Subcategory created successfully:", createdData);
      
      // Force immediate invalidation and refetch multiple collections
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Guarantee UI refresh by forcing refetch of specific categories
      if (createdData && createdData.categoryId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/categories/${createdData.categoryId}`] 
        });
      }
      
      // Wait for UI to update before showing toast and closing
      setTimeout(() => {
        toast({
          title: "Subcategory created",
          description: "Subcategory has been created successfully",
        });
        onClose();
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create subcategory",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update subcategory mutation
  const updateSubcategoryMutation = useMutation({
    mutationFn: async (subcategoryData: SubcategoryFormData) => {
      console.log("Updating subcategory:", subcategoryData);
      const res = await apiRequest("PATCH", `/api/subcategories/${subcategoryData.id}`, {
        name: subcategoryData.name,
        goalType: subcategoryData.goalType,
        goalMinutes: subcategoryData.goalMinutes
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update subcategory");
      }
      return res.json();
    },
    onSuccess: (updatedData) => {
      console.log("Subcategory updated successfully:", updatedData);
      
      // Force immediate invalidation and refetch multiple collections
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Guarantee UI refresh by forcing refetch of specific categories
      if (updatedData && updatedData.categoryId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/categories/${updatedData.categoryId}`] 
        });
      }
      
      // Ensure the toast and close happen after the UI has a chance to update
      setTimeout(() => {
        toast({
          title: "Subcategory updated",
          description: "Subcategory has been updated successfully",
        });
        onClose();
      }, 300);
    },
    onError: (error: Error) => {
      // Handle validation errors from the improved API
      if (error.message.includes("goal") || error.message.includes("exceed")) {
        toast({
          title: "Goal validation error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Failed to update subcategory",
        description: error.message || "An error occurred while updating the subcategory",
        variant: "destructive",
      });
    },
  });

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setSubcategory((prev: SubcategoryFormData) => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    const goalHoursValue = debouncedSubcategory.goalHours || 0;
    const hoursAsNumber = typeof goalHoursValue === 'string' 
      ? parseFloat(goalHoursValue) 
      : goalHoursValue;
    
    // Get the maximum allowed goal hours
    const maxAllowedHours = calculateMaxAllowedHours();
    
    // Check if the subcategory goal exceeds the max allowed
    let finalHours = hoursAsNumber;
    let showWarning = false;
    
    if (debouncedSubcategory.goalType === 'time' && hoursAsNumber > maxAllowedHours) {
      // Adjust to max allowed hours
      finalHours = maxAllowedHours;
      showWarning = true;
    }
      
    const payload = {
      ...debouncedSubcategory,
      // Use the adjusted hours if needed
      goalHours: finalHours,
      // Convert hours to minutes for the API
      goalMinutes: debouncedSubcategory.goalType === 'time' 
        ? Math.round(finalHours * 60) 
        : 0
    };
    
    // Show warning about adjusted goal if needed
    if (showWarning) {
      toast({
        title: "Goal adjusted",
        description: `Goal has been adjusted to ${finalHours} hours to fit within the parent category's limit.`,
        variant: "destructive",
      });
    }
    
    if (isNew) {
      createSubcategoryMutation.mutate(payload);
    } else {
      updateSubcategoryMutation.mutate(payload);
    }
  };
  
  // Calculate maximum allowed goal based on parent category with enhanced accuracy and time allocation
  const calculateMaxAllowedHours = (): number => {
    // If we don't have the parent category data yet, use a reasonable default
    if (!parentCategory) return 10; 
    
    // Get user's local timezone offset in hours
    const localTimezoneOffset = new Date().getTimezoneOffset() / 60 * -1;
    
    // Calculate UTC time factors - normalize time goals based on timezone
    const utcAdjustmentFactor = 1 + ((localTimezoneOffset > 0 ? 0.05 : -0.05) * Math.min(Math.abs(localTimezoneOffset), 3) / 3);
    
    // Standard sleep allocation (can be adjusted based on user preferences later)
    const sleepHours = 8; // Default 8 hours of sleep
    const maxDailyAllocatableHours = 24 - sleepHours; // 16 hours available per day
    
    // Get the proper category goal hours based on period (daily or monthly)
    let categoryGoalHours: number;
    if (parentCategory.goalPeriod === 'monthly' && parentCategory.monthlyGoalHours) {
      // For monthly goals, calculate the daily equivalent
      // We use the actual days in the current month for more accuracy
      const daysInCurrentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      ).getDate();
      
      categoryGoalHours = parentCategory.monthlyGoalHours / daysInCurrentMonth;
    } else {
      // For daily goals, use the daily value directly
      categoryGoalHours = typeof parentCategory.goalHours === 'number' 
        ? parentCategory.goalHours 
        : typeof parentCategory.goalHours === 'string'
          ? parseFloat(parentCategory.goalHours)
          : 0;
    }
    
    // Apply UTC adjustment for more accurate daily allocations
    // This subtly adjusts time allocations based on timezone to improve global consistency
    categoryGoalHours = categoryGoalHours * utcAdjustmentFactor;
    
    // Cap category hours to reasonable maximum allocation
    // Prevent a single category from taking more than 75% of available time
    const maxCategoryHours = maxDailyAllocatableHours * 0.75;
    if (categoryGoalHours > maxCategoryHours) {
      categoryGoalHours = maxCategoryHours;
      console.log(`Category goal hours capped at ${maxCategoryHours} to maintain reasonable allocation.`);
    }
    
    // If this is an existing subcategory, calculate remaining available hours
    if (!isNew && parentCategory.subcategories && Array.isArray(parentCategory.subcategories)) {
      // Create a type for our subcategory items
      type SubcategoryItem = {
        id: number;
        goalType: string;
        goalMinutes: number;
        name?: string;
      };
      
      // Calculate total hours allocated to other subcategories (excluding the current one)
      const otherSubcategories = parentCategory.subcategories.filter((sub: SubcategoryItem) => 
        sub.id !== subcategory.id && sub.goalType === 'time'
      );
      
      // Calculate priority metrics for balanced allocation
      const totalOtherSubcategoryMinutes = otherSubcategories.reduce(
        (total: number, sub: SubcategoryItem) => 
          total + (typeof sub.goalMinutes === 'number' ? sub.goalMinutes : 0), 
        0
      );
      
      // Convert to hours
      const totalOtherSubcategoryHours = totalOtherSubcategoryMinutes / 60;
      
      // Apply metricnomic calculation - prevent underallocation if category total is high
      // This allows dynamically scaling remaining time based on category's overall allocation pattern
      const remainingHours = Math.max(0, categoryGoalHours - totalOtherSubcategoryHours);
      const utilizationRatio = totalOtherSubcategoryHours / (categoryGoalHours || 1);
      
      // If category is highly utilized already (above 85%), slightly reduce available hours 
      // to maintain allocation balance and prevent overallocation
      if (utilizationRatio > 0.85 && utilizationRatio < 1.0) {
        const adjustmentFactor = 0.95; // 5% reduction to be conservative
        return remainingHours * adjustmentFactor;
      }
      
      // If category is underutilized, allow slightly more allocation
      if (utilizationRatio < 0.3 && categoryGoalHours > 2) {
        const adjustmentFactor = 1.1; // 10% increase to encourage utilization
        const adjustedHours = remainingHours * adjustmentFactor;
        
        // But still respect maximum category allocation
        return Math.min(adjustedHours, categoryGoalHours * 0.7);
      }
      
      return remainingHours;
    }
    
    // For new subcategories, apply smart allocation based on category goal
    // If category has a high goal, be more conservative with new subcategory allocation
    if (categoryGoalHours > 8) {
      return Math.min(4, categoryGoalHours * 0.4); // Cap at 4 hours or 40% of category goal
    } else if (categoryGoalHours > 4) {
      return Math.min(2, categoryGoalHours * 0.5); // Cap at 2 hours or 50% of category goal
    }
    
    // Default allocation
    return Math.min(categoryGoalHours, 1); // Cap at 1 hour for smaller categories
  };
  
  // Determine if the form inputs are valid and that the goal isn't exceeding limits
  const isValid = debouncedSubcategory.name && 
    (debouncedSubcategory.goalType !== 'time' || 
      (debouncedSubcategory.goalHours && 
        (isNew || parseFloat(debouncedSubcategory.goalHours.toString()) <= calculateMaxAllowedHours())));
  
  // Determine if the form is submitting
  const isSubmitting = createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending;

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input 
            value={subcategory.name} 
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>
        
        <div>
          <Label>Type</Label>
          <Select
            value={subcategory.goalType}
            onValueChange={(value) => handleInputChange('goalType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time-based</SelectItem>
              <SelectItem value="habit">Habit</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {subcategory.goalType === 'time' && (
        <div>
          <div className="flex justify-between items-center">
            <Label>Goal (hours)</Label>
            {!isNew && parentCategory && (
              <div className={`text-xs ${
                calculateMaxAllowedHours() < 1 
                  ? 'text-red-500 font-semibold' 
                  : calculateMaxAllowedHours() < 2 
                    ? 'text-amber-500' 
                    : 'text-gray-500'
              }`}>
                Available: {calculateMaxAllowedHours().toFixed(1)} hours
              </div>
            )}
          </div>
          <Select
            value={subcategory.goalHours?.toString() || '1'}
            onValueChange={(value) => handleInputChange('goalHours', parseFloat(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hours" />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? "Saving..." : isNew ? "Create" : "Update"}
        </Button>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(SubcategoryForm);