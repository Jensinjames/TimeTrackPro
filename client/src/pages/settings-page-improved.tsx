import { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryWithSubcategories, Subcategory } from "@shared/schema";

// UI Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

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
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Profile settings will be implemented in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Application preferences will be implemented in a future update.</p>
            </CardContent>
          </Card>
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

export default SettingsPage;