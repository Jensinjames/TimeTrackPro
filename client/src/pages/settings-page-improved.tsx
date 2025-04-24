import { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { CategoryWithSubcategories, Subcategory } from "@shared/schema";

// UI Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, ChevronLeft, Send, Mail, AlertTriangle } from "lucide-react";

// Custom components
import CategoryList from "@/components/category-list";
import SubcategoryList from "@/components/subcategory-list";
import CategoryForm from "@/components/category-form";
import SubcategoryForm from "@/components/subcategory-form";

function SettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories">
          <CategorySettings />
        </TabsContent>
        
        <TabsContent value="profile">
          <AccountSettings />
        </TabsContent>
        
        <TabsContent value="preferences">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const CategorySettings = memo(() => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSubcategories | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  
  // Fetch categories
  const { data: categories, isLoading } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ["/api/categories"],
    staleTime: 10000, // Add a stale time to improve performance
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setSelectedCategory(null);
      toast({
        title: "Category deleted",
        description: "Category has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete subcategory mutation
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
    onError: (error: Error) => {
      toast({
        title: "Failed to delete subcategory",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Callback handlers
  const handleCategorySelect = useCallback((category: CategoryWithSubcategories) => {
    setSelectedCategory(category);
    setEditingSubcategory(null);
  }, []);
  
  const handleDeleteCategory = useCallback((id: number) => {
    deleteCategoryMutation.mutate(id);
  }, [deleteCategoryMutation]);
  
  const handleSubcategoryEdit = useCallback((subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
  }, []);
  
  const handleDeleteSubcategory = useCallback((id: number) => {
    deleteSubcategoryMutation.mutate(id);
  }, [deleteSubcategoryMutation]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left panel - Category List */}
      <div className="md:col-span-1">
        <Card>
          <CardContent className="p-6">
            <CategoryList 
              categories={categories}
              isLoading={isLoading}
              onCategorySelect={handleCategorySelect}
              onDeleteCategory={handleDeleteCategory}
              selectedCategoryId={selectedCategory?.id}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Right panel - Category Details and Subcategories */}
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-6">
            {selectedCategory ? (
              <div className="space-y-6">
                {/* Category details & edit form */}
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">Category Details</h3>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this category? This action cannot be undone.
                          All subcategories and related data will also be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(selectedCategory.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <CategoryForm 
                  category={selectedCategory} 
                  onClose={() => {}}
                  onSuccess={(updatedCategory) => {
                    setSelectedCategory(prev => 
                      prev && prev.id === updatedCategory.id 
                        ? {...prev, ...updatedCategory} 
                        : prev
                    );
                  }}
                />
                
                <Separator className="my-6" />
                
                {/* Subcategories list and form */}
                {editingSubcategory ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">Edit Subcategory</h3>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingSubcategory(null)}
                      >
                        Back to List
                      </Button>
                    </div>
                    
                    <SubcategoryForm 
                      subcategory={editingSubcategory} 
                      onClose={() => setEditingSubcategory(null)}
                    />
                    
                    <div className="flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Subcategory
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this subcategory? This action cannot be undone.
                              All related data will also be deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                              handleDeleteSubcategory(editingSubcategory.id);
                              setEditingSubcategory(null);
                            }}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ) : (
                  <SubcategoryList 
                    subcategories={selectedCategory.subcategories}
                    isLoading={isLoading}
                    categoryId={selectedCategory.id}
                    onSubcategoryEdit={handleSubcategoryEdit}
                    onDeleteSubcategory={handleDeleteSubcategory}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No Category Selected</h3>
                <p className="text-gray-500 mb-6">Select a category from the list or create a new one to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

CategorySettings.displayName = 'CategorySettings';

function AccountSettings() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: ""
  });
  
  // Password validation states
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  
  // Password strength checks
  const hasMinLength = formState.newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(formState.newPassword);
  const hasLowercase = /[a-z]/.test(formState.newPassword);
  const hasNumber = /[0-9]/.test(formState.newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formState.newPassword);
  
  const isPasswordValid = 
    formState.newPassword === "" || // Empty is valid (not changing password)
    (hasMinLength && hasUppercase && hasLowercase && hasNumber);
  
  const isPasswordStrong = isPasswordValid && hasSpecial;
  
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: typeof formState) => {
      // Only send password fields if both are provided
      if (userData.currentPassword || userData.newPassword) {
        if (!userData.currentPassword) {
          throw new Error("Current password is required to change password");
        }
        if (!userData.newPassword) {
          throw new Error("New password is required");
        }
        if (!isPasswordValid) {
          throw new Error("New password doesn't meet the requirements");
        }
      }
      
      const response = await apiRequest("PATCH", "/api/user", userData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
      
      // Clear password fields after successful update
      setFormState(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: ""
      }));
      setPasswordError("");
    },
    onError: (error: Error) => {
      // Handle common password errors
      if (error.message.includes("Current password is incorrect")) {
        setPasswordError("The current password you entered is incorrect");
      } else {
        setPasswordError("");
      }
      
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear password error when user changes input
    if (name === "currentPassword" || name === "newPassword") {
      setPasswordError("");
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password if attempting to change it
    if (formState.newPassword && !isPasswordValid) {
      setPasswordError("Password doesn't meet the security requirements");
      return;
    }
    
    updateProfileMutation.mutate(formState);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              name="name"
              value={formState.name} 
              onChange={handleInputChange}
              className="w-full md:w-2/3 lg:w-1/2" 
            />
          </div>
          
          <div>
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username"
              name="username"
              value={formState.username} 
              onChange={handleInputChange}
              className="w-full md:w-2/3 lg:w-1/2" 
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email"
              name="email"
              type="email" 
              value={formState.email} 
              onChange={handleInputChange}
              className="w-full md:w-2/3 lg:w-1/2" 
            />
          </div>
          
          <Separator className="my-6" />
          
          <div>
            <Label className="flex items-center justify-between">
              <span>Change Password</span>
              {passwordError && (
                <span className="text-sm text-red-500">{passwordError}</span>
              )}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Input 
                  type="password"
                  name="currentPassword" 
                  value={formState.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Current password" 
                  className={`w-full ${passwordError?.includes("current password") ? "border-red-500" : ""}`}
                />
              </div>
              <div className={isMobile ? "mt-4 md:mt-0" : ""}>
                <Input 
                  type="password" 
                  name="newPassword"
                  value={formState.newPassword}
                  onChange={handleInputChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => {
                    // Keep focused state if there's content and it's not valid
                    if (formState.newPassword && !isPasswordValid) {
                      return;
                    }
                    setPasswordFocused(false);
                  }}
                  placeholder="New password" 
                  className={`w-full ${formState.newPassword && !isPasswordValid ? "border-red-500" : ""}`}
                />
              </div>
            </div>
            
            {/* Password requirements */}
            {(passwordFocused || formState.newPassword) && (
              <div className="mt-3 space-y-1 text-xs">
                <p className="font-medium">Password requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1">
                  <div className={`flex items-center ${hasMinLength ? "text-green-600" : "text-gray-500"}`}>
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${hasMinLength ? "bg-green-100" : "bg-gray-100"}`}>
                      {hasMinLength ? "✓" : "·"}
                    </div>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center ${hasUppercase ? "text-green-600" : "text-gray-500"}`}>
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${hasUppercase ? "bg-green-100" : "bg-gray-100"}`}>
                      {hasUppercase ? "✓" : "·"}
                    </div>
                    Uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center ${hasLowercase ? "text-green-600" : "text-gray-500"}`}>
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${hasLowercase ? "bg-green-100" : "bg-gray-100"}`}>
                      {hasLowercase ? "✓" : "·"}
                    </div>
                    Lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center ${hasNumber ? "text-green-600" : "text-gray-500"}`}>
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${hasNumber ? "bg-green-100" : "bg-gray-100"}`}>
                      {hasNumber ? "✓" : "·"}
                    </div>
                    Number (0-9)
                  </div>
                </div>
                <div className={`flex items-center ${hasSpecial ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${hasSpecial ? "bg-green-100" : "bg-gray-100"}`}>
                    {hasSpecial ? "✓" : "·"}
                  </div>
                  Special character (recommended)
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full sm:w-auto"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailReminders: user?.emailReminders || false,
    weeklySummary: true,
    goalAchievement: true,
    reminderTime: "18:00"
  });
  
  const updateNotificationsMutation = useMutation({
    mutationFn: async (prefs: typeof notificationPrefs) => {
      await apiRequest("PATCH", "/api/user/notifications", prefs);
    },
    onSuccess: () => {
      toast({
        title: "Notification preferences updated",
        description: "Your notification preferences have been saved successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update preferences",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSwitchChange = (field: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const handleTimeChange = (value: string) => {
    setNotificationPrefs(prev => ({
      ...prev,
      reminderTime: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotificationsMutation.mutate(notificationPrefs);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-medium">Daily Reminder Email</h3>
                <p className="text-sm text-gray-500">Receive a daily email reminder to complete your tracking</p>
              </div>
              <Switch 
                checked={notificationPrefs.emailReminders} 
                onCheckedChange={() => handleSwitchChange('emailReminders')}
              />
            </div>
            
            {notificationPrefs.emailReminders && (
              <div className="ml-0 sm:ml-6 p-4 bg-gray-50 rounded-md">
                <Label htmlFor="reminderTime">Reminder Time</Label>
                <div className="mt-2 max-w-xs">
                  <Select 
                    value={notificationPrefs.reminderTime} 
                    onValueChange={handleTimeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00">6:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                      <SelectItem value="20:00">8:00 PM</SelectItem>
                      <SelectItem value="22:00">10:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-medium">Weekly Summary</h3>
                <p className="text-sm text-gray-500">Get a weekly email with your progress report</p>
              </div>
              <Switch 
                checked={notificationPrefs.weeklySummary} 
                onCheckedChange={() => handleSwitchChange('weeklySummary')}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-medium">Goal Achievement</h3>
                <p className="text-sm text-gray-500">Be notified when you reach your daily goals</p>
              </div>
              <Switch 
                checked={notificationPrefs.goalAchievement} 
                onCheckedChange={() => handleSwitchChange('goalAchievement')}
              />
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full sm:w-auto"
              disabled={updateNotificationsMutation.isPending}
            >
              {updateNotificationsMutation.isPending ? "Saving..." : "Save Notification Preferences"}
            </Button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-medium mb-4">Test Email Notifications</h3>
          <div className="space-y-4">
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Test Notifications
                </CardTitle>
                <CardDescription>
                  Send test emails to verify your notification settings are working
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <TestEmailButton 
                    type="daily" 
                    label="Daily Reminder" 
                    disabled={!notificationPrefs.emailReminders} 
                  />
                  <TestEmailButton 
                    type="weekly" 
                    label="Weekly Summary" 
                    disabled={!notificationPrefs.weeklySummary} 
                  />
                  <TestEmailButton 
                    type="goal" 
                    label="Goal Achievement" 
                    disabled={!notificationPrefs.goalAchievement} 
                  />
                </div>
                
                {!notificationPrefs.emailReminders && 
                !notificationPrefs.weeklySummary && 
                !notificationPrefs.goalAchievement && (
                  <div className="flex items-center mt-4 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Enable at least one notification type to send test emails</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TestEmailButton({ type, label, disabled }: { type: 'daily' | 'weekly' | 'goal', label: string, disabled: boolean }) {
  const { toast } = useToast();
  
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/notifications/test", { type });
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: `A test ${label.toLowerCase()} email has been sent to your email address.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => testEmailMutation.mutate()}
      disabled={disabled || testEmailMutation.isPending}
      className="flex items-center"
    >
      <Send className="h-4 w-4 mr-2" />
      {testEmailMutation.isPending ? `Sending ${label}...` : `Test ${label}`}
      {disabled && <Badge className="ml-2 bg-gray-300 text-gray-600">Disabled</Badge>}
    </Button>
  );
}

export default SettingsPage;