import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatHours, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SummaryCard from "@/components/summary-card";
import CategoryCard from "@/components/category-card";
import CategoryDetail from "@/components/category-detail";
import DailyEntryForm from "@/components/daily-entry-form";
import { PlusIcon } from "lucide-react";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEntryFormOpen, setIsEntryFormOpen] = useState<boolean>(false);
  
  // Format selected date for input
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard", { date: selectedDate.toISOString() }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey;
      const res = await fetch(`/api/dashboard?date=${params.date}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });
  
  // Fetch daily entry data for the form
  const { data: entryData, isLoading: isEntryLoading } = useQuery({
    queryKey: ["/api/entries", { date: selectedDate.toISOString() }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey;
      const res = await fetch(`/api/entries?date=${params.date}`);
      if (!res.ok) throw new Error("Failed to fetch entry data");
      return res.json();
    },
  });
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  };
  
  // Prepare detail data for category details
  const getCategoryDetailsData = (categoryName: string) => {
    if (!dashboardData || !dashboardData.categories) return { current: [], goals: [] };
    
    const category = dashboardData.categories.find(c => c.name === categoryName);
    if (!category) return { current: [], goals: [] };
    
    if (categoryName === "Faith") {
      return {
        current: [
          { name: "Daily Prayer", value: "15 mins" },
          { name: "Meditation", value: "10 mins" },
          { name: "Scripture Study", value: "20 mins" },
        ],
        goals: [
          { name: "Daily Prayer", value: "30 mins" },
          { name: "Meditation", value: "20 mins" },
          { name: "Scripture Study", value: "30 mins" },
        ],
      };
    } else if (categoryName === "Life") {
      return {
        current: [
          { name: "Family Time", value: "2 hrs/day" },
          { name: "Social Activities", value: "4 hrs/week" },
          { name: "Hobbies", value: "3 hrs/week" },
        ],
        goals: [
          { name: "Family Time", value: "3 hrs/day" },
          { name: "Social Activities", value: "6 hrs/week" },
          { name: "Hobbies", value: "5 hrs/week" },
        ],
      };
    } else if (categoryName === "Work") {
      return {
        current: [
          { name: "Productivity", value: "75%" },
          { name: "Projects Completed", value: "8" },
          { name: "Learning Hours", value: "5 hrs/week" },
        ],
        goals: [
          { name: "Productivity", value: "90%" },
          { name: "Projects Target", value: "12" },
          { name: "Learning Hours", value: "8 hrs/week" },
        ],
      };
    } else if (categoryName === "Health") {
      return {
        current: [
          { name: "Exercise", value: "3 days/week" },
          { name: "Sleep", value: "6.5 hrs/day" },
          { name: "Stress Level", value: "Moderate" },
        ],
        goals: [
          { name: "Exercise", value: "5 days/week" },
          { name: "Sleep", value: "8 hrs/day" },
          { name: "Stress Level", value: "Low" },
        ],
      };
    }
    
    return { current: [], goals: [] };
  };
  
  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <div className="relative">
            <input 
              type="date" 
              className="bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formattedDate}
              onChange={handleDateChange}
            />
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsEntryFormOpen(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Daily Score"
          value={formatPercent(dashboardData?.dailyScore || 0)}
          subtitle="Overall daily performance score"
          icon="fas fa-chart-line"
          color="bg-blue-500"
        />
        
        <SummaryCard
          title="Motivation Level"
          value={formatPercent(dashboardData?.motivationLevel || 0)}
          subtitle="Average motivation level"
          icon="fas fa-fire"
          color="bg-purple-500"
        />
        
        <SummaryCard
          title="Sleep Duration"
          value={formatHours(dashboardData?.sleepDuration || 0)}
          subtitle="Average sleep hours"
          icon="fas fa-moon"
          color="bg-blue-600"
        />
        
        <SummaryCard
          title="Health Balance"
          value={formatPercent(dashboardData?.healthBalance || 0)}
          subtitle="Overall health score"
          icon="fas fa-heartbeat"
          color="bg-green-500"
        />
      </div>
      
      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {dashboardData?.categories.map((category) => (
          <CategoryCard
            key={category.id}
            name={category.name}
            icon={category.icon}
            goalHours={category.goalHours}
            actualHours={category.actualHours}
            progress={category.progress}
          />
        ))}
      </div>
      
      {/* Detailed Category View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {dashboardData?.categories.map((category) => {
          const { current, goals } = getCategoryDetailsData(category.name);
          return (
            <CategoryDetail
              key={category.id}
              category={category}
              currentReality={current}
              goals={goals}
            />
          );
        })}
      </div>
      
      {/* Daily Entry Form */}
      <DailyEntryForm
        open={isEntryFormOpen}
        onOpenChange={setIsEntryFormOpen}
        selectedDate={selectedDate}
        categories={dashboardData?.categories || []}
        currentEntry={entryData}
      />
    </div>
  );
}
