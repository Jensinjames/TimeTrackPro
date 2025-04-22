import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { categoryColors } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: any;
}

// Extended schema with custom validation
const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  goalHours: z.coerce.number().min(0, { message: "Goal hours must be a positive number" }),
  monthlyGoalHours: z.coerce.number().min(0, { message: "Monthly goal hours must be a positive number" }),
  goalPeriod: z.enum(["daily", "monthly"], { 
    required_error: "Please select a goal period",
    invalid_type_error: "Goal period must be either daily or monthly",
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryForm({ 
  open, 
  onOpenChange,
  editCategory
}: CategoryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!editCategory;
  
  // Available icon options
  const iconOptions = [
    { value: "fa-solid fa-chart-line", label: "Chart" },
    { value: "fa-solid fa-briefcase", label: "Work" },
    { value: "fa-solid fa-book", label: "Study" },
    { value: "fa-solid fa-dumbbell", label: "Fitness" },
    { value: "fa-solid fa-heart", label: "Health" },
    { value: "fa-solid fa-church", label: "Faith" },
    { value: "fa-solid fa-palette", label: "Art" },
    { value: "fa-solid fa-gamepad", label: "Gaming" },
    { value: "fa-solid fa-utensils", label: "Food" },
    { value: "fa-solid fa-house", label: "Home" },
    { value: "fa-solid fa-code", label: "Coding" },
    { value: "fa-solid fa-people-group", label: "Social" },
  ];

  // Available color options
  const colorOptions = Object.keys(categoryColors).map(color => ({
    value: color,
    label: color.charAt(0).toUpperCase() + color.slice(1)
  }));
  
  // Form definition using useForm from react-hook-form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: editCategory ? {
      ...editCategory
    } : {
      name: "",
      color: "blue",
      icon: "fa-solid fa-chart-line",
      goalHours: 1,
      monthlyGoalHours: 30, // Default to 30 hours per month
      goalPeriod: "daily" as "daily" | "monthly",
      userId: user?.id,
      order: 0
    }
  });
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const response = await apiRequest("POST", "/api/categories", values);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/categories', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', user?.id] });
      
      // Close form and show success toast
      onOpenChange(false);
      toast({
        title: "Category created",
        description: "Your new category has been created successfully!",
      });
      
      // Reset form
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const response = await apiRequest("PATCH", `/api/categories/${editCategory.id}`, values);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/categories', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', user?.id] });
      
      // Close form and show success toast
      onOpenChange(false);
      toast({
        title: "Category updated",
        description: "Your category has been updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (values: CategoryFormValues) => {
    const payload = {
      ...values,
      userId: user?.id || 0
    };
    
    if (isEditMode) {
      updateCategoryMutation.mutate(payload);
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "Create"} Category</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Work, Study, Health..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="goalPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Period</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select goal period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch("goalPeriod") === "daily" ? (
              <FormField
                control={form.control}
                name="goalHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Goal (hours)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        step="0.5"
                        placeholder="E.g., 2" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="monthlyGoalHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Goal (hours)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        step="1"
                        placeholder="E.g., 30" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center">
                            <i className={`${icon.value} mr-2`}></i>
                            <span>{icon.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center">
                            <div className={`h-4 w-4 rounded-full ${categoryColors[color.value].bg} mr-2`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="mr-2"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending || updateCategoryMutation.isPending 
                  ? "Saving..." 
                  : isEditMode ? "Update" : "Create"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}