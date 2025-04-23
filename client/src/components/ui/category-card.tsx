import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { ChevronRight } from "lucide-react";
import React from "react";

export interface CategoryCardProps {
  title: 'Faith' | 'Life' | 'Work' | 'Health';
  color: string;
  current: { label: string; value: string }[];
  goals: { label: string; value: string }[];
  progress?: number; // 0-100
  className?: string;
  onViewDetails?: () => void;
}

const CATEGORY_COLORS = {
  Faith: "#119447",
  Life: "#C48A00",
  Work: "#D63031",
  Health: "#EC407A",
};

export function CategoryCard({
  title,
  color = CATEGORY_COLORS[title] || "#1E293B",
  current,
  goals,
  progress = 0,
  className,
  onViewDetails,
}: CategoryCardProps) {
  // Donut chart data
  const pieData = [
    {
      id: "used",
      label: "Used",
      value: progress, 
      color,
    },
    {
      id: "remaining",
      label: "Remaining",
      value: Math.max(100 - progress, 0), 
      color: "#E5E7EB",
    },
  ];

  return (
    <Card className={cn("overflow-hidden shadow-sm border-gray-200", className)}>
      <CardHeader
        className="p-0 h-10 flex items-center px-4"
        style={{ backgroundColor: color }}
      >
        <h3 className="text-white font-medium">{title}</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Donut chart for smaller screens - positioned at the top */}
          <div className="flex justify-center items-center mx-auto py-3 md:hidden">
            <div style={{ height: 120, width: 120 }}>
              <ResponsivePie
                data={pieData}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
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
                animate={false}
              />
            </div>
          </div>
          
          {/* Stats - 2 columns on mobile, side by side on larger screens */}
          <div className="grid grid-cols-2 md:flex md:flex-row w-full">
            <div className="p-3 md:p-4 md:w-1/2 md:border-r border-gray-200">
              <h4 className="text-xs md:text-sm font-medium text-slate-600 mb-2 md:mb-3">Current Reality</h4>
              <ul className="space-y-1 md:space-y-2 mb-2 md:mb-4">
                {current.map((item, index) => (
                  <li key={index} className="flex justify-between text-xs md:text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 md:p-4 md:w-1/2 md:border-l md:-ml-px border-gray-200">
              <h4 className="text-xs md:text-sm font-medium text-slate-600 mb-2 md:mb-3">Goals</h4>
              <ul className="space-y-1 md:space-y-2 mb-2 md:mb-4">
                {goals.map((item, index) => (
                  <li key={index} className="flex justify-between text-xs md:text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Donut chart - only visible on medium screens and up */}
        <div className="hidden md:flex justify-center items-center mx-auto mb-4">
          <div style={{ height: 140, width: 140 }}>
            <ResponsivePie
              data={pieData}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
              animate={false}
              theme={{
                // Ensure consistent sizing in all viewports
                tooltip: {
                  container: {
                    background: 'white',
                    borderRadius: 4,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    padding: '5px 9px'
                  }
                }
              }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-3 pt-0 pb-2 md:p-4 md:pt-0 md:pb-3 border-t border-gray-100">
        <button 
          className="w-full md:w-auto text-blue-600 bg-blue-50 md:bg-transparent hover:bg-blue-100 md:hover:bg-transparent hover:text-blue-800 flex items-center justify-center md:justify-end text-xs md:text-sm font-medium py-1.5 px-3 md:p-0 rounded-md md:rounded-none"
          onClick={onViewDetails}
          aria-label={`View ${title} details`}
        >
          View Details <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
        </button>
      </CardFooter>
    </Card>
  );
}