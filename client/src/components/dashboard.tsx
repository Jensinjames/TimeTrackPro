import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCard from "./summary-card";
import CategoryCard from "./category-card";
import CategoryDetail from "./category-detail";
import DailyEntryForm from "./daily-entry-form";
import CategoryForm from "./category-form";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const isMobile = useIsMobile();
  
  const formattedDate = format(selectedDate, "EEEE, MMMM d, yyyy");
  
  // Fetch categories for the current user
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    }
  });
  
  // Fetch dashboard data for the selected date
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ["/api/dashboard", selectedDate.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?date=${selectedDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    }
  });
  
  // Fetch the daily entry for the selected date
  const { data: dailyEntry } = useQuery({
    queryKey: ["/api/entries", selectedDate.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/entries?date=${selectedDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch daily entry");
      return res.json();
    }
  });
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const handleAddEntry = () => {
    setIsEntryFormOpen(true);
  };
  
  const handleAddCategory = () => {
    setIsCategoryFormOpen(true);
  };
  
  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };
  
  // Loading state
  if (loadingCategories || loadingDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Prepare data for category detail view
  const getSelectedCategoryData = () => {
    if (!selectedCategory || !dashboardData) return null;
    
    const category = dashboardData.categories.find((cat: any) => cat.id === selectedCategory);
    if (!category) return null;
    
    // Calculate current reality
    const timeRecords = dailyEntry?.timeRecords || [];
    const categoryTimeRecords = timeRecords.filter(
      (record: any) => record.subcategory.categoryId === selectedCategory
    );
    
    const currentReality = category.subcategories
      .filter((sub: any) => sub.goalType === "time")
      .map((sub: any) => {
        const record = categoryTimeRecords.find(
          (rec: any) => rec.subcategoryId === sub.id
        );
        const minutes = record ? record.minutes : 0;
        return {
          name: sub.name,
          value: `${minutes / 60} hrs`
        };
      });
    
    // Calculate goals
    const goals = category.subcategories
      .filter((sub: any) => sub.goalType === "time")
      .map((sub: any) => ({
        name: sub.name,
        value: `${sub.goalMinutes / 60} hrs`
      }));
    
    return {
      category,
      currentReality,
      goals
    };
  };
  
  const selectedCategoryData = getSelectedCategoryData();
  
  return (
    <div className="container py-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <div className="flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="p-0 text-gray-600 font-normal">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formattedDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleAddEntry} 
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Daily Entry
          </Button>
          <Button 
            onClick={handleAddCategory} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>
      
      {dashboardData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard 
            title="Daily Score" 
            value={`${dashboardData.dailyScore}%`}
            subtitle="Overall Alignment"
            icon="fa-solid fa-chart-line"
            color="blue"
          />
          <SummaryCard 
            title="Motivation" 
            value={`${dashboardData.motivationLevel}%`}
            subtitle="Energy Level"
            icon="fa-solid fa-bolt"
            color="yellow"
          />
          <SummaryCard 
            title="Sleep" 
            value={`${dashboardData.sleepDuration} hrs`}
            subtitle="Last Night"
            icon="fa-solid fa-moon"
            color="purple"
          />
          <SummaryCard 
            title="Health Balance" 
            value={`${dashboardData.healthBalance}%`}
            subtitle="Health Habits"
            icon="fa-solid fa-heart"
            color="red"
          />
        </div>
      )}
      
      {/* Desktop layout */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {dashboardData?.categories.map((category: any) => (
                <CategoryCard 
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  icon={category.icon}
                  color={category.color}
                  goalHours={category.goalHours}
                  actualHours={category.actualHours}
                  progress={category.progress}
                  onClick={() => handleCategoryClick(category.id)}
                  isSelected={selectedCategory === category.id}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            {selectedCategoryData ? (
              <CategoryDetail 
                category={selectedCategoryData.category} 
                currentReality={selectedCategoryData.currentReality}
                goals={selectedCategoryData.goals}
              />
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                Select a category to view details
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile layout */}
      {isMobile && (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="m-0">
            <div className="grid grid-cols-1 gap-4">
              {dashboardData?.categories.map((category: any) => (
                <CategoryCard 
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  icon={category.icon}
                  color={category.color}
                  goalHours={category.goalHours}
                  actualHours={category.actualHours}
                  progress={category.progress}
                  onClick={() => handleCategoryClick(category.id)}
                  isSelected={selectedCategory === category.id}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="m-0">
            {selectedCategoryData ? (
              <CategoryDetail 
                category={selectedCategoryData.category} 
                currentReality={selectedCategoryData.currentReality}
                goals={selectedCategoryData.goals}
              />
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                Select a category to view details
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {categories && (
        <>
          <DailyEntryForm
            open={isEntryFormOpen}
            onOpenChange={setIsEntryFormOpen}
            selectedDate={selectedDate}
            categories={categories}
            currentEntry={dailyEntry}
          />
          
          <CategoryForm
            open={isCategoryFormOpen}
            onOpenChange={setIsCategoryFormOpen}
          />
        </>
      )}
    </div>
  );
}