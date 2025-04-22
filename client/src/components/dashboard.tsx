import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryWithSubcategories, DashboardData } from "@shared/schema";
import { formatHours, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

import SummaryCard from "./summary-card";
import CategoryCard from "./category-card";
import CategoryDetail from "./category-detail";
import DailyEntryForm from "./daily-entry-form";
import CategoryForm from "./category-form";

export default function Dashboard() {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<(CategoryWithSubcategories & { actualHours: number; progress: number }) | null>(null);
  const [dailyEntryOpen, setDailyEntryOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  // Fetch categories to ensure we have the latest data
  const { data: categoriesData } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ['/api/categories', user?.id],
    enabled: !!user,
  });
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch: refetchDashboard } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', user?.id, date.toISOString().split('T')[0]],
    enabled: !!user,
    // Refresh data every 5 seconds when the page is visible
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Force always fresh data
    staleTime: 0,
  });
  
  const handlePrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };
  
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setShowCalendar(false);
    }
  };
  
  const handleCategoryClick = (category: any) => {
    setSelectedCategory(category);
  };
  
  const handleBackClick = () => {
    setSelectedCategory(null);
  };
  
  const handleAddEntryClick = () => {
    setDailyEntryOpen(true);
  };
  
  const handleAddCategoryClick = () => {
    setCategoryFormOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!dashboardData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <h3 className="font-semibold text-xl mb-4">No data available</h3>
        <p className="text-gray-500 mb-6">Start tracking your time by adding a daily entry.</p>
        <Button onClick={handleAddEntryClick}>Add Daily Entry</Button>
      </div>
    );
  }
  
  const { 
    dailyScore, 
    motivationLevel, 
    sleepDuration, 
    healthBalance, 
    categories 
  } = dashboardData;
  
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  
  const renderMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard
        title="Daily Score"
        value={formatPercent(dailyScore)}
        subtitle="Overall alignment with goals"
        icon="fa-solid fa-chart-line"
        color="blue"
      />
      <SummaryCard
        title="Motivation Level"
        value={formatPercent(motivationLevel)}
        subtitle="Energy and focus today"
        icon="fa-solid fa-bolt"
        color="yellow"
      />
      <SummaryCard
        title="Sleep Duration"
        value={`${sleepDuration} hrs`}
        subtitle="Last night's rest"
        icon="fa-solid fa-moon"
        color="purple"
      />
      <SummaryCard
        title="Health Balance"
        value={formatPercent(healthBalance)}
        subtitle="Physical activity vs rest"
        icon="fa-solid fa-heart"
        color="green"
      />
    </div>
  );
  
  const renderDateControls = () => (
    <div className="mb-6 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handlePrevDay}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div 
          className="font-medium cursor-pointer" 
          onClick={() => setShowCalendar(!showCalendar)}
        >
          {dateStr}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleNextDay}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddCategoryClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
        <Button 
          size="sm" 
          onClick={handleAddEntryClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>
    </div>
  );
  
  const renderCalendar = () => (
    <div className={`relative ${showCalendar ? 'block' : 'hidden'}`}>
      <Card className="absolute top-0 z-10 w-auto">
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </CardContent>
      </Card>
    </div>
  );
  
  const renderCategoryList = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          id={category.id}
          name={category.name}
          icon={category.icon}
          color={category.color}
          goalHours={category.goalHours}
          actualHours={category.actualHours}
          progress={category.progress}
          onClick={() => handleCategoryClick(category)}
        />
      ))}
    </div>
  );
  
  const renderCategoryDetail = () => {
    if (!selectedCategory) return null;
    
    const { 
      name, 
      icon, 
      color, 
      goalHours, 
      actualHours, 
      subcategories = [] 
    } = selectedCategory;
    
    const currentReality = [
      { name: "Time Spent", value: formatHours(actualHours) },
      { name: "Progress", value: formatPercent(selectedCategory.progress) },
      { name: "Average Daily", value: formatHours(actualHours / 7) },
      { name: "Subcategories", value: subcategories.length.toString() },
    ];
    
    const goals = [
      { name: "Goal Time", value: formatHours(goalHours) },
      { name: "Weekly Goal", value: formatHours(goalHours * 7) },
      { name: "Monthly Goal", value: formatHours(goalHours * 30) },
      { name: "Annual Goal", value: formatHours(goalHours * 365) },
    ];
    
    return (
      <CategoryDetail 
        category={selectedCategory}
        currentReality={currentReality}
        goals={goals}
      />
    );
  };
  
  return (
    <div className="p-6">
      {renderDateControls()}
      {renderCalendar()}
      {renderMetrics()}
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {selectedCategory ? (
            <div className="mb-4">
              <Button 
                variant="ghost" 
                onClick={handleBackClick} 
                className="mb-4"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to overview
              </Button>
              {renderCategoryDetail()}
            </div>
          ) : (
            renderCategoryList()
          )}
        </TabsContent>
        
        <TabsContent value="time" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Time Tracking</h3>
              <p className="text-gray-500">
                Detailed time tracking view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="habits" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Habits</h3>
              <p className="text-gray-500">
                Habits tracking view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <DailyEntryForm
        open={dailyEntryOpen}
        onOpenChange={(isOpen) => {
          setDailyEntryOpen(isOpen);
          if (!isOpen) {
            // Refetch dashboard data when the form closes to ensure latest data
            refetchDashboard();
          }
        }}
        selectedDate={date}
        categories={categoriesData || categories}
      />
      
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={(isOpen) => {
          setCategoryFormOpen(isOpen);
          if (!isOpen) {
            // Refetch categories and dashboard data when form closes
            queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
            refetchDashboard();
          }
        }}
      />
    </div>
  );
}