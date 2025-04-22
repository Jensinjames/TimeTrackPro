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
import { Plus, Trash2, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="overflow-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="categories">
        <TabsList className="mb-6">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
      const res = await apiRequest("POST", "/api/subcategories", subcategory);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
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
      toast({
        title: "Failed to create subcategory",
        description: error.message,
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
      const res = await apiRequest("PATCH", `/api/subcategories/${updatedSubcategory.id}`, updatedSubcategory);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingSubcategory(null);
      toast({
        title: "Subcategory updated",
        description: "Subcategory has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update subcategory",
        description: error.message,
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Categories list */}
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
                <div>
                  <h3 className="font-medium">{category.name}</h3>
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
                
                <div className="grid grid-cols-2 gap-3">
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
      
      {/* Category details */}
      {activeCategory ? (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <div className={`h-6 w-6 rounded ${getCategoryColor(activeCategory.name).bg} text-white flex items-center justify-center mr-2`}>
                <i className={getCategoryIcon(activeCategory.icon)}></i>
              </div>
              {activeCategory.name} Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Category details form */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Category Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
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
                
                <div className="grid grid-cols-2 gap-4">
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
                
                <Button 
                  onClick={() => updateCategoryMutation.mutate(activeCategory)}
                  disabled={updateCategoryMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Category
                </Button>
              </div>
              
              <Separator />
              
              {/* Subcategories */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Subcategories</h3>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setNewSubcategory({
                        ...newSubcategory,
                        categoryId: activeCategory.id
                      });
                      setIsAddingSubcategory(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Subcategory
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {isAddingSubcategory && (
                    <div className="p-3 rounded-md border border-blue-200 bg-blue-50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input 
                            value={newSubcategory.name} 
                            onChange={(e) => setNewSubcategory({...newSubcategory, name: e.target.value})}
                            placeholder="Enter name"
                            size="sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={newSubcategory.goalType}
                            onValueChange={(value) => setNewSubcategory({...newSubcategory, goalType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="time">Time</SelectItem>
                              <SelectItem value="binary">True/False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {newSubcategory.goalType === "time" && (
                        <div>
                          <Label className="text-xs">Goal (minutes)</Label>
                          <Input 
                            type="number"
                            value={newSubcategory.goalMinutes} 
                            onChange={(e) => setNewSubcategory({
                              ...newSubcategory, 
                              goalMinutes: parseInt(e.target.value)
                            })}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setIsAddingSubcategory(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => createSubcategoryMutation.mutate(newSubcategory)}
                          disabled={createSubcategoryMutation.isPending || !newSubcategory.name}
                        >
                          {createSubcategoryMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {activeCategory.subcategories.map((subcategory: any) => (
                    <div 
                      key={subcategory.id}
                      className={`p-3 rounded-md border ${
                        editingSubcategory?.id === subcategory.id 
                          ? `${getCategoryColor(activeCategory.name).border}`
                          : "border-gray-200"
                      }`}
                    >
                      {editingSubcategory?.id === subcategory.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Name</Label>
                              <Input 
                                value={editingSubcategory.name} 
                                onChange={(e) => setEditingSubcategory({...editingSubcategory, name: e.target.value})}
                                size="sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={editingSubcategory.goalType}
                                onValueChange={(value) => setEditingSubcategory({...editingSubcategory, goalType: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="time">Time</SelectItem>
                                  <SelectItem value="binary">True/False</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {editingSubcategory.goalType === "time" && (
                            <div>
                              <Label className="text-xs">Goal (minutes)</Label>
                              <Input 
                                type="number"
                                value={editingSubcategory.goalMinutes} 
                                onChange={(e) => setEditingSubcategory({
                                  ...editingSubcategory, 
                                  goalMinutes: parseInt(e.target.value)
                                })}
                              />
                            </div>
                          )}
                          
                          <div className="flex justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingSubcategory(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateSubcategoryMutation.mutate(editingSubcategory)}
                              disabled={updateSubcategoryMutation.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{subcategory.name}</div>
                            <div className="text-xs text-gray-500">
                              {subcategory.goalType === "time" 
                                ? `Goal: ${subcategory.goalMinutes} minutes` 
                                : "Type: True/False"}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEditingSubcategory(subcategory)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deleteSubcategoryMutation.mutate(subcategory.id)}
                              disabled={deleteSubcategoryMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="md:col-span-2">
          <CardContent className="flex items-center justify-center h-64 text-gray-500">
            Select a category to view and edit its settings
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input defaultValue={user?.name || ""} />
          </div>
          
          <div>
            <Label>Username</Label>
            <Input defaultValue={user?.username || ""} />
          </div>
          
          <div>
            <Label>Email</Label>
            <Input defaultValue={user?.email || ""} />
          </div>
          
          <div>
            <Label>New Password</Label>
            <Input type="password" />
          </div>
          
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" />
          </div>
          
          <Button>Save Changes</Button>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Daily Reminder Email</h3>
              <p className="text-sm text-gray-500">Receive a daily email reminder to complete your tracking</p>
            </div>
            <Switch defaultChecked={user?.emailReminders} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Weekly Summary</h3>
              <p className="text-sm text-gray-500">Receive a weekly summary of your progress</p>
            </div>
            <Switch defaultChecked={false} />
          </div>
          
          <div>
            <Label>Reminder Time</Label>
            <Select defaultValue="18">
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6:00 AM</SelectItem>
                <SelectItem value="12">12:00 PM</SelectItem>
                <SelectItem value="18">6:00 PM</SelectItem>
                <SelectItem value="20">8:00 PM</SelectItem>
                <SelectItem value="22">10:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useAuth } from "@/hooks/use-auth";
