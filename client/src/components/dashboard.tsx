import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDateRange } from "@/hooks/use-date-range";
import { CategoryWithSubcategories, DashboardData } from "@shared/schema";
import { formatHours, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

import SummaryCard from "./summary-card";
import CategoryCard from "./category-card";
import CategoryDetail from "./category-detail";
import DailyEntryForm from "./daily-entry-form";
import CategoryForm from "./category-form";
import TimePies from "./time-pies";
import UnaccountedBadge from "./unaccounted-badge";

export default function Dashboard() {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<(CategoryWithSubcategories & { actualHours: number; progress: number }) | null>(null);
  const [dailyEntryOpen, setDailyEntryOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { dateRange, setDateRange } = useDateRange();
  
  // Fetch categories to ensure we have the latest data
  const { data: categoriesData } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ['/api/categories', user?.id],
    enabled: !!user,
  });
  
  // Fetch dashboard data - use date range if available
  const { data: dashboardData, isLoading, refetch: refetchDashboard } = useQuery<DashboardData>({
    queryKey: [
      '/api/dashboard', 
      user?.id, 
      dateRange?.from?.toISOString() || null,
      dateRange?.to?.toISOString() || date.toISOString().split('T')[0]
    ],
    queryFn: async () => {
      // Build URL with date range if available
      let url = '/api/dashboard';
      const params = new URLSearchParams();
      
      if (dateRange && dateRange.from && dateRange.to) {
        params.set('from', dateRange.from.toISOString());
        params.set('to', dateRange.to.toISOString());
      } else {
        params.set('date', date.toISOString());
      }
      
      url = `${url}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    enabled: !!user,
    // Refresh data every 5 seconds when the page is visible
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Force always fresh data
    staleTime: 0,
  });
  
  // Effect to clear single-day date when date range is active
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      // Clear out the calendar state since we're using date range
      setShowCalendar(false);
    }
  }, [dateRange]);
  
  const handlePrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
    
    // Clear any active date range
    setDateRange(undefined);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
    
    // Clear any active date range
    setDateRange(undefined);
  };
  
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setShowCalendar(false);
      
      // Clear any active date range
      setDateRange(undefined);
    }
  };
  
  // Handler for date range selection
  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
    
    // If a single date is selected in the range, update the current date
    if (range && range.from && !range.to) {
      setDate(range.from);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
        {/* Date Range Picker - Global Filter */}
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          className="w-full md:w-auto"
          presets={[7, 30, 90, 180, 365, 1095]}
        />
        
        {/* Daily Navigation - only visible when no date range is active */}
        {!dateRange?.from && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrevDay}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div 
              className="font-medium cursor-pointer text-sm sm:text-base" 
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {dateStr}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextDay}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center w-full sm:w-auto justify-end">
        <Button 
          size="sm" 
          onClick={handleAddEntryClick}
          className="flex-1 sm:flex-auto"
        >
          <Plus className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="whitespace-nowrap">Add Daily Entry</span>
        </Button>
      </div>
    </div>
  );
  
  const renderCalendar = () => (
    <div className={`relative ${showCalendar ? 'block' : 'hidden'}`}>
      <Card className="absolute top-0 left-0 sm:left-auto z-10 w-full sm:w-auto max-w-[100vw] overflow-auto">
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-md"
          />
        </CardContent>
      </Card>
    </div>
  );
  
  const renderCategoryList = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((category) => (
        <CategoryCard
          key={`category-${category.id}-${Date.now()}`} // Force re-render on data updates
          id={category.id}
          name={category.name}
          icon={category.icon}
          color={category.color}
          goalHours={category.goalHours}
          monthlyGoalHours={category.monthlyGoalHours}
          goalPeriod={category.goalPeriod}
          actualHours={category.actualHours}
          progress={category.progress}
          onClick={() => handleCategoryClick(category)}
          subcategories={category.subcategories || []}
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
      monthlyGoalHours = goalHours * 30, // Fallback for existing categories
      goalPeriod = 'daily', // Fallback for existing categories
      actualHours, 
      subcategories = [] 
    } = selectedCategory;
    
    // Calculate the correct daily/monthly values based on goal period
    const effectiveDailyGoal = goalPeriod === 'daily' ? goalHours : monthlyGoalHours / 30;
    const effectiveMonthlyGoal = goalPeriod === 'monthly' ? monthlyGoalHours : goalHours * 30;
    
    const currentReality = [
      { name: "Time Spent", value: formatHours(actualHours) },
      { name: "Progress", value: formatPercent(selectedCategory.progress) },
      { name: "Average Daily", value: formatHours(actualHours / 7) },
      { name: "Subcategories", value: subcategories.length.toString() },
    ];
    
    const goals = [
      { name: "Daily Goal", value: formatHours(effectiveDailyGoal) },
      { name: "Weekly Goal", value: formatHours(effectiveDailyGoal * 7) },
      { name: "Monthly Goal", value: formatHours(effectiveMonthlyGoal) },
      { name: "Annual Goal", value: formatHours(effectiveMonthlyGoal * 12) },
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
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="time" className="flex-1">Time Tracking</TabsTrigger>
          <TabsTrigger value="habits" className="flex-1">Habits</TabsTrigger>
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
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Display unaccounted time badge if data is available */}
              {(dashboardData.unaccountedMinutes ?? 0) > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-medium mb-2">Time Allocation Analysis</h3>
                  <p className="mb-3 text-sm text-gray-600">
                    For the selected {dateRange ? 'period' : 'day'}, you have:
                  </p>
                  <UnaccountedBadge 
                    unaccountedMinutes={dashboardData.unaccountedMinutes ?? 0} 
                    totalMinutes={1440 * (dashboardData.totalDays ?? 1)} 
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500 italic">
                    {dateRange 
                      ? "This represents time across the selected period that hasn't been tracked in any category."
                      : "This represents time during the day that hasn't been tracked in any category."}
                  </p>
                </div>
              )}
              
              {/* Display time allocation pie charts */}
              <TimePies />
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
    </div>
  );
}