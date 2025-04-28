import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDailyEntrySchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { categoryColors, getCategoryIcon, timeOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryWithSubcategories } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface DailyEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  categories: CategoryWithSubcategories[];
  currentEntry?: any;
}

// Extended schema with custom validation
const dailyEntryFormSchema = insertDailyEntrySchema.extend({
  sleepHours: z.coerce.number().min(0).max(24).nullable(),
  actualSleepHours: z.coerce.number().min(0).max(24).nullable(),
  predictedSleepHours: z.coerce.number().min(0).max(24).nullable(),
  sleepQuality: z.coerce.number().min(0).max(10).nullable(),
  notes: z.string().optional(),
  exportFlag: z.boolean().optional(),
});

type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>;

export default function DailyEntryForm({ 
  open, 
  onOpenChange,
  selectedDate,
  categories: passedCategories,
  currentEntry
}: DailyEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const isEditMode = !!currentEntry;
  
  // Fetch latest categories to ensure new ones appear
  const { data: fetchedCategories, isLoading: isCategoriesLoading } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ['/api/categories', user?.id],
    enabled: !!user && open,
  });
  
  // Use fetched categories if available, otherwise use passed categories
  const categories = fetchedCategories || passedCategories || [];
  
  // Track time and habit records separately
  const [timeRecords, setTimeRecords] = useState<Record<number, number>>({});
  const [habitRecords, setHabitRecords] = useState<Record<number, boolean>>({});
  
  // Form definition using useForm from react-hook-form
  const form = useForm<DailyEntryFormValues>({
    resolver: zodResolver(dailyEntryFormSchema),
    defaultValues: currentEntry ? {
      ...currentEntry,
      date: selectedDate,
    } : {
      userId: user?.id,
      date: selectedDate,
      sleepHours: 8,
      actualSleepHours: null,
      predictedSleepHours: 8,
      sleepQuality: 7,
      notes: "",
      exportFlag: false,
      dailyScore: null,
      motivationLevel: null,
      healthBalance: null,
    }
  });
  
  // Create entry mutation
  const createDailyEntryMutation = useMutation({
    mutationFn: async (values: DailyEntryFormValues) => {
      // First create the daily entry
      const entryResponse = await apiRequest("POST", "/api/entries", values);
      const entry = await entryResponse.json();
      
      // Then create time and habit records
      const recordPromises = [];
      
      // Add time records
      for (const [subcategoryId, minutes] of Object.entries(timeRecords)) {
        if (minutes > 0) {
          recordPromises.push(
            apiRequest("POST", "/api/time-records", {
              entryId: entry.id,
              subcategoryId: parseInt(subcategoryId),
              minutes: minutes * 60 // Convert hours to minutes
            })
          );
        }
      }
      
      // Add habit records
      for (const [subcategoryId, completed] of Object.entries(habitRecords)) {
        recordPromises.push(
          apiRequest("POST", "/api/habit-records", {
            entryId: entry.id,
            subcategoryId: parseInt(subcategoryId),
            completed
          })
        );
      }
      
      // Wait for all records to be created
      await Promise.all(recordPromises);
      
      return entry;
    },
    onSuccess: () => {
      // Force complete refresh of all related data with specific keys
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dashboard'],
        refetchType: 'all' 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/entries'],
        refetchType: 'all'
      });
      
      // Delay closing to ensure UI updates are processed
      setTimeout(() => {
        // Close form and show success toast
        onOpenChange(false);
        toast({
          title: "Entry created",
          description: "Your daily entry has been saved successfully!",
        });
        
        // Reset form and records
        form.reset();
        setTimeRecords({});
        setHabitRecords({});
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create entry",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update entry mutation
  const updateDailyEntryMutation = useMutation({
    mutationFn: async (values: DailyEntryFormValues) => {
      // First update the daily entry
      const entryResponse = await apiRequest(
        "PATCH", 
        `/api/entries/${currentEntry.id}`, 
        values
      );
      const entry = await entryResponse.json();
      
      // Then update time and habit records
      const recordPromises = [];
      
      // Update time records
      for (const [subcategoryId, minutes] of Object.entries(timeRecords)) {
        recordPromises.push(
          apiRequest("PUT", `/api/entries/${entry.id}/time-records/${subcategoryId}`, {
            minutes: minutes * 60 // Convert hours to minutes
          })
        );
      }
      
      // Update habit records
      for (const [subcategoryId, completed] of Object.entries(habitRecords)) {
        recordPromises.push(
          apiRequest("PUT", `/api/entries/${entry.id}/habit-records/${subcategoryId}`, {
            completed
          })
        );
      }
      
      // Wait for all records to be updated
      await Promise.all(recordPromises);
      
      return entry;
    },
    onSuccess: () => {
      // Force complete refresh of all related data with specific keys
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dashboard'],
        refetchType: 'all' 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/entries'],
        refetchType: 'all'
      });
      
      // Delay closing to ensure UI updates are processed
      setTimeout(() => {
        // Close form and show success toast
        onOpenChange(false);
        toast({
          title: "Entry updated",
          description: "Your daily entry has been updated successfully!",
        });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update entry",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Initialize time and habit records from currentEntry if in edit mode
  useState(() => {
    if (isEditMode && currentEntry) {
      // Initialize time records
      const initialTimeRecords: Record<number, number> = {};
      currentEntry.timeRecords?.forEach((record: any) => {
        initialTimeRecords[record.subcategoryId] = record.minutes / 60; // Convert minutes to hours
      });
      setTimeRecords(initialTimeRecords);
      
      // Initialize habit records
      const initialHabitRecords: Record<number, boolean> = {};
      currentEntry.habitRecords?.forEach((record: any) => {
        initialHabitRecords[record.subcategoryId] = record.completed;
      });
      setHabitRecords(initialHabitRecords);
    }
  });
  
  // Handle time record change
  const handleTimeChange = (subcategoryId: number, value: string) => {
    setTimeRecords(prev => ({
      ...prev,
      [subcategoryId]: parseFloat(value)
    }));
  };
  
  // Handle habit record change
  const handleHabitChange = (subcategoryId: number, checked: boolean) => {
    setHabitRecords(prev => ({
      ...prev,
      [subcategoryId]: checked
    }));
  };
  
  // Handle form submission
  const onSubmit = async (values: DailyEntryFormValues) => {
    try {
      // First, create or update the daily entry
      const payload = {
        ...values,
        userId: user?.id || 0,
        // Ensure date is in the correct format
        date: selectedDate,
        // Include time and habit records
        timeRecords: Object.entries(timeRecords).map(([subcategoryId, hours]) => ({
          subcategoryId: parseInt(subcategoryId),
          minutes: Math.round(hours * 60) // Convert hours to minutes
        })),
        habitRecords: Object.entries(habitRecords).map(([subcategoryId, completed]) => ({
          subcategoryId: parseInt(subcategoryId),
          completed
        }))
      };
      
      // Submit the daily entry data
      let dailyEntry;
      if (isEditMode) {
        dailyEntry = await updateDailyEntryMutation.mutateAsync(payload);
      } else {
        dailyEntry = await createDailyEntryMutation.mutateAsync(payload);
      }
      
      // Force a complete refresh of specific data for improved performance
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dashboard'],
        refetchType: 'all' 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/entries'],
        refetchType: 'all'
      });
      
      // Use setTimeout to ensure UI updates are processed
      setTimeout(() => {
        // Close the form
        onOpenChange(false);
      }, 100);
    } catch (error) {
      console.error("Failed to save daily entry:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? "w-full max-w-full h-[95vh] max-h-full overflow-y-auto pb-24" : "w-[95vw] max-w-[650px] max-h-[85vh] overflow-y-auto"}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl sm:text-2xl">{isEditMode ? "Edit" : "Add"} Daily Entry</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Date: {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2 px-1">
            
            {/* Unified form layout without tabs */}
            <div className="space-y-6">
              {/* Metrics Section at Top */}
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium mb-3 text-gray-700">Sleep & Health Metrics</h3>
                
                {/* Sleep Planning Section */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sleep Planning</h4>
                  
                  {/* SleepHours - Current Day's Planned Hours */}
                  <FormField
                    control={form.control}
                    name="sleepHours"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Current Plan (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="24"
                            step="0.5"
                            placeholder="E.g., 8" 
                            {...field}
                            value={field.value !== null ? field.value : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : Number(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">Hours you plan to sleep today</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* PredictedSleepHours - Next Day's Prediction */}
                  <FormField
                    control={form.control}
                    name="predictedSleepHours"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Next Day Prediction (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="24"
                            step="0.5"
                            placeholder="E.g., 8" 
                            {...field}
                            value={field.value !== null ? field.value : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : Number(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">Prediction for tomorrow's sleep hours</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* ActualSleepHours - Previous Day's Actual */}
                  <FormField
                    control={form.control}
                    name="actualSleepHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Day Actual (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="24"
                            step="0.5"
                            placeholder="E.g., 7.5" 
                            {...field}
                            value={field.value !== null ? field.value : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : Number(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">Actual hours you slept last night</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Sleep Quality */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <FormField
                    control={form.control}
                    name="sleepQuality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sleep Quality (1-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="10"
                            step="1"
                            placeholder="Rate from 1-10" 
                            {...field}
                            value={field.value !== null ? field.value : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : Number(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">How well did you sleep last night?</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Notes Section */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day Notes</FormLabel>
                        <FormControl>
                          <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Add notes about your day..." 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Export Flag */}
                <FormField
                  control={form.control}
                  name="exportFlag"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          Include in History Exports
                        </FormLabel>
                        <p className="text-xs text-gray-500">
                          Flag this entry for inclusion in history exports
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Category Sections */}
              {categories.map((category) => {
                const hasTimeItems = category.subcategories.some(sub => 
                  !sub.goalType || sub.goalType === "time"
                );
                const hasHabitItems = category.subcategories.some(sub => 
                  sub.goalType === "habit" || sub.goalType === "boolean"
                );
                
                if (!hasTimeItems && !hasHabitItems) return null;
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-md p-4 transition-all hover:border-gray-300">
                    <div className="flex items-center mb-3">
                      <div className={`
                        h-8 w-8 rounded-full ${categoryColors[category.color]?.light || "bg-gray-100"} 
                        flex items-center justify-center mr-2
                      `}>
                        <i className={`${getCategoryIcon(category.icon)} ${categoryColors[category.color]?.text || "text-gray-500"}`}></i>
                      </div>
                      <h3 className="font-medium">{category.name}</h3>
                    </div>
                    
                    {/* Time Tracking Fields */}
                    {hasTimeItems && (
                      <>
                        <h4 className="text-xs font-medium mb-2 text-gray-600 pl-10">Time Tracking</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 md:pl-10 mb-4">
                          {category.subcategories
                            .filter(sub => !sub.goalType || sub.goalType === "time")
                            .map(sub => (
                              <div key={sub.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <label className="text-sm font-medium truncate">{sub.name}</label>
                                <Select
                                  defaultValue={timeRecords[sub.id]?.toString() || "0.25"}
                                  onValueChange={(value) => handleTimeChange(sub.id, value)}
                                >
                                  <SelectTrigger className="w-full sm:w-[110px] md:w-[140px]">
                                    <SelectValue placeholder="Select time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))
                          }
                        </div>
                      </>
                    )}
                    
                    {/* Habit Fields */}
                    {hasHabitItems && (
                      <>
                        <h4 className="text-xs font-medium mb-2 text-gray-600 pl-10">Habits & Tasks</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 md:pl-10">
                          {category.subcategories
                            .filter(sub => sub.goalType === "habit" || sub.goalType === "boolean")
                            .map(sub => (
                              <div key={sub.id} className="flex items-center space-x-2 py-1">
                                <Checkbox
                                  id={`habit-${sub.id}`}
                                  checked={habitRecords[sub.id] || false}
                                  onCheckedChange={(checked) => 
                                    handleHabitChange(sub.id, checked === true)
                                  }
                                  className="h-5 w-5" 
                                />
                                <label 
                                  htmlFor={`habit-${sub.id}`}
                                  className="text-sm font-medium cursor-pointer truncate"
                                >
                                  {sub.name}
                                </label>
                              </div>
                            ))
                          }
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              
              {/* No Categories Message */}
              {categories.length === 0 && (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-md">
                  <p className="text-gray-500 mb-2">No categories found</p>
                  <p className="text-sm text-gray-400">
                    Create categories and subcategories in the settings page
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="mt-4"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="mt-4"
                disabled={createDailyEntryMutation.isPending || updateDailyEntryMutation.isPending}
              >
                {(createDailyEntryMutation.isPending || updateDailyEntryMutation.isPending) 
                  ? "Saving..." 
                  : isEditMode ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}