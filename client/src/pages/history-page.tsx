import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Loader2 } from "lucide-react";
import DailyEntryForm from "@/components/daily-entry-form";

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);

  // Fetch categories for the current user
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    }
  });

  // Fetch last 7 days of daily scores
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["/api/history"],
    queryFn: async () => {
      // Create an array of promises for each day
      const promises = last7Days.map(async (date) => {
        const res = await fetch(`/api/dashboard?date=${date.toISOString()}`);
        if (!res.ok) throw new Error("Failed to fetch history data");
        const data = await res.json();
        return {
          date: format(date, "MMM dd"),
          rawDate: date,
          dailyScore: data.dailyScore || 0,
          motivationLevel: data.motivationLevel || 0,
          healthBalance: data.healthBalance || 0
        };
      });
      
      return Promise.all(promises);
    }
  });

  const { data: selectedDayEntry } = useQuery({
    queryKey: ["/api/entries", selectedDate.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/entries?date=${selectedDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch daily entry");
      return res.json();
    }
  });

  // Handle date selection
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsEntryFormOpen(true);
    }
  };

  // Loading state
  if (loadingCategories || loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">History & Reports</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-2">{format(selectedDate, "MMMM d, yyyy")}</p>
              {selectedDayEntry ? (
                <ul className="space-y-3">
                  <li className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Daily Score</span>
                    <span className="font-medium">{selectedDayEntry.dailyScore}%</span>
                  </li>
                  <li className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Motivation</span>
                    <span className="font-medium">{selectedDayEntry.motivationLevel}%</span>
                  </li>
                  <li className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Health Balance</span>
                    <span className="font-medium">{selectedDayEntry.healthBalance}%</span>
                  </li>
                  <li className="flex justify-between items-center pb-2">
                    <span className="text-muted-foreground">Sleep</span>
                    <span className="font-medium">{selectedDayEntry.sleepHours} hours</span>
                  </li>
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No data for this date</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Reports Column */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dailyScore" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="dailyScore">Daily Score</TabsTrigger>
                  <TabsTrigger value="motivation">Motivation</TabsTrigger>
                  <TabsTrigger value="health">Health</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dailyScore">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Daily Score']}
                        labelFormatter={(label) => `Date: ${label}`} 
                      />
                      <Line
                        type="monotone"
                        dataKey="dailyScore"
                        stroke="#8884d8"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="motivation">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Motivation']}
                        labelFormatter={(label) => `Date: ${label}`} 
                      />
                      <Line
                        type="monotone"
                        dataKey="motivationLevel"
                        stroke="#ff6b6b"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="health">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Health Balance']}
                        labelFormatter={(label) => `Date: ${label}`} 
                      />
                      <Line
                        type="monotone"
                        dataKey="healthBalance"
                        stroke="#4bc0c0"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Category Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categories?.map(cat => ({
                    name: cat.name,
                    progress: cat.progress || 0,
                    color: cat.color
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Progress']}
                      labelFormatter={(label) => `Category: ${label}`} 
                    />
                    <Bar 
                      dataKey="progress" 
                      fill="#8884d8" 
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Daily Entry Form */}
      {categories && (
        <DailyEntryForm
          open={isEntryFormOpen}
          onOpenChange={setIsEntryFormOpen}
          selectedDate={selectedDate}
          categories={categories}
          currentEntry={selectedDayEntry}
        />
      )}
    </div>
  );
}