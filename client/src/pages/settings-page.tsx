import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon, getCategoryColor, hourOptions } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  return (
    <div className="overflow-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="categories">
        <TabsList className="mb-6 w-full flex overflow-x-auto">
          <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
          <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <CategorySettings />
        </TabsContent>
        
        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategorySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
  
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "sun",
    color: "#3b82f6",
    goalHours: 1
  });
  const [newSubcategory, setNewSubcategory] = useState({
    name: "",
    goalType: "time",
    goalMinutes: 30,
    categoryId: 0
  });
  
  // Handle category selection
  const handleCategorySelect = (category: any) => {
    setActiveCategory(category);
    setEditingSubcategory(null);
    setIsAddingSubcategory(false);
  };
  
  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (category: any) => {
      const res = await apiRequest("POST", "/api/categories", category);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddingCategory(false);
      setNewCategory({
        name: "",
        icon: "sun",
        color: "#3b82f6",
        goalHours: 1
      });
      toast({
        title: "Category created",
        description: "Category has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async (subcategory: any) => {
      console.log("Sending subcategory creation request:", subcategory);
      
      // Ensure goalMinutes is a number for time-based subcategories
      const payload = {
        ...subcategory,
        goalMinutes: subcategory.goalType === "time" 
          ? (parseInt(subcategory.goalMinutes) || 0) 
          : 0
      };
      
      console.log("Final subcategory creation payload:", payload);
      
      const res = await apiRequest("POST", "/api/subcategories", payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create subcategory");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Subcategory creation successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Also invalidate dashboard to reflect the changes there
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsAddingSubcategory(false);
      setNewSubcategory({
        name: "",
        goalType: "time",
        goalMinutes: 30,
        categoryId: 0
      });
      toast({
        title: "Subcategory created",
        description: "Subcategory has been created successfully",
      });
    },
    onError: (error) => {
      console.error("Subcategory creation error:", error);
      toast({
        title: "Failed to create subcategory",
        description: error.message || "An error occurred while creating the subcategory",
        variant: "destructive",
      });
    },
  });
  
  const updateCategoryMutation = useMutation({
    mutationFn: async (updatedCategory: any) => {
      const res = await apiRequest("PATCH", `/api/categories/${updatedCategory.id}`, updatedCategory);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Category updated",
        description: "Category has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateSubcategoryMutation = useMutation({
    mutationFn: async (updatedSubcategory: any) => {
      console.log("Sending subcategory update request:", updatedSubcategory);
      
      // Ensure goalMinutes is a number for time-based subcategories
      const payload = {
        ...updatedSubcategory,
        goalMinutes: updatedSubcategory.goalType === "time" 
          ? (parseInt(updatedSubcategory.goalMinutes) || 0) 
          : 0
      };
      
      console.log("Final subcategory update payload:", payload);
      
      const res = await apiRequest("PATCH", `/api/subcategories/${updatedSubcategory.id}`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update subcategory");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Subcategory update successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Also invalidate dashboard to reflect the changes there
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditingSubcategory(null);
      toast({
        title: "Subcategory updated",
        description: "Subcategory has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Subcategory update error:", error);
      toast({
        title: "Failed to update subcategory",
        description: error.message || "An error occurred while updating the subcategory",
        variant: "destructive",
      });
    },
  });
  
  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subcategories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Subcategory deleted",
        description: "Subcategory has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete subcategory",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setActiveCategory(null);
      toast({
        title: "Category deleted",
        description: "Category has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Category list - Always visible on desktop, only visible on mobile when no category is selected */}
      {(!isMobile || !activeCategory) && (
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories?.map((category: any) => (
                <div 
                  key={category.id}
                  className={`p-3 rounded-md cursor-pointer flex items-center ${
                    activeCategory?.id === category.id 
                      ? `${getCategoryColor(category.name).light} border ${getCategoryColor(category.name).border}`
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className={`h-8 w-8 rounded-md ${getCategoryColor(category.name).bg} text-white flex items-center justify-center mr-3`}>
                    <i className={getCategoryIcon(category.icon)}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{category.name}</h3>
                    <p className="text-xs text-gray-500">{category.subcategories.length} subcategories</p>
                  </div>
                </div>
              ))}
            </div>
            
            {isAddingCategory ? (
              <div className="mt-4 border rounded-md p-4 space-y-3">
                <h3 className="text-sm font-medium">Add New Category</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input 
                      value={newCategory.name} 
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={newCategory.icon}
                        onValueChange={(value) => setNewCategory({...newCategory, icon: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
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
                              <span>Briefcase</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="heart">
                            <div className="flex items-center">
                              <i className="fas fa-heart mr-2"></i>
                              <span>Heart</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Goal (hours)</Label>
                      <Select
                        value={newCategory.goalHours.toString()}
                        onValueChange={(value) => setNewCategory({...newCategory, goalHours: parseFloat(value)})}
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
                  </div>
                  
                  <div>
                    <Label>Color</Label>
                    <Input 
                      type="color"
                      value={newCategory.color} 
                      onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                      className="h-10"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsAddingCategory(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createCategoryMutation.mutate(newCategory)}
                      disabled={createCategoryMutation.isPending || !newCategory.name}
                    >
                      {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                className="w-full mt-4"
                onClick={() => setIsAddingCategory(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Category details - Always visible on desktop, only visible on mobile when category is selected */}
      {activeCategory && (
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <div className={`h-6 w-6 rounded ${getCategoryColor(activeCategory.name).bg} text-white flex items-center justify-center mr-2`}>
                <i className={getCategoryIcon(activeCategory.icon)}></i>
              </div>
              {activeCategory.name} Settings
            </CardTitle>
            
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveCategory(null)}
                className="ml-auto"
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Category details form */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Category Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input 
                      value={activeCategory.name} 
                      onChange={(e) => setActiveCategory({...activeCategory, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Goal (hours)</Label>
                    <Select
                      value={activeCategory.goalHours.toString()}
                      onValueChange={(value) => setActiveCategory({...activeCategory, goalHours: parseFloat(value)})}
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
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Icon</Label>
                    <Select
                      value={activeCategory.icon}
                      onValueChange={(value) => setActiveCategory({...activeCategory, icon: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
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
                            <span>Briefcase</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="heart">
                          <div className="flex items-center">
                            <i className="fas fa-heart mr-2"></i>
                            <span>Heart</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Color</Label>
                    <Input 
                      type="color"
                      value={activeCategory.color} 
                      onChange={(e) => setActiveCategory({...activeCategory, color: e.target.value})}
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                  <Button 
                    onClick={() => updateCategoryMutation.mutate(activeCategory)}
                    disabled={updateCategoryMutation.isPending}
                    className="w-full order-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Category
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      // Confirm before deleting
                      if (window.confirm(`Are you sure you want to delete the category "${activeCategory.name}" and all its subcategories?`)) {
                        deleteCategoryMutation.mutate(activeCategory.id);
                      }
                    }}
                    disabled={deleteCategoryMutation.isPending}
                    className="w-full order-2"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Category
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Subcategories */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Subcategories</h3>
                
                <div className="space-y-3 overflow-x-auto pb-2">
                  {activeCategory.subcategories?.map((subcategory: any) => (
                    <div 
                      key={subcategory.id}
                      className={`border rounded-md p-3 ${
                        editingSubcategory?.id === subcategory.id ? "border-blue-500" : ""
                      }`}
                    >
                      {editingSubcategory?.id === subcategory.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Name</Label>
                            <Input 
                              value={editingSubcategory.name} 
                              onChange={(e) => setEditingSubcategory({...editingSubcategory, name: e.target.value})}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label>Goal Type</Label>
                              <Select
                                value={editingSubcategory.goalType}
                                onValueChange={(value) => setEditingSubcategory({...editingSubcategory, goalType: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="time">Time-based</SelectItem>
                                  <SelectItem value="habit">Habit (Yes/No)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {editingSubcategory.goalType === "time" && (
                              <div>
                                <Label>Goal (minutes)</Label>
                                <Input 
                                  type="number"
                                  value={editingSubcategory.goalMinutes} 
                                  onChange={(e) => setEditingSubcategory({
                                    ...editingSubcategory, 
                                    goalMinutes: parseInt(e.target.value) || 0
                                  })}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-2">
                            <Button 
                              variant="outline"
                              onClick={() => setEditingSubcategory(null)}
                              className="w-full sm:w-auto order-2 sm:order-1"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => updateSubcategoryMutation.mutate(editingSubcategory)}
                              disabled={updateSubcategoryMutation.isPending || !editingSubcategory.name}
                              className="w-full sm:w-auto order-1 sm:order-2"
                            >
                              {updateSubcategoryMutation.isPending ? "Updating..." : "Update"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                          <div>
                            <h4 className="font-medium">{subcategory.name}</h4>
                            <p className="text-xs text-gray-500">
                              {subcategory.goalType === "time"
                                ? `${subcategory.goalMinutes} minutes per day`
                                : "Daily habit (Yes/No)"}
                            </p>
                          </div>
                          
                          <div className="flex space-x-1 mt-2 sm:mt-0">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingSubcategory(subcategory)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the subcategory "${subcategory.name}"?`)) {
                                  deleteSubcategoryMutation.mutate(subcategory.id);
                                }
                              }}
                              disabled={deleteSubcategoryMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isAddingSubcategory ? (
                    <div className="border rounded-md p-3 space-y-3">
                      <h4 className="text-sm font-medium">Add New Subcategory</h4>
                      
                      <div>
                        <Label>Name</Label>
                        <Input 
                          value={newSubcategory.name} 
                          onChange={(e) => setNewSubcategory({...newSubcategory, name: e.target.value})}
                          placeholder="Enter subcategory name"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Goal Type</Label>
                          <Select
                            value={newSubcategory.goalType}
                            onValueChange={(value) => setNewSubcategory({...newSubcategory, goalType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="time">Time-based</SelectItem>
                              <SelectItem value="habit">Habit (Yes/No)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {newSubcategory.goalType === "time" && (
                          <div>
                            <Label>Goal (minutes)</Label>
                            <Input 
                              type="number"
                              value={newSubcategory.goalMinutes} 
                              onChange={(e) => setNewSubcategory({
                                ...newSubcategory, 
                                goalMinutes: parseInt(e.target.value) || 0
                              })}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => setIsAddingSubcategory(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            createSubcategoryMutation.mutate({
                              ...newSubcategory,
                              categoryId: activeCategory.id
                            });
                          }}
                          disabled={createSubcategoryMutation.isPending || !newSubcategory.name}
                        >
                          {createSubcategoryMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsAddingSubcategory(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subcategory
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* No category selected prompt for desktop view */}
      {!activeCategory && !isMobile && (
        <Card className="md:col-span-2 flex flex-col items-center justify-center p-6">
          <div className="text-center py-12">
            <div className="bg-gray-100 p-6 rounded-full mx-auto mb-6 w-20 h-20 flex items-center justify-center">
              <i className="fas fa-arrow-left text-gray-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Select a category to view and edit its settings</h3>
            <p className="text-gray-500 max-w-md">Choose from your existing categories or create a new one to get started.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input defaultValue={user?.name || ""} className="w-full md:w-2/3 lg:w-1/2" />
          </div>
          
          <div>
            <Label>Username</Label>
            <Input defaultValue={user?.username || ""} className="w-full md:w-2/3 lg:w-1/2" />
          </div>
          
          <div>
            <Label>Email Address</Label>
            <Input type="email" defaultValue={user?.email || ""} className="w-full md:w-2/3 lg:w-1/2" />
          </div>
          
          <Separator className="my-6" />
          
          <div>
            <Label>Change Password</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Input type="password" placeholder="Current password" className="w-full" />
              </div>
              <div className={isMobile ? "mt-4 md:mt-0" : ""}>
                <Input type="password" placeholder="New password" className="w-full" />
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button className="w-full sm:w-auto">
              Save Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  const { user } = useAuth();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-medium">Daily Reminder Email</h3>
              <p className="text-sm text-gray-500">Receive a daily email reminder to complete your tracking</p>
            </div>
            <Switch defaultChecked={user?.emailReminders || false} />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-medium">Weekly Summary</h3>
              <p className="text-sm text-gray-500">Get a weekly email with your progress report</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-medium">Goal Achievement</h3>
              <p className="text-sm text-gray-500">Be notified when you reach your daily goals</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="pt-4">
            <Button className="w-full sm:w-auto">
              Save Notification Preferences
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}