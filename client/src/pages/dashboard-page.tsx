import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDateRange } from "@/hooks/use-date-range";
import { formatHours, formatPercent } from "@/lib/utils";
import { CategoryWithSubcategories, DashboardData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { CategoryCard } from "@/components/ui/category-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Zap, 
  Moon, 
  Heart, 
  Plus 
} from "lucide-react";
import DailyEntryForm from "@/components/daily-entry-form";
import CategoryDetailView from "@/components/category-detail-view";

export default function DashboardPage() {
  const [date, setDate] = useState(new Date());
  const [dailyEntryOpen, setDailyEntryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSubcategories & { actualHours: number, progress: number } | null>(null);
  const { user } = useAuth();
  const { dateRange, setDateRange } = useDateRange();
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
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
  });
  
  const handlePrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
    setDateRange(undefined);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
    setDateRange(undefined);
  };
  
  const handleAddEntryClick = () => {
    setDailyEntryOpen(true);
  };
  
  const handleViewCategoryDetails = (category: CategoryWithSubcategories & { actualHours: number, progress: number }) => {
    setSelectedCategory(category);
  };
  
  const handleCloseCategoryDetails = () => {
    setSelectedCategory(null);
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
    categories = [] 
  } = dashboardData;
  
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  
  // Transform the categories data to match the CategoryCard component props
  const categoryData = categories.map(category => {
    // Assuming the categories come from DB so we need to map them to our required format
    const title = category.name as 'Faith' | 'Life' | 'Work' | 'Health';
    const color = {
      'Faith': '#119447',
      'Life': '#C48A00',
      'Work': '#D63031',
      'Health': '#EC407A'
    }[title] || '#1E293B';
    
    // Map data for current and goals columns
    const current = [
      { label: "Time Spent", value: formatHours(category.actualHours) },
      { label: "Progress", value: formatPercent(category.progress) },
    ];
    
    const goals = [
      { label: "Daily Goal", value: formatHours(category.goalHours) },
      { label: "Monthly Goal", value: formatHours(category.monthlyGoalHours || category.goalHours * 30) },
    ];
    
    return {
      id: category.id,
      title,
      color,
      current,
      goals,
      progress: category.progress,
      category, // Keep the original category for reference
    };
  });
  
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top bar with breadcrumb and title */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center">
          <div className="text-sm text-gray-500 flex items-center">
            <span className="inline-block mr-2">Dashboard</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          <h1 className="text-lg md:text-2xl font-semibold">Dashboard</h1>
        </div>
        
        <Button onClick={handleAddEntryClick} size="sm" className="flex items-center">
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>
      
      {/* Date Range Controls */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full">
          {/* Date Range Picker */}
          <div className="w-full md:w-auto">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
              presets={[7, 30, 90, 365, 1095]}
            />
          </div>
          
          {/* Daily Navigation - only visible when no date range is active */}
          {!dateRange?.from && (
            <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 md:mt-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handlePrevDay}
                className="h-8 w-8 sm:h-9 sm:w-9"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium whitespace-nowrap min-w-[150px] text-center">
                {dateStr}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                className="h-8 w-8 sm:h-9 sm:w-9"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 md:mb-6">
        <KpiCard
          icon={<Target className="h-5 w-5" />}
          iconColor="text-primary-600"
          label="Daily Score"
          value={formatPercent(dailyScore)}
          subLabel="Overall daily performance score"
        />
        <KpiCard
          icon={<Zap className="h-5 w-5" />}
          iconColor="text-amber-500"
          label="Motivation Level"
          value={formatPercent(motivationLevel)}
          subLabel="Energy and focus today"
        />
        <KpiCard
          icon={<Moon className="h-5 w-5" />}
          iconColor="text-purple-500"
          label="Sleep Duration"
          value={`${sleepDuration} hrs`}
          subLabel="Last night's rest"
        />
        <KpiCard
          icon={<Heart className="h-5 w-5" />}
          iconColor="text-pink-500"
          label="Health Balance"
          value={formatPercent(healthBalance)}
          subLabel="Physical activity vs rest"
        />
      </div>
      
      {/* Category Cards Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
        {categoryData.map(item => (
          <CategoryCard
            key={item.id}
            title={item.title}
            color={item.color}
            current={item.current}
            goals={item.goals}
            progress={item.progress}
            onViewDetails={() => handleViewCategoryDetails(item.category)}
          />
        ))}
      </div>
      
      {/* Daily Entry Form Dialog */}
      <DailyEntryForm
        open={dailyEntryOpen}
        onOpenChange={setDailyEntryOpen}
        selectedDate={date}
        categories={categories}
      />
      
      {/* Category Detail Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && handleCloseCategoryDetails()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedCategory && (
            <CategoryDetailView 
              category={selectedCategory} 
              onBack={handleCloseCategoryDetails} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}