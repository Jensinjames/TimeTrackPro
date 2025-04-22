import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { categoryColors } from "@/lib/utils";
import { X, Plus } from "lucide-react";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: any;
}

export default function CategoryForm({ 
  open, 
  onOpenChange, 
  editCategory 
}: CategoryFormProps) {
  const [name, setName] = useState(editCategory?.name || "");
  const [icon, setIcon] = useState(editCategory?.icon || "fa-solid fa-pray");
  const [color, setColor] = useState(editCategory?.color || "blue");
  const [goalHours, setGoalHours] = useState(editCategory?.goalHours?.toString() || "10");
  const [subcategories, setSubcategories] = useState<Array<{name: string, goalMinutes: string, goalType: string, id?: number}>>(
    editCategory?.subcategories?.map((sub: any) => ({
      id: sub.id,
      name: sub.name,
      goalMinutes: sub.goalMinutes.toString(),
      goalType: sub.goalType
    })) || []
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editCategory) {
        // Update existing category
        const res = await apiRequest("PATCH", `/api/categories/${editCategory.id}`, formData);
        return await res.json();
      } else {
        // Create new category
        const res = await apiRequest("POST", "/api/categories", formData);
        return await res.json();
      }
    },
    onSuccess: async (data) => {
      // Process subcategories
      if (subcategories.length > 0) {
        // For each subcategory, create or update
        for (const sub of subcategories) {
          if (sub.id) {
            // Update existing subcategory
            await apiRequest("PATCH", `/api/subcategories/${sub.id}`, {
              name: sub.name,
              goalMinutes: parseInt(sub.goalMinutes),
              goalType: sub.goalType
            });
          } else {
            // Create new subcategory
            await apiRequest("POST", "/api/subcategories", {
              categoryId: data.id,
              name: sub.name,
              goalMinutes: parseInt(sub.goalMinutes),
              goalType: sub.goalType
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
      toast({
        title: `Category ${editCategory ? "updated" : "created"}`,
        description: `${name} has been ${editCategory ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${editCategory ? "update" : "create"} category`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddSubcategory = () => {
    setSubcategories([...subcategories, {
      name: "",
      goalMinutes: "60",
      goalType: "time"
    }]);
  };
  
  const handleRemoveSubcategory = (index: number) => {
    const newSubcategories = [...subcategories];
    newSubcategories.splice(index, 1);
    setSubcategories(newSubcategories);
  };
  
  const handleSubcategoryChange = (index: number, field: string, value: string) => {
    const newSubcategories = [...subcategories];
    newSubcategories[index] = {
      ...newSubcategories[index],
      [field]: value
    };
    setSubcategories(newSubcategories);
  };
  
  const handleSave = () => {
    if (!name) {
      toast({
        title: "Name is required",
        description: "Please provide a name for the category",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare form data
    const formData = {
      name,
      icon,
      color,
      goalHours: parseFloat(goalHours),
      order: editCategory?.order || 0,
    };
    
    saveMutation.mutate(formData);
  };
  
  const iconOptions = [
    { value: "fa-solid fa-pray", label: "Prayer" },
    { value: "fa-solid fa-heart", label: "Heart" },
    { value: "fa-solid fa-briefcase", label: "Work" },
    { value: "fa-solid fa-dumbbell", label: "Exercise" },
    { value: "fa-solid fa-book", label: "Book" },
    { value: "fa-solid fa-graduation-cap", label: "Education" },
    { value: "fa-solid fa-users", label: "Social" },
    { value: "fa-solid fa-utensils", label: "Food" },
    { value: "fa-solid fa-couch", label: "Rest" },
    { value: "fa-solid fa-code", label: "Coding" },
    { value: "fa-solid fa-gamepad", label: "Gaming" },
    { value: "fa-solid fa-palette", label: "Art" },
    { value: "fa-solid fa-music", label: "Music" },
    { value: "fa-solid fa-running", label: "Run" },
    { value: "fa-solid fa-home", label: "Home" },
    { value: "fa-solid fa-baby", label: "Family" },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{editCategory ? "Edit" : "Create"} Category</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        
        <div className="p-0 sm:p-2">
          {/* Category Details */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Category Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Faith, Work, Health"
                className="w-full"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Icon</Label>
              <Select 
                value={icon} 
                onValueChange={(value) => setIcon(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center">
                        <i className={`${option.value} mr-2`}></i>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Color</Label>
              <Select 
                value={color} 
                onValueChange={(value) => setColor(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryColors).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded-full mr-2 ${value.bg}`}></div>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Goal Hours (per week)</Label>
              <Input 
                type="number" 
                min="0"
                step="0.5"
                value={goalHours} 
                onChange={(e) => setGoalHours(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Subcategories */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Subcategories</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddSubcategory}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {subcategories.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No subcategories. Add some to track specific activities.
              </div>
            ) : (
              <div className="space-y-4">
                {subcategories.map((sub, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-3 bg-gray-50 p-3 rounded-md relative">
                    <button
                      onClick={() => handleRemoveSubcategory(index)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Name</Label>
                      <Input 
                        value={sub.name} 
                        onChange={(e) => handleSubcategoryChange(index, "name", e.target.value)}
                        placeholder="e.g., Prayer, Reading"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Goal Minutes</Label>
                      <Input 
                        type="number" 
                        min="0"
                        step="15"
                        value={sub.goalMinutes} 
                        onChange={(e) => handleSubcategoryChange(index, "goalMinutes", e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Type</Label>
                      <Select 
                        value={sub.goalType} 
                        onValueChange={(value) => handleSubcategoryChange(index, "goalType", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">Time (minutes)</SelectItem>
                          <SelectItem value="binary">Yes/No Habit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : `${editCategory ? "Update" : "Create"} Category`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}