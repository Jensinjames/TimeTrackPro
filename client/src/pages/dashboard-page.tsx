import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDateRange } from "@/hooks/use-date-range";
import { formatHours, formatPercent } from "@/lib/utils";
import { CategoryWithSubcategories, DashboardData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Check,
  ExternalLink
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
  
  const dateRangeStr = dateRange?.from && dateRange?.to
    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
  
  // Get category data
  const faithCategory = categories.find(cat => cat.name === 'Faith');
  const lifeCategory = categories.find(cat => cat.name === 'Life');
  const workCategory = categories.find(cat => cat.name === 'Work');
  const healthCategory = categories.find(cat => cat.name === 'Health');
  
  // Create helper function to get subcategory data
  const getSubcategoryData = (category?: CategoryWithSubcategories & { actualHours: number, progress: number }) => {
    if (!category) return [];
    return category.subcategories.map(sub => ({
      name: sub.name,
      goalMinutes: sub.goalMinutes,
      goalType: sub.goalType,
    }));
  };
  
  // Render pie chart with progress
  const renderProgressChart = (progress: number, color: string) => {
    const pieData = [
      {
        id: "used",
        value: progress, 
        color: color,
      },
      {
        id: "remaining",
        value: Math.max(100 - progress, 0), 
        color: "#E5E7EB",
      },
    ];
    
    return (
      <div className="relative w-20 h-20">
        <ResponsivePie
          data={pieData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          innerRadius={0.7}
          padAngle={0.5}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          colors={{ datum: 'data.color' }}
          borderWidth={1}
          borderColor={{ theme: 'background' }}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          isInteractive={false}
        />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {formatPercent(progress)}
        </div>
      </div>
    );
  };
  
  // Render category card
  const renderCategoryCard = (
    name: string, 
    color: string, 
    icon: React.ReactNode, 
    goalHours: number, 
    actualHours: number, 
    progress: number,
    subcategories: any[]
  ) => {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-0 bg-white">
          <div className="flex items-center px-4 py-2" style={{ backgroundColor: color }}>
            <span className="text-white font-medium">{name}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Goal</p>
                <p className="text-xl font-medium">{goalHours}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Actual</p>
                <p className="text-xl font-medium">{formatHours(actualHours).replace('hrs', 'h')}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Progress</p>
              <div className="flex items-center">
                <div className="h-2 flex-grow bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ backgroundColor: color, width: `${progress}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm">{formatPercent(progress)}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="flex p-4">
              <div className="w-1/2 border-r border-gray-200 pr-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Current Reality</h4>
                <div className="space-y-2">
                  {subcategories.slice(0, 3).map((subcat, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{subcat.name}</span>
                      {subcat.goalType === 'time' ? (
                        <span className="font-medium">{Math.round(subcat.goalMinutes / 60)} hrs/day</span>
                      ) : (
                        <span className="font-medium">{subcat.completed ? 'Done' : 'Not done'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-1/2 pl-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Goals</h4>
                <div className="space-y-2">
                  {subcategories.slice(0, 3).map((subcat, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{subcat.name}</span>
                      {subcat.goalType === 'time' ? (
                        <span className="font-medium">{Math.round(subcat.goalMinutes / 60)} hrs/day</span>
                      ) : (
                        <span className="font-medium">Daily</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 p-2 flex justify-center">
            <Button 
              variant="ghost" 
              className="text-blue-600 text-sm" 
              onClick={() => faithCategory && handleViewCategoryDetails(faithCategory)}
            >
              View Details <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Category detail sections
  const renderCategoryDetailSections = (
    category: CategoryWithSubcategories & { actualHours: number, progress: number },
    sectionTitle: string,
    sectionData: { name: string, minutes?: number, completed?: boolean, value?: string }[]
  ) => {
    return (
      <div className="mb-5">
        <h4 className="text-base font-medium mb-3">{sectionTitle}</h4>
        <div className="space-y-2.5">
          {sectionData.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div className="text-gray-600">{item.name}</div>
              <div className="font-medium">
                {item.value || (typeof item.minutes === 'number' ? `${Math.round(item.minutes / 60)} mins` : '')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // New dashboard layout based on the screenshot
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Dashboard header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{dateRangeStr}</span>
          <Button onClick={handleAddEntryClick} size="sm" variant="primary">
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>
      
      {/* Category grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {/* Faith */}
        {faithCategory && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4 bg-white">
                <div className="flex items-center justify-center bg-[#16A34A] w-6 h-6 rounded-sm text-white mr-2">
                  <Check className="h-4 w-4" />
                </div>
                <span className="font-medium">Faith</span>
              </div>
              
              <div className="grid grid-cols-3 p-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Goal</div>
                  <div className="font-medium">{faithCategory.goalHours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual</div>
                  <div className="font-medium">{formatHours(faithCategory.actualHours).replace('hrs', 'h')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="font-medium">{formatPercent(faithCategory.progress)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <div className="text-xs text-gray-500">Current spiritual practices and mindfulness activities</div>
              </div>
              
              <div className="bg-white p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Daily Prayer</span>
                    <span className="font-medium">15 mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Daily Prayer</span>
                    <span className="font-medium">30 mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Meditation</span>
                    <span className="font-medium">10 mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Meditation</span>
                    <span className="font-medium">20 mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Scripture Study</span>
                    <span className="font-medium">20 mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Scripture Study</span>
                    <span className="font-medium">30 mins</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[140px] flex justify-center items-center border-t border-gray-100">
                {renderProgressChart(faithCategory.progress, '#16A34A')}
              </div>
              
              <div className="border-t border-gray-100 p-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#16A34A] text-sm w-full" 
                  onClick={() => handleViewCategoryDetails(faithCategory)}
                >
                  View Details <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Life */}
        {lifeCategory && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4 bg-white">
                <div className="flex items-center justify-center bg-[#D97706] w-6 h-6 rounded-sm text-white mr-2">
                  <Check className="h-4 w-4" />
                </div>
                <span className="font-medium">Life</span>
              </div>
              
              <div className="grid grid-cols-3 p-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Goal</div>
                  <div className="font-medium">{lifeCategory.goalHours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual</div>
                  <div className="font-medium">{formatHours(lifeCategory.actualHours).replace('hrs', 'h')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="font-medium">{formatPercent(lifeCategory.progress)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <div className="text-xs text-gray-500">Current work-life balance and relationships</div>
              </div>
              
              <div className="bg-white p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Family Time</span>
                    <span className="font-medium">2 hrs/day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Family Time</span>
                    <span className="font-medium">3 hrs/day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Social Activities</span>
                    <span className="font-medium">4 hrs/week</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Social Activities</span>
                    <span className="font-medium">6 hrs/week</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Hobbies</span>
                    <span className="font-medium">3 hrs/week</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Hobbies</span>
                    <span className="font-medium">5 hrs/week</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[140px] flex justify-center items-center border-t border-gray-100">
                {renderProgressChart(lifeCategory.progress, '#D97706')}
              </div>
              
              <div className="border-t border-gray-100 p-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#D97706] text-sm w-full" 
                  onClick={() => handleViewCategoryDetails(lifeCategory)}
                >
                  View Details <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Work */}
        {workCategory && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4 bg-white">
                <div className="flex items-center justify-center bg-[#DC2626] w-6 h-6 rounded-sm text-white mr-2">
                  <Check className="h-4 w-4" />
                </div>
                <span className="font-medium">Work</span>
              </div>
              
              <div className="grid grid-cols-3 p-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Goal</div>
                  <div className="font-medium">{workCategory.goalHours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual</div>
                  <div className="font-medium">{formatHours(workCategory.actualHours).replace('hrs', 'h')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="font-medium">{formatPercent(workCategory.progress)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <div className="text-xs text-gray-500">Current projects and achievements</div>
              </div>
              
              <div className="bg-white p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {workCategory.subcategories.slice(0, 3).map((subcat, idx) => (
                    <React.Fragment key={subcat.id}>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{subcat.name}</span>
                        <span className="font-medium">{Math.round(subcat.goalMinutes / 60)} hrs/week</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{subcat.name}</span>
                        <span className="font-medium">
                          {subcat.goalType === 'time' 
                            ? `${Math.round(subcat.goalMinutes / 60)} hrs/week` 
                            : 'Daily'
                          }
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              <div className="h-[140px] flex justify-center items-center border-t border-gray-100">
                {renderProgressChart(workCategory.progress, '#DC2626')}
              </div>
              
              <div className="border-t border-gray-100 p-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#DC2626] text-sm w-full" 
                  onClick={() => handleViewCategoryDetails(workCategory)}
                >
                  View Details <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Health */}
        {healthCategory && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4 bg-white">
                <div className="flex items-center justify-center bg-[#EC4899] w-6 h-6 rounded-sm text-white mr-2">
                  <Check className="h-4 w-4" />
                </div>
                <span className="font-medium">Health</span>
              </div>
              
              <div className="grid grid-cols-3 p-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Goal</div>
                  <div className="font-medium">{healthCategory.goalHours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual</div>
                  <div className="font-medium">{formatHours(healthCategory.actualHours).replace('hrs', 'h')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="font-medium">{formatPercent(healthCategory.progress)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <div className="text-xs text-gray-500">Current health indicators and wellness activities</div>
              </div>
              
              <div className="bg-white p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {healthCategory.subcategories.slice(0, 3).map((subcat, idx) => (
                    <React.Fragment key={subcat.id}>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{subcat.name}</span>
                        <span className="font-medium">
                          {subcat.goalType === 'time' 
                            ? `${Math.round(subcat.goalMinutes / 60)} hrs/week` 
                            : 'Daily'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{subcat.name}</span>
                        <span className="font-medium">
                          {subcat.goalType === 'time' 
                            ? `${Math.round(subcat.goalMinutes / 60)} hrs/week` 
                            : 'Daily'
                          }
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              <div className="h-[140px] flex justify-center items-center border-t border-gray-100">
                {renderProgressChart(healthCategory.progress, '#EC4899')}
              </div>
              
              <div className="border-t border-gray-100 p-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#EC4899] text-sm w-full" 
                  onClick={() => handleViewCategoryDetails(healthCategory)}
                >
                  View Details <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Date Range Controls */}
      <div className="hidden mb-4 md:mb-6 flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
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
                {dateRangeStr}
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