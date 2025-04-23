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
    
    console.log(`Calculating max allowed hours for category ${parentCategory.id} (${parentCategory.name})`);
    
    // Get user's local timezone offset in hours
    const localTimezoneOffset = new Date().getTimezoneOffset() / 60 * -1;
    
    // Standard sleep allocation (can be adjusted based on user preferences later)
    const sleepHours = 8; // Default 8 hours of sleep
    const maxDailyAllocatableHours = 24 - sleepHours; // 16 hours available per day
    
    // Calculate total available category goal minutes based on period (daily or monthly)
    let categoryGoalMinutes: number;
    if (parentCategory.goalPeriod === 'monthly' && parentCategory.monthlyGoalHours) {
      // For monthly goals, use the monthly value directly in minutes
      categoryGoalMinutes = parentCategory.monthlyGoalHours * 60;
      console.log(`Monthly goal: ${parentCategory.monthlyGoalHours} hours = ${categoryGoalMinutes} minutes`);
    } else {
      // For daily goals, use the daily value directly in minutes
      categoryGoalMinutes = typeof parentCategory.goalHours === 'number' 
        ? parentCategory.goalHours * 60
        : typeof parentCategory.goalHours === 'string'
          ? parseFloat(parentCategory.goalHours) * 60
          : 0;
      console.log(`Daily goal: ${parentCategory.goalHours} hours = ${categoryGoalMinutes} minutes`);
    }
    
    // Cap category minutes to reasonable maximum allocation (75% of waking hours)
    const maxCategoryMinutes = maxDailyAllocatableHours * 0.75 * 60;
    if (categoryGoalMinutes > maxCategoryMinutes) {
      categoryGoalMinutes = maxCategoryMinutes;
      console.log(`Category goal minutes capped at ${maxCategoryMinutes} to maintain reasonable allocation.`);
    }
    
    // Calculate total minutes allocated to other subcategories (excluding the current one)
    if (parentCategory.subcategories && Array.isArray(parentCategory.subcategories)) {
      // Create a type for our subcategory items
      type SubcategoryItem = {
        id: number;
        goalType: string;
        goalMinutes: number;
        name?: string;
      };
      
      // Get all time-based subcategories except current one
      const otherSubcategories = parentCategory.subcategories.filter((sub: SubcategoryItem) => {
        const isCurrentSub = !isNew && sub.id === subcategory.id;
        const isTimeType = sub.goalType === 'time';
        return !isCurrentSub && isTimeType;
      });
      
      console.log(`Found ${otherSubcategories.length} other time-based subcategories`);
      
      // Sum up minutes from other subcategories
      const totalOtherSubcategoryMinutes = otherSubcategories.reduce(
        (total: number, sub: SubcategoryItem) => 
          total + (typeof sub.goalMinutes === 'number' ? sub.goalMinutes : 0), 
        0
      );
      
      console.log(`Total allocated to other subcategories: ${totalOtherSubcategoryMinutes} minutes`);
      
      // Calculate remaining minutes available for this subcategory
      const remainingMinutes = Math.max(0, categoryGoalMinutes - totalOtherSubcategoryMinutes);
      
      // Subtract a small buffer to avoid server-side validation errors
      // Take 5 minutes off to be safe with database trigger validation
      const safeRemainingMinutes = Math.max(0, remainingMinutes - 5);
      
      // Convert to hours for the UI with 2 decimal precision
      const safeRemainingHours = Math.floor(safeRemainingMinutes / 60 * 100) / 100;
      
      console.log(`Available time: ${safeRemainingMinutes} minutes = ${safeRemainingHours} hours`);
      
      // Return the safe value
      return safeRemainingHours;
    }
    
    // For new subcategories when no existing subcategories exist
    // Convert minutes to hours
    const categoryGoalHours = categoryGoalMinutes / 60;
    
    // Apply percentage-based limits for new allocations
    // If category has a high goal, be more conservative with new subcategory allocation
    if (categoryGoalHours > 8) {
      // Cap at 4 hours or 40% of category goal (with 5-minute buffer)
      const maxHours = Math.min(4, categoryGoalHours * 0.4);
      return Math.floor(maxHours * 60 - 5) / 60;
    } else if (categoryGoalHours > 4) {
      // Cap at 2 hours or 50% of category goal (with 5-minute buffer)
      const maxHours = Math.min(2, categoryGoalHours * 0.5);
      return Math.floor(maxHours * 60 - 5) / 60;
    }
    
    // Default allocation with 5-minute buffer
    const defaultHours = Math.min(categoryGoalHours, 1);
    return Math.floor(defaultHours * 60 - 5) / 60;
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
      {/* Subcategory ID and parent relationship for clear identification */}
      <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
        {subcategory.id && (
          <div>Subcategory ID: <span className="font-mono">{subcategory.id}</span></div>
        )}
        <div>
          Parent Category: <span className="font-medium">{parentCategory?.name || 'Loading...'}</span>
          <span className="font-mono ml-1">(ID: {subcategory.categoryId})</span>
        </div>
        <div>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>
            Name
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input 
            value={subcategory.name} 
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="bg-white"
            data-subcategory-id={subcategory.id}
            data-parent-category-id={subcategory.categoryId}
            placeholder="Subcategory name"
          />
        </div>
        
        <div>
          <Label>
            Type
            <span className="text-red-500 ml-1">*</span>
            <span className="text-xs text-gray-500 ml-2">Tracking Method</span>
          </Label>
          <Select
            value={subcategory.goalType}
            onValueChange={(value) => handleInputChange('goalType', value)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-1 space-y-1">
                <SelectItem value="time">
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-blue-600 text-xs">T</span>
                    </span>
                    <span>Time-based</span>
                  </div>
                </SelectItem>
                <SelectItem value="habit">
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                      <span className="text-green-600 text-xs">H</span>
                    </span>
                    <span>Habit</span>
                  </div>
                </SelectItem>
                <SelectItem value="boolean">
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                      <span className="text-purple-600 text-xs">B</span>
                    </span>
                    <span>Boolean</span>
                  </div>
                </SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {subcategory.goalType === 'time' && (
        <div>
          <div className="flex justify-between items-center">
            <Label>
              Goal (hours)
              <span className="text-red-500 ml-1">*</span>
              <span className="text-xs text-gray-500 ml-2">Time Allocation</span>
            </Label>
            {!isNew && parentCategory && (
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                calculateMaxAllowedHours() < 1 
                  ? 'bg-red-100 text-red-700' 
                  : calculateMaxAllowedHours() < 2 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-green-100 text-green-700'
              }`}>
                Available: {calculateMaxAllowedHours().toFixed(1)} hours
              </div>
            )}
          </div>
          <Select
            value={subcategory.goalHours?.toString() || '1'}
            onValueChange={(value) => handleInputChange('goalHours', parseFloat(value))}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select hours" />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-2 gap-1 p-1">
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
          
          {/* Display UTC and time allocation information */}
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>UTC Adjustment: {(new Date().getTimezoneOffset() / 60 * -1).toFixed(1)}h offset</span>
              <span>Daily Max: 16h (8h sleep)</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
        <div className="text-xs text-gray-500">
          {isNew ? 'Creating new subcategory' : `Editing: ${subcategory.name}`}
          {parentCategory && <span> in {parentCategory.name}</span>}
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
export default memo(SubcategoryForm);