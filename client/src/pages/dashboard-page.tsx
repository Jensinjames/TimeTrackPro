import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { 
  ArrowDown,
  Moon, 
  Heart, 
  Home,
  Briefcase,
  ChevronRight,
  Timer
} from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
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
  
  // Get category data
  const faithCategory = categories.find(cat => cat.name === 'Faith');
  const lifeCategory = categories.find(cat => cat.name === 'Life');
  const workCategory = categories.find(cat => cat.name === 'Work');
  const healthCategory = categories.find(cat => cat.name === 'Health');
  
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
          innerRadius={0.6}
          padAngle={1}
          cornerRadius={4}
          activeOuterRadiusOffset={8}
          colors={{ datum: 'data.color' }}
          borderWidth={0}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          isInteractive={false}
          defs={[
            {
              id: 'dots',
              type: 'patternDots',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              size: 4,
              padding: 1,
              stagger: true
            }
          ]}
        />
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-3xl font-bold">{centerLabel}</div>
          </div>
        )}
      </div>
    );
  };
  
  // Create icon component for metrics
  const renderIcon = (name: string, color: string) => {
    const icons = {
      'Daily Score': <ArrowDown className="text-white w-5 h-5" />,
      'Motivation Level': <ArrowDown className="text-white w-5 h-5" />,
      'Sleep Duration': <Moon className="text-white w-5 h-5" />,
      'Faith': <ArrowDown className="text-white w-5 h-5" />,
      'Life': <Home className="text-white w-5 h-5" />,
      'Work': <Briefcase className="text-white w-5 h-5" />,
      'Health': <Heart className="text-white w-5 h-5" />
    } as Record<string, React.ReactNode>;
    
    return (
      <div className="flex items-center justify-center w-12 h-12 rounded-lg" style={{ backgroundColor: color }}>
        {icons[name] || <ArrowDown className="text-white w-5 h-5" />}
      </div>
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
                <div className="text-gray-500 text-sm">performaancerating</div>
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
            
            <div className="flex-1 flex">
              <div className="text-center w-full">
                <Button 
                  variant="outline" 
                  className="rounded-full px-4 border-gray-300 shadow-sm"
                  onClick={handleAddEntryClick}
                >
                  <Timer className="mr-2 h-4 w-4" />
                  This Time
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Faith */}
        {faithCategory && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg mr-3">
                  <ArrowDown className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">Faith</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {faithCategory.subcategories.slice(0, 2).map((subcat, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="flex justify-between">
                        <span>{subcat.name}</span>
                        <span className="font-medium">
                          {idx === 0 ? '50%' : '25%'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex-1 flex justify-center">
                  {renderDonutChart(
                    50,
                    [
                      { name: 'Daily Prayer', value: 50, color: '#2E7D32' },
                      { name: 'Meditation', value: 25, color: '#4CAF50' },
                      { name: 'Other', value: 25, color: '#81C784' },
                    ],
                    170,
                    '50%'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Life */}
        {lifeCategory && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-amber-500 rounded-lg mr-3">
                  <Home className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">Life</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Time with Family</span>
                      <span className="font-medium">20%</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Volunteering</span>
                      <span className="font-medium">20%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex justify-center">
                  {renderDonutChart(
                    60,
                    [
                      { name: 'Family', value: 40, color: '#D97706' },
                      { name: 'Volunteering', value: 20, color: '#F59E0B' },
                      { name: 'Other', value: 40, color: '#FBBF24' },
                    ],
                    170,
                    '60%'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Work */}
        {workCategory && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-lg mr-3">
                  <Briefcase className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">Work</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Current Reality</span>
                      <span className="font-medium">18h</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Goal</span>
                      <span className="font-medium">40h</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex justify-center">
                  {renderDonutChart(
                    20,
                    [
                      { name: 'Current', value: 60, color: '#B91C1C' },
                      { name: 'Goal', value: 40, color: '#EF4444' },
                    ],
                    170,
                    '20%'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Health */}
        {healthCategory && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-500 rounded-lg mr-3">
                  <Heart className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">Health</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Exercise</span>
                      <span className="font-medium">25%</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between">
                      <span>Sleep</span>
                      <span className="font-medium">35%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex justify-center">
                  {renderDonutChart(
                    35,
                    [
                      { name: 'Exercise', value: 23, color: '#DB2777' },
                      { name: 'Sleep', value: 50, color: '#EC4899' },
                      { name: 'Other', value: 27, color: '#F472B6' },
                    ],
                    170,
                    '35%'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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