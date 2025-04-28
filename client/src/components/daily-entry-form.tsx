import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDailyEntrySchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getCategoryIcon, timeOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryWithSubcategories } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { generateBalancedColorScheme, getContrastingTextColor } from "@/lib/color-utils";

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
      // Ensure we have a valid entry ID
      if (!currentEntry || !currentEntry.id) {
        console.error("Update error: Missing entry ID", { currentEntry });
        throw new Error("Cannot update entry: Missing entry ID");
      }
      
      console.log("Updating entry with ID:", currentEntry.id);
      
      // First update the daily entry
      const entryResponse = await apiRequest(
        "PATCH", 
        `/api/entries/${currentEntry.id}`, 
        values
      );
      const entry = await entryResponse.json();
      
      if (!entry || !entry.id) {
        console.error("Update error: Invalid entry response", { entry });
        throw new Error("Failed to update entry: Invalid response");
      }
      
      // Then update time and habit records
      const recordPromises = [];
      
      // Update time records - only include records with time > 0
      for (const [subcategoryId, hours] of Object.entries(timeRecords)) {
        if (hours > 0) {
          recordPromises.push(
            apiRequest("PUT", `/api/entries/${entry.id}/time-records/${subcategoryId}`, {
              minutes: Math.round(hours * 60) // Convert hours to minutes
            })
          );
        }
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
        timeRecords: Object.entries(timeRecords)
          .filter(([_, hours]) => hours > 0) // Only include records with time > 0
          .map(([subcategoryId, hours]) => ({
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
      if (isEditMode && currentEntry && currentEntry.id) {
        console.log("Updating entry with ID:", currentEntry.id);
        dailyEntry = await updateDailyEntryMutation.mutateAsync(payload);
      } else {
        console.log("Creating new entry");
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
      <DialogContent 
        className={isMobile ? "w-full max-w-full h-[95vh] max-h-full overflow-y-auto pb-24" : "w-[95vw] max-w-[650px] max-h-[85vh] overflow-y-auto"}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl sm:text-2xl">{isEditMode ? "Edit" : "Add"} Daily Entry</DialogTitle>
          <DialogDescription>
            Form to enter or edit daily time tracking data for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </DialogDescription>
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
                      <FormItem className="space-y-1 mb-3">
                        <FormLabel 
                          htmlFor="sleepHours"
                          className="text-sm font-medium"
                        >
                          Today's Sleep Plan (hours)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="sleepHours"
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(val);
                            }}
                            className="max-w-[140px]"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          How many hours do you plan to sleep tonight?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* PredictedSleepHours - Next Day Prediction */}
                  <FormField
                    control={form.control}
                    name="predictedSleepHours"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-3">
                        <FormLabel 
                          htmlFor="predictedSleepHours"
                          className="text-sm font-medium"
                        >
                          Predicted Sleep (hours)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="predictedSleepHours"
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(val);
                            }}
                            className="max-w-[140px]"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          How many hours do you expect to actually sleep?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Sleep Reporting Section */}
                <div className="pb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Last Night's Sleep</h4>
                  
                  {/* ActualSleepHours - Previous Night's Actual Hours */}
                  <FormField
                    control={form.control}
                    name="actualSleepHours"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-3">
                        <FormLabel 
                          htmlFor="actualSleepHours"
                          className="text-sm font-medium"
                        >
                          Actual Sleep (hours)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="actualSleepHours"
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(val);
                            }}
                            className="max-w-[140px]"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          How many hours did you actually sleep last night?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Sleep Quality Rating */}
                  <FormField
                    control={form.control}
                    name="sleepQuality"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-2">
                        <FormLabel 
                          htmlFor="sleepQuality"
                          className="text-sm font-medium"
                        >
                          Sleep Quality (1-10)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="sleepQuality"
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(val);
                            }}
                            className="max-w-[140px]"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          How would you rate your sleep quality?
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-1 mb-3 border-t border-gray-200 pt-4">
                      <FormLabel 
                        htmlFor="notes"
                        className="text-sm font-medium"
                      >
                        Day Notes
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="notes"
                          {...field}
                          placeholder="Any notes about your day..."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Export Flag */}
                <FormField
                  control={form.control}
                  name="exportFlag"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-1 mt-3">
                      <FormControl>
                        <Checkbox
                          id="exportFlag"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="exportFlag" className="text-sm font-medium cursor-pointer">
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
                
                // Get color scheme for category
                const categoryColor = category.color && typeof category.color === 'string' && category.color.startsWith('#') 
                  ? category.color 
                  : '#16A34A';
                const { primary, secondary } = generateBalancedColorScheme(categoryColor);
                const textColor = getContrastingTextColor(primary);
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-md overflow-hidden transition-all hover:border-gray-300">
                    {/* Category header with primary color */}
                    <div 
                      className="px-4 py-2 font-semibold"
                      style={{ 
                        backgroundColor: primary,
                        color: textColor
                      }}
                    >
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-2">
                          <i className={`${getCategoryIcon(category.icon)} text-sm`}></i>
                        </div>
                        <h3>{category.name}</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                    
                      {/* Time Tracking Fields */}
                      {hasTimeItems && (
                        <>
                          <h4 className="text-xs font-medium mb-2 text-gray-600 pl-10">Time Tracking</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 md:pl-10 mb-4">
                            {category.subcategories
                              .filter(sub => !sub.goalType || sub.goalType === "time")
                              .map(sub => (
                                <div key={sub.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                  <label 
                                    htmlFor={`time-${category.id}-${sub.id}`} 
                                    className="text-sm font-medium truncate flex items-center"
                                  >
                                    <div className="h-4 w-4 rounded-full mr-2 flex items-center justify-center" 
                                      style={{ backgroundColor: secondary, color: textColor }}>
                                      <i className={`${getCategoryIcon(category.icon)} text-xs`}></i>
                                    </div>
                                    {sub.name}
                                  </label>
                                  <Select
                                    defaultValue={timeRecords[sub.id]?.toString() || "0.25"}
                                    value={timeRecords[sub.id]?.toString() || "0.25"}
                                    onValueChange={(value) => handleTimeChange(sub.id, value)}
                                  >
                                    <SelectTrigger 
                                      id={`time-${category.id}-${sub.id}`}
                                      name={`time-${category.id}-${sub.id}`}
                                      className="w-full sm:w-[110px] md:w-[140px]"
                                    >
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
                                    className="text-sm font-medium cursor-pointer truncate flex items-center"
                                  >
                                    <div className="h-4 w-4 rounded-full mr-2 flex items-center justify-center" 
                                      style={{ backgroundColor: secondary, color: textColor }}>
                                      <i className={`${getCategoryIcon(category.icon)} text-xs`}></i>
                                    </div>
                                    {sub.name}
                                  </label>
                                </div>
                              ))
                            }
                          </div>
                        </>
                      )}
                    </div>
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