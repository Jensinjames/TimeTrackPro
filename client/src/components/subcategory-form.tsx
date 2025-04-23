import { useState, memo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // Debounce changes to reduce renders
  const debouncedSubcategory = useDebounce<SubcategoryFormData>(subcategory, 100);
  
  // Create subcategory mutation
  const createSubcategoryMutation = useMutation({
    mutationFn: async (subcategoryData: SubcategoryFormData) => {
      const res = await apiRequest("POST", "/api/subcategories", subcategoryData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create subcategory");
      }
      return res.json();
    },
    onSuccess: () => {
      // Only invalidate category-specific queries for better performance
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Subcategory created",
        description: "Subcategory has been created successfully",
      });
      onClose();
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
      // Force immediate invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      // Force refetch of dashboard data too for KPI updates
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Wait for UI to update by forcing microtask queueing
      setTimeout(() => {
        toast({
          title: "Subcategory updated",
          description: "Subcategory has been updated successfully",
        });
        onClose();
      }, 100);
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
      
    const payload = {
      ...debouncedSubcategory,
      // Convert hours to minutes for the API
      goalMinutes: debouncedSubcategory.goalType === 'time' 
        ? Math.round(hoursAsNumber * 60) 
        : 0
    };
    
    if (isNew) {
      createSubcategoryMutation.mutate(payload);
    } else {
      updateSubcategoryMutation.mutate(payload);
    }
  };
  
  // Determine if the form inputs are valid
  const isValid = debouncedSubcategory.name && 
    (debouncedSubcategory.goalType !== 'time' || debouncedSubcategory.goalHours);
  
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
          <Label>Goal (hours)</Label>
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