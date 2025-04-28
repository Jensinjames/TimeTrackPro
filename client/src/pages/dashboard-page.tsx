import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDateRange } from "@/hooks/use-date-range";
import { formatHours, formatPercent } from "@/lib/utils";
import { CategoryWithSubcategories, DashboardData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsivePie } from "@nivo/pie";
import DailyEntryForm from "@/components/daily-entry-form";
import CategoryDetailView from "@/components/category-detail-view";
import { Plus } from "lucide-react";
import { 
  ArrowDown,
  Moon, 
  Heart, 
  Home,
  Briefcase,
  ChevronRight,
  Timer,
  Check
} from "lucide-react";

// Create a color mapping for categories with their primary, secondary and tertiary colors
const CATEGORY_COLORS = {
  'Faith': {
    primary: '#16A34A',  // Green
    secondary: '#4CAF50',
    tertiary: '#81C784',
    icon: <Check className="text-white w-5 h-5" />
  },
  'Fun': {
    primary: '#89F18C',  // Light Green as shown in settings screenshot
    secondary: '#A5F5A7',
    tertiary: '#C4F9C5',
    icon: <Check className="text-white w-5 h-5" />
  },
  'Life': {
    primary: '#D97706',  // Amber
    secondary: '#F59E0B',
    tertiary: '#FBBF24',
    icon: <Home className="text-white w-5 h-5" />
  },
  'Work': {
    primary: '#DC2626',  // Red
    secondary: '#EF4444',
    tertiary: '#F87171',
    icon: <Briefcase className="text-white w-5 h-5" />
  },
  'Health': {
    primary: '#EC4899',  // Pink
    secondary: '#F472B6',
    tertiary: '#F9A8D4',
    icon: <Heart className="text-white w-5 h-5" />
  }
};

// Helper to get actual color from DB value
// Import color utilities
import { generateBalancedColorScheme, getContrastingTextColor } from "@/lib/color-utils";

