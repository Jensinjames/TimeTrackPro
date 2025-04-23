import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Clock, BarChart, Calendar } from 'lucide-react';
import { formatHours, formatPercent, getCategoryIcon, categoryColors } from '@/lib/utils';
import { CategoryWithSubcategories } from '@shared/schema';
import { ResponsivePie } from '@nivo/pie';

interface CategoryDetailViewProps {
  category: CategoryWithSubcategories & {
    actualHours: number;
    progress: number;
  };
  onBack: () => void;
}

export default function CategoryDetailView({ category, onBack }: CategoryDetailViewProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Get user's local timezone offset for display purposes
  const localTimezoneOffset = new Date().getTimezoneOffset() / 60 * -1;
  const timezoneDisplay = localTimezoneOffset >= 0 
    ? `UTC+${localTimezoneOffset}` 
    : `UTC${localTimezoneOffset}`;
  
  // Calculate sleep-adjusted data (using the standard 8 hours of sleep)
  const sleepHours = 8;
  const maxAvailableHours = 24 - sleepHours;
  const availableDailyHoursLeft = Math.max(0, maxAvailableHours - category.actualHours);
  
  // Animate progress on component mount
  useEffect(() => {
    const duration = 1000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    
    const timer = setInterval(() => {
      frame++;
      const progressPercent = frame / totalFrames;
      setAnimatedProgress(Math.min(Math.round(progressPercent * category.progress), category.progress));
      
      if (frame === totalFrames) {
        clearInterval(timer);
        setAnimatedProgress(category.progress);
      }
    }, frameDuration);
    
    return () => clearInterval(timer);
  }, [category.progress]);
  
  // Extract appropriate color
  const colorStyle = categoryColors[category.color] || categoryColors.blue;
  
  // Calculate proper monthly goal display
  const monthlyGoal = category.goalPeriod === 'monthly' && category.monthlyGoalHours 
    ? category.monthlyGoalHours 
    : category.goalHours * 30;
  
  // Calculate daily goal based on goal period
  const dailyGoal = category.goalPeriod === 'monthly' && category.monthlyGoalHours
    ? (category.monthlyGoalHours / getDaysInCurrentMonth())
    : category.goalHours;
  
  // Generate data for subcategory pie chart
  const subcategoryPieData = generateSubcategoryPieData();
  
  // Helper function to get days in current month for accurate monthly goal calculations
  function getDaysInCurrentMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  
  // Generate pie chart data from subcategories
  function generateSubcategoryPieData() {
    if (!category.subcategories || category.subcategories.length === 0) {
      return [{ id: 'no-data', label: 'No Data', value: 1, color: '#E5E7EB' }];
    }
    
    // Filter to only time-based subcategories
    const timeSubcategories = category.subcategories.filter(sub => 
      sub.goalType === 'time' && sub.goalMinutes > 0
    );
    
    if (timeSubcategories.length === 0) {
      return [{ id: 'no-time-data', label: 'No Time Data', value: 1, color: '#E5E7EB' }];
    }
    
    // Generate colors
    const baseColor = category.color.startsWith('#') ? category.color : '#1E293B';
    
    // Create pie slices for each subcategory
    return timeSubcategories.map((sub, index) => {
      // Create slightly different shades for each subcategory
      const hue = index * 30 % 60;
      const shade = Math.min(100 - (index * 8), 90);
      
      return {
        id: sub.id.toString(),
        label: sub.name,
        value: sub.goalMinutes / 60, // Convert to hours for better visualization
        minutes: sub.goalMinutes,
        color: shadeColor(baseColor, index * 0.1)
      };
    });
  }
  
  // Function to shade colors programmatically
  function shadeColor(color: string, percent: number) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 
      + (Math.round((t - G) * p) + G) * 0x100 
      + (Math.round((t - B) * p) + B)).toString(16).slice(1);
  }

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <CardHeader 
        className="p-4 flex flex-row items-center bg-gray-50 border-b"
        style={{ borderBottomColor: category.color }}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2" 
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        
        <div className="flex flex-col">
          <div className="flex items-center">
            <div 
              className={`h-6 w-6 rounded-full flex items-center justify-center mr-2`}
              style={{ backgroundColor: category.color }}  
            >
              <i className={`${getCategoryIcon(category.icon)} text-white text-xs`}></i>
            </div>
            <h3 className="text-lg font-medium">{category.name} Details</h3>
          </div>
          <div className="text-xs text-gray-500 ml-8 flex gap-2">
            <span className="font-mono">ID: {category.id}</span>
            <span>|</span>
            <span>Period: {category.goalPeriod || 'daily'}</span>
            <span>|</span>
            <span>Goal: {category.goalPeriod === 'monthly' && category.monthlyGoalHours 
              ? `${category.monthlyGoalHours}h/month` 
              : `${category.goalHours}h/day`}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex justify-center px-6 pt-4 pb-0 bg-white">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart className="w-4 h-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="time-allocation" className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Time Allocation
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Goal Tracking
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="px-6 pt-4 pb-6 space-y-6">
            {/* Progress Card */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-baseline mb-2">
                <h4 className="text-sm font-medium text-gray-700">Current Progress</h4>
                <span className="text-xs text-gray-500">
                  {formatHours(category.actualHours)} / {formatHours(dailyGoal)}
                </span>
              </div>
              <Progress value={animatedProgress} className="h-2 mb-1" />
              <div className="text-xs text-gray-500 flex justify-between items-center">
                <span>{formatPercent(animatedProgress)}</span>
                <span>
                  {animatedProgress >= 100 
                    ? 'Goal completed! 🎉' 
                    : `${formatHours(Math.max(0, dailyGoal - category.actualHours))} remaining`}
                </span>
              </div>
            </div>
            
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Time Balance</h4>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily Goal</span>
                    <span className="font-medium">{formatHours(dailyGoal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly Goal</span>
                    <span className="font-medium">{formatHours(monthlyGoal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Goal Period</span>
                    <span className="font-medium capitalize">{category.goalPeriod || 'Daily'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Time Constraints</h4>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Available Daily</span>
                    <span className="font-medium">{formatHours(availableDailyHoursLeft)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Timezone</span>
                    <span className="font-medium">{timezoneDisplay}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sleep Adjustment</span>
                    <span className="font-medium">{sleepHours} hours</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Subcategory List */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Subcategories</h4>
              {category.subcategories && category.subcategories.length > 0 ? (
                <ul className="space-y-2">
                  {category.subcategories.map(subcategory => (
                    <li 
                      key={subcategory.id} 
                      className="bg-white border border-gray-200 rounded-md p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-sm">{subcategory.name}</span>
                          <span className="text-xs text-gray-500 font-mono ml-2">(ID: {subcategory.id})</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {subcategory.goalType === 'time' 
                            ? `${formatHours(subcategory.goalMinutes / 60)} goal`
                            : subcategory.goalType === 'habit' 
                              ? 'Habit-based' 
                              : 'Yes/No goal'}
                        </div>
                      </div>
                      <div>
                        {subcategory.goalType === 'time' && (
                          <div 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ 
                              backgroundColor: `${category.color}20`, 
                              color: category.color 
                            }}
                          >
                            {formatHours(subcategory.goalMinutes / 60)}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No subcategories found for this category.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="time-allocation" className="px-6 pt-4 pb-6 space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Subcategory Time Allocation</h4>
                
                <div className="flex justify-center items-center mx-auto mb-4">
                  <div style={{ height: 240, width: 240 }}>
                    <ResponsivePie
                      data={subcategoryPieData}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      colors={{ datum: 'data.color' }}
                      borderWidth={1}
                      borderColor={{ theme: 'background' }}
                      enableArcLabels={true}
                      arcLabel={(d) => `${d.data.label}`}
                      arcLabelsTextColor="#ffffff"
                      arcLabelsSkipAngle={10}
                      arcLabelsRadiusOffset={0.6}
                      enableArcLinkLabels={false}
                      theme={{
                        labels: {
                          text: {
                            fontSize: 12,
                            fontWeight: 'bold',
                          }
                        },
                        tooltip: {
                          container: {
                            background: 'white',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                            padding: '5px 9px'
                          }
                        }
                      }}
                      tooltip={({ datum }) => (
                        <div className="bg-white p-2 shadow-md rounded-md text-sm">
                          <div className="font-medium">{datum.data.label}</div>
                          <div className="text-gray-500">{formatHours(datum.value)}</div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {subcategoryPieData.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between bg-white p-2 rounded-md border border-gray-100"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.label}</span>
                        <span className="text-xs text-gray-500 font-mono ml-2">(ID: {item.id})</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatHours(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Time Analysis</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Category Allocation</span>
                    <span className="font-medium">{formatHours(dailyGoal)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Usage</span>
                    <span className="font-medium">{formatHours(category.actualHours)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Available Hours (adjusted)</span>
                    <span className="font-medium">{formatHours(availableDailyHoursLeft)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Efficiency Score</span>
                    <span className="font-medium">
                      {formatPercent(Math.min(100, (category.actualHours / dailyGoal) * 100))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="goals" className="px-6 pt-4 pb-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Goal Configuration</h4>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm mb-1 font-medium">Daily Goal Setting</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily Target</span>
                    <span className="font-medium">{formatHours(dailyGoal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">% of Awake Time</span>
                    <span className="font-medium">
                      {Math.round((dailyGoal / maxAvailableHours) * 100)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm mb-1 font-medium">Monthly Projection</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly Target</span>
                    <span className="font-medium">{formatHours(monthlyGoal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Pace</span>
                    <span className="font-medium">
                      {formatHours(category.actualHours * 30)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm mb-1 font-medium">Goal Period</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tracking Mode</span>
                    <span className="font-medium capitalize">{category.goalPeriod || 'Daily'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Days in Current Month</span>
                    <span className="font-medium">{getDaysInCurrentMonth()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Goal Progress</h4>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="text-sm">Daily Progress</div>
                    <span className="text-xs text-gray-500">
                      {formatHours(category.actualHours)} / {formatHours(dailyGoal)}
                    </span>
                  </div>
                  <Progress value={animatedProgress} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="text-sm">Monthly Progress</div>
                    <span className="text-xs text-gray-500">
                      {formatHours(category.actualHours * getDaysInCurrentMonth())} / {formatHours(monthlyGoal)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((category.actualHours * getDaysInCurrentMonth()) / monthlyGoal) * 100)} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}