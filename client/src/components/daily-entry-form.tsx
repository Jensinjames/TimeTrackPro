import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { timeOptions, getCategoryIcon, getCategoryColor } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CategoryWithSubcategories } from "@shared/schema";

interface DailyEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  categories: CategoryWithSubcategories[];
  currentEntry?: any;
}

export default function DailyEntryForm({ 
  open, 
  onOpenChange, 
  selectedDate,
  categories,
  currentEntry
}: DailyEntryFormProps) {
  const [dateValue, setDateValue] = useState<string>(selectedDate.toISOString().split('T')[0]);
  const [timeValues, setTimeValues] = useState<{[key: number]: string}>({});
  const [habitValues, setHabitValues] = useState<{[key: number]: boolean}>({});
  const [sleepHours, setSleepHours] = useState<string>("0");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form values from current entry if available
  useEffect(() => {
    if (currentEntry) {
      setSleepHours(currentEntry.sleepHours.toString());
      
      // Set time values
      const newTimeValues: {[key: number]: string} = {};
      currentEntry.timeRecords.forEach((record: any) => {
        newTimeValues[record.subcategoryId] = record.minutes.toString();
      });
      setTimeValues(newTimeValues);
      
      // Set habit values
      const newHabitValues: {[key: number]: boolean} = {};
      currentEntry.habitRecords.forEach((record: any) => {
        newHabitValues[record.subcategoryId] = record.completed;
      });
      setHabitValues(newHabitValues);
    }
  }, [currentEntry]);
  
  // Update date when selected date changes
  useEffect(() => {
    setDateValue(selectedDate.toISOString().split('T')[0]);
  }, [selectedDate]);
  
  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/entries", formData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
      toast({
        title: "Entry saved",
        description: "Your daily entry has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSave = () => {
    // Prepare time records
    const timeRecords = Object.entries(timeValues).map(([subcategoryId, minutes]) => ({
      subcategoryId: parseInt(subcategoryId),
      minutes: parseInt(minutes || "0"),
    }));
    
    // Prepare habit records
    const habitRecords = Object.entries(habitValues).map(([subcategoryId, completed]) => ({
      subcategoryId: parseInt(subcategoryId),
      completed: completed || false,
    }));
    
    // Prepare form data
    const formData = {
      date: new Date(dateValue).toISOString(),
      sleepHours: parseFloat(sleepHours || "0"),
      timeRecords,
      habitRecords,
    };
    
    saveMutation.mutate(formData);
  };
  
  // Group subcategories by category
  const categorizedSubcategories = categories.map(cat => ({
    ...cat,
    timeSubcategories: cat.subcategories.filter(sub => sub.goalType === "time"),
    habitSubcategories: cat.subcategories.filter(sub => sub.goalType === "binary"),
  }));
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Daily Entry</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        
        <div className="p-0 sm:p-2">
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">Date</Label>
            <Input 
              type="date" 
              value={dateValue} 
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Sleep Duration */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">Sleep Duration</Label>
            <Select 
              value={sleepHours} 
              onValueChange={(value) => setSleepHours(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sleep duration" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Render time tracking inputs for each category */}
          {categorizedSubcategories.map((category) => (
            <div key={category.id} className="mb-6">
              {category.timeSubcategories.length > 0 && (
                <>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <div className={`h-6 w-6 rounded ${getCategoryColor(category.name).bg} text-white flex items-center justify-center mr-2`}>
                      <i className={`${getCategoryIcon(category.icon)} text-xs`}></i>
                    </div>
                    {category.name}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {category.timeSubcategories.map((subcategory) => (
                        <div key={subcategory.id}>
                          <Label className="block text-sm font-medium text-gray-700 mb-2">
                            {subcategory.name}
                          </Label>
                          <Select 
                            value={timeValues[subcategory.id] || "0"} 
                            onValueChange={(value) => setTimeValues({...timeValues, [subcategory.id]: value})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Health Habits section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Health Habits</h3>
            
            <div className="space-y-4">
              {categories.flatMap(category => 
                category.subcategories
                  .filter(sub => sub.goalType === "binary")
                  .map(subcategory => (
                    <div 
                      key={subcategory.id} 
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                    >
                      <span className="text-sm font-medium">{subcategory.name}</span>
                      <Switch 
                        checked={habitValues[subcategory.id] || false}
                        onCheckedChange={(checked) => setHabitValues({...habitValues, [subcategory.id]: checked})}
                      />
                    </div>
                  ))
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
