import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDateRange } from '@/hooks/use-date-range';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Type for our pie chart data
type PieData = {
  name: string;
  value: number;
  color: string;
  subcategories?: { name: string; value: number; color: string }[];
};

export default function TimePies() {
  const { dateRange } = useDateRange();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch time allocation data for the chosen date range
  const { data: timeAllocationData, isLoading } = useQuery({
    queryKey: [
      '/api/dashboard', 
      user?.id, 
      dateRange?.from?.toISOString() || null,
      dateRange?.to?.toISOString() || new Date().toISOString().split('T')[0],
      'time-allocation'
    ],
    queryFn: async () => {
      // Build URL with date range if available
      let url = '/api/dashboard';
      const params = new URLSearchParams();
      
      if (dateRange && dateRange.from && dateRange.to) {
        params.set('from', dateRange.from.toISOString());
        params.set('to', dateRange.to.toISOString());
      } else {
        params.set('date', new Date().toISOString());
      }
      
      params.set('view', 'time-allocation');
      url = `${url}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch time allocation data');
      return res.json();
    },
    enabled: !!user,
  });
  
  // Handle clicking on a pie slice
  const handlePieClick = (data: any, index: number) => {
    // Toggle selection
    if (selectedCategory === data.name) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(data.name);
    }
  };
  
  // If there's no data yet, show placeholder
  if (isLoading || !timeAllocationData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reality (Actual Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-24 w-24"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                    <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Goals (Target Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-24 w-24"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                    <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Extract data for reality and goals pie charts
  const realityData = timeAllocationData.reality || [];
  const goalsData = timeAllocationData.goals || [];
  
  // Find selected category data for subcategory pie charts
  const selectedCategoryReality = realityData.find(
    (category: PieData) => category.name === selectedCategory
  );
  
  const selectedCategoryGoals = goalsData.find(
    (category: PieData) => category.name === selectedCategory
  );
  
  // If unaccounted time exists, include it in reality
  const unaccountedMinutes = timeAllocationData.unaccountedMinutes || 0;
  if (unaccountedMinutes > 0) {
    realityData.push({
      name: 'Unaccounted',
      value: unaccountedMinutes,
      color: '#000000' // Black for unaccounted time
    });
  }
  
  // Color generation utils (fallback if colors aren't provided from backend)
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A44A3F', '#2C7873', '#705E78', '#A63D40'];
  
  const getColor = (index: number, defaultColor?: string) => {
    if (defaultColor) return defaultColor;
    return COLORS[index % COLORS.length];
  };
  
  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return [`${hours}h ${minutes}m`, name];
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reality Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reality (Actual Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={realityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                >
                  {realityData.map((entry: PieData, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || getColor(index)}
                      stroke={entry.name === selectedCategory ? '#fff' : 'none'}
                      strokeWidth={entry.name === selectedCategory ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Tooltip formatter={formatTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Goals Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Goals (Target Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={goalsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                >
                  {goalsData.map((entry: PieData, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || getColor(index)}
                      stroke={entry.name === selectedCategory ? '#fff' : 'none'}
                      strokeWidth={entry.name === selectedCategory ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                <Tooltip formatter={formatTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* If a category is selected, show subcategory breakdowns */}
      {selectedCategory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* Selected Category Reality Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{selectedCategory} - Reality</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {selectedCategoryReality?.subcategories ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedCategoryReality.subcategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {selectedCategoryReality.subcategories.map((entry: any, index: number) => (
                        <Cell 
                          key={`subcell-${index}`} 
                          fill={entry.color || getColor(index)} 
                        />
                      ))}
                    </Pie>
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                    <Tooltip formatter={formatTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No subcategories available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Selected Category Goals Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{selectedCategory} - Goals</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {selectedCategoryGoals?.subcategories ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedCategoryGoals.subcategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {selectedCategoryGoals.subcategories.map((entry: any, index: number) => (
                        <Cell 
                          key={`subcell-${index}`} 
                          fill={entry.color || getColor(index)} 
                        />
                      ))}
                    </Pie>
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                    <Tooltip formatter={formatTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No subcategories available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}