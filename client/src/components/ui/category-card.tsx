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
        <div className="flex flex-col lg:flex-row">
          <div className="p-4 lg:w-1/2 lg:border-r border-gray-200">
            <h4 className="text-sm font-medium text-slate-600 mb-3">Current Reality</h4>
            <ul className="space-y-2 mb-4">
              {current.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 lg:w-1/2 lg:border-l lg:-ml-px border-gray-200">
            <h4 className="text-sm font-medium text-slate-600 mb-3">Goals</h4>
            <ul className="space-y-2 mb-4">
              {goals.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Donut chart */}
        <div className="flex justify-center items-center mx-auto mb-4">
          <div style={{ height: 160, width: 160 }}>
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
      <CardFooter className="flex justify-end p-4 pt-0 pb-3 border-t border-gray-100">
        <button 
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
          onClick={onViewDetails}
          aria-label={`View ${title} details`}
        >
          View Details <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </CardFooter>
    </Card>
  );
}