const getColorFromDBValue = (colorValue: string): {primary: string, secondary: string, tertiary: string, icon: JSX.Element} => {
  // If the color is a direct match to one of our category names
  if (colorValue in CATEGORY_COLORS) {
    return CATEGORY_COLORS[colorValue as keyof typeof CATEGORY_COLORS];
  }
  
  // If the color is a hex code, generate a balanced color scheme
  if (colorValue.startsWith('#')) {
    // Look for exact matches to our predefined colors first
    const matchingCategory = Object.entries(CATEGORY_COLORS).find(([_, values]) => 
      values.primary.toLowerCase() === colorValue.toLowerCase()
    );
    
    if (matchingCategory) {
      return matchingCategory[1];
    }
    
    // Generate a balanced color scheme from the hex value
    const { primary, secondary, tertiary } = generateBalancedColorScheme(colorValue);
    
    // Determine if we should use black or white for the icon based on contrast
    const textColor = getContrastingTextColor(primary);
    const iconColor = textColor === "#FFFFFF" ? "text-white" : "text-black";
    
    // Choose an appropriate icon based on the color
    // We could make this more sophisticated by mapping to category names if needed
    const icon = <Check className={`${iconColor} w-5 h-5`} />;
    
    return {
      primary,
      secondary,
      tertiary,
      icon
    };
  }
  
  // Default fallback
  return CATEGORY_COLORS['Faith'];
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [date, setDate] = useState(new Date());
  const [dailyEntryOpen, setDailyEntryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSubcategories & { actualHours: number, progress: number } | null>(null);
  const { user } = useAuth();
  const { dateRange, setDateRange } = useDateRange();
  const queryClient = useQueryClient();
  
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
    // Refresh every minute when the page is visible
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  
  // Fetch categories for the entry form
  const { data: categoriesData } = useQuery<CategoryWithSubcategories[]>({
    queryKey: ['/api/categories', user?.id],
    enabled: !!user,
  });
  
  const handleAddEntryClick = () => {
    setDailyEntryOpen(true);
  };
  
  const handleViewCategoryDetails = (category: CategoryWithSubcategories & { actualHours: number, progress: number }) => {
    setSelectedCategory(category);
  };
  
  const handleCloseCategoryDetails = () => {
    setSelectedCategory(null);
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'today' | 'week');
    
    if (value === 'today') {
      // Set to today's date
      setDateRange(undefined);
      setDate(new Date());
    } else {
      // Set to this week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
      
      setDateRange({
        from: startOfWeek,
        to: endOfWeek
      });
    }
  };
  
  // When entry form is closed, update dashboard data
  const handleEntryFormChange = (open: boolean) => {
    setDailyEntryOpen(open);
    
    if (!open) {
      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    }
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
    categories = [] 
  } = dashboardData;
  
  // Get category data and map to colors
  const getCategoryData = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return null;
    
    // Get subcategory data with percentages
    const subcategories = category.subcategories.map(sub => {
      const minutes = sub.goalMinutes;
      const totalMinutes = category.subcategories.reduce((acc, curr) => acc + curr.goalMinutes, 0);
      const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      
      return {
        ...sub,
        calculatedPercentage: percentage
      };
    });
    
    // Sort by percentage (descending)
    const sortedSubcategories = [...subcategories].sort((a, b) => 
      (b.calculatedPercentage || 0) - (a.calculatedPercentage || 0));
    
    return {
      ...category,
      subcategories: sortedSubcategories,
    };
  };
  
  // Get category data with colors mapped
  const faithCategory = getCategoryData('Faith');
  const lifeCategory = getCategoryData('Life');
  const workCategory = getCategoryData('Work');
  const healthCategory = getCategoryData('Health');
  const funCategory = getCategoryData('Fun');
  
  // Simple pie chart with progress
  const renderDonutChart = (
    value: number, 
    segments: { name: string, value: number, color: string }[],
    size: number = 200,
    centerLabel?: string
  ) => {
    // Map segments to nivo pie data format
    const pieData = segments.map(segment => ({
      id: segment.name,
      label: segment.name,
      value: segment.value,
      color: segment.color
    }));
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsivePie
          data={pieData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          innerRadius={0.7}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          colors={{ datum: 'data.color' }}
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          isInteractive={true}
          motionConfig="gentle"
          transitionMode="startAngle"
          defs={[
            {
              id: 'dots',
              type: 'patternDots',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              size: 4,
              padding: 1,
              stagger: true
            },
            {
              id: 'lines',
              type: 'patternLines',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              rotation: -45,
              lineWidth: 6,
              spacing: 10
            }
          ]}
        />
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold">{centerLabel}</div>
          </div>
        )}
        
        {/* Show segment percentages around the donut */}
        {segments.length > 0 && segments.length <= 3 && (
          <>
            {segments.map((segment, index) => {
              // Position percentages around the donut
              let top, left, align;
              
              // For 2 items, position top and bottom
              if (segments.length === 2) {
                if (index === 0) {
                  top = '28%';
                  left = '30%';
                  align = 'left';
                } else {
                  top = '60%';
                  left = '30%';
                  align = 'left';
                }
              }
              // For 3 items, position around the chart
              else if (segments.length === 3) {
                if (index === 0) {
                  top = '30%';
                  left = '68%';
                  align = 'right';
                } else if (index === 1) {
                  top = '55%';
                  left = '68%';
                  align = 'right';
                } else {
                  top = '42%';
                  left = '30%';
                  align = 'left';
                }
              } else {
                return null;
              }
              
              return (
                <div 
                  key={segment.name}
                  className="absolute text-sm font-medium z-10"
                  style={{ 
                    top, 
                    left, 
                    textAlign: align as any
                  }}
                >
                  {segment.value}%
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };
  
  // Get colors for a category
  const getCategoryColors = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || {
      primary: '#64748B',
      secondary: '#94A3B8',
      tertiary: '#CBD5E1',
      icon: <Check className="text-white w-5 h-5" />
    };
  };
  
  // Create segments from subcategories
  const createSegmentsFromSubcategories = (
    category?: CategoryWithSubcategories & { actualHours: number, progress: number, subcategories: any[] }
  ) => {
    if (!category) return [];
    
    const colors = getCategoryColors(category.name);
    
    // Instead of relying on the calculatedPercentage property which TypeScript doesn't recognize,
    // calculate percentages directly here
    const calculatePercentage = (subcategory: any) => {
      const minutes = subcategory.goalMinutes;
      const totalMinutes = category.subcategories.reduce((acc, curr) => acc + curr.goalMinutes, 0);
      return totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
    };
    
    // Use subcategories with their percentages to create segments
    // If we have too many subcategories, combine the smallest ones into "Other"
    const MAX_SEGMENTS = 3;
    let segments = [];
    
    if (category.subcategories.length <= MAX_SEGMENTS) {
      // Use all subcategories
      segments = category.subcategories.map((sub, idx) => ({
        name: sub.name,
        value: calculatePercentage(sub),
        color: idx === 0 ? colors.primary : (idx === 1 ? colors.secondary : colors.tertiary)
      }));
    } else {
      // Use top subcategories and combine rest into "Other"
      const topSubcategories = category.subcategories.slice(0, MAX_SEGMENTS - 1);
      const otherSubcategories = category.subcategories.slice(MAX_SEGMENTS - 1);
      
      segments = topSubcategories.map((sub, idx) => ({
        name: sub.name,
        value: calculatePercentage(sub),
        color: idx === 0 ? colors.primary : colors.secondary
      }));
      
      // Add "Other" category
      const otherPercentage = otherSubcategories.reduce((acc: number, curr: any) => acc + calculatePercentage(curr), 0);
      segments.push({
        name: 'Other',
        value: otherPercentage,
        color: colors.tertiary
      });
    }
    
    return segments;
  };
  
  // Render a category card
  const renderCategoryCard = (category?: any) => {
    if (!category) return null;
    
    // Get color scheme from category color
    const categoryColor = category.color.startsWith('#') ? category.color : '#16A34A';
    const { primary, secondary, tertiary } = generateBalancedColorScheme(categoryColor);
    
    // Generate segments for the donut chart from subcategories
    const segments = createSegmentsFromSubcategories(category);
    
    // Show top 2 subcategories with their percentages
    const topSubcategories = category.subcategories.slice(0, 2);
    
    // Reuse the same percentage calculation function
    const calculatePercentage = (subcategory: any) => {
      const minutes = subcategory.goalMinutes || 0;
      const totalMinutes = category.subcategories.reduce((acc: number, curr: any) => acc + (curr.goalMinutes || 0), 0);
      return totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
    };
    
    // Calculate display values
    const actualHours = category.actualHours || 0;
    const goalHours = category.goalHours || 0;
    const progressPercent = category.progress || 0;
    
    return (
      <Card className="shadow-sm overflow-hidden">
        {/* Category header - use primary color as background */}
        <div className="p-3 font-bold text-white uppercase text-lg" style={{ backgroundColor: primary }}>
          {category.name}
        </div>
        
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row">
            {/* Left column - current reality and goal */}
            <div className="flex-1">
              <div className="mb-5">
                <h4 className="font-semibold mb-1">Current Reality</h4>
                <div className="text-xl font-medium">Actual: {actualHours}h</div>
                <div className="text-sm text-gray-600">
                  Time spent on {category.name.toLowerCase()}-related activities
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Goal</h4>
                <div className="text-xl font-medium">Goal: {goalHours}h</div>
                {topSubcategories.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {topSubcategories[0]?.name}{topSubcategories.length > 1 ? ` and ${topSubcategories[1]?.name}` : ''}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right column - donut chart visualization */}
            <div className="flex-1 flex justify-center pt-4 md:pt-0">
              {renderDonutChart(
                progressPercent,
                segments,
                200,
                `${progressPercent}%`
              )}
            </div>
          </div>
          
          {/* Legend row */}
          {segments.length > 0 && (
            <div className="flex justify-center gap-4 mt-4">
              {segments.map((segment, idx) => (
                <div key={idx} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1" 
                    style={{ backgroundColor: segment.color }}
                  ></div>
                  <span className="text-sm">{segment.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // Provide actual "Current Reality" data instead of hardcoded values
  const getCurrentRealityData = (category?: CategoryWithSubcategories & { actualHours: number, progress: number }) => {
    if (!category) return [];
    
    return [
      { name: 'Time Spent', value: formatHours(category.actualHours) },
      { name: 'Progress', value: `${Math.round(category.progress || 0)}%` },
    ];
  };
  
  // Create a function to handle the special Work category with Current Reality and Goal
  const renderWorkCard = () => {
    if (!workCategory) return null;
    
    // Get color scheme from category color
    const categoryColor = workCategory.color.startsWith('#') ? workCategory.color : '#DC2626';
    const { primary, secondary, tertiary } = generateBalancedColorScheme(categoryColor);
    
    // Calculate actual hours vs goal hours for chart
    const currentHours = workCategory.actualHours || 0;
    const goalHours = workCategory.goalHours || 0;
    const totalHours = Math.max(currentHours, goalHours);
    const progressPercent = workCategory.progress || 0;
    
    // Calculate percentages for the chart - scaled to 100
    const currentPercentage = totalHours > 0 ? Math.round((currentHours / totalHours) * 100) : 0;
    const goalPercentage = totalHours > 0 ? Math.round((goalHours / totalHours) * 100) : 0;
    
    // Create segments for chart with distinct colors
    const segments = [
      { name: 'Current', value: currentPercentage, color: primary },
      { name: 'Goal', value: goalPercentage, color: secondary },
    ];
    
    return (
      <Card className="shadow-sm overflow-hidden">
        {/* Category header - use primary color as background */}
        <div className="p-3 font-bold text-white uppercase text-lg" style={{ backgroundColor: primary }}>
          WORK
        </div>
        
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row">
            {/* Left column - current reality and goal */}
            <div className="flex-1">
              <div className="mb-5">
                <h4 className="font-semibold mb-1">Current Reality</h4>
                <div className="text-xl font-medium">Actual: {currentHours}h</div>
                <div className="text-sm text-gray-600">
                  Time spent on work-related activities
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Goal</h4>
                <div className="text-xl font-medium">Goal: {goalHours}h</div>
                <div className="text-sm text-gray-600">
                  Regular work and professional tasks
                </div>
              </div>
            </div>
            
            {/* Right column - donut chart visualization */}
            <div className="flex-1 flex justify-center pt-4 md:pt-0">
              {renderDonutChart(
                progressPercent,
                segments,
                200, 
                `${progressPercent}%`
              )}
            </div>
          </div>
          
          {/* Legend row */}
          <div className="flex justify-center gap-4 mt-4">
            {segments.map((segment, idx) => (
              <div key={idx} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-1" 
                  style={{ backgroundColor: segment.color }}
                ></div>
                <span className="text-sm">{segment.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Dashboard header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="bg-white rounded-full shadow-sm border border-gray-200 p-1">
          <Tabs defaultValue="today" value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList className="bg-transparent">
              <TabsTrigger 
                value="today" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 rounded-full"
              >
                Today
              </TabsTrigger>
              <TabsTrigger 
                value="week" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 rounded-full"
              >
                This Week
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Top metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
        {/* Daily Score & Motivation */}
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-stretch">
            <div className="flex-1 flex">
              <div className="mr-3">
                <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg">
                  <ArrowDown className="text-white w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">Daily Score</div>
                <div className="text-3xl font-bold">{formatPercent(dailyScore)}</div>
                <div className="text-gray-500 text-sm">performance rating</div>
              </div>
            </div>
            
            <div className="border-l border-gray-200 h-auto mx-4"></div>
            
            <div className="flex-1 flex">
              <div className="mr-3">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg">
                  <ArrowDown className="text-white w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">Motivation Level</div>
                <div className="text-3xl font-bold">{formatPercent(motivationLevel)}</div>
                <div className="text-transparent text-sm">.</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sleep Duration */}
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-stretch">
            <div className="flex-1 flex">
              <div className="mr-3">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg">
                  <Moon className="text-white w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">Sleep Duration</div>
                <div className="text-3xl font-bold">{sleepDuration}h</div>
                <div className="text-gray-500 text-sm">sleep per day</div>
              </div>
            </div>
            
            <div className="border-l border-gray-200 h-auto mx-4"></div>
            
            <div className="flex-1 flex items-center justify-center">
              <Button 
                variant="outline" 
                className="rounded-full px-6 py-2.5 border-gray-300 shadow-sm hover:bg-blue-50"
                size="lg"
                onClick={handleAddEntryClick}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {renderCategoryCard(faithCategory)}
        {renderCategoryCard(lifeCategory)}
        {renderWorkCard()}
        {renderCategoryCard(healthCategory)}
        {funCategory && renderCategoryCard(funCategory)}
      </div>
      
      {/* Daily Entry Form Dialog */}
      <DailyEntryForm
        open={dailyEntryOpen}
        onOpenChange={handleEntryFormChange}
        selectedDate={date}
        categories={categoriesData || categories}
      />
      
      {/* Category Detail Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && handleCloseCategoryDetails()}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
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