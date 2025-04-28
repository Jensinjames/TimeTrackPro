import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCategoryIcon, formatHours } from "@/lib/utils";
import { categoryColors } from "@/lib/utils";
import { lightenColor, darkenColor, generateBalancedColorScheme, getContrastingTextColor } from "@/lib/color-utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ResponsivePie } from "@nivo/pie";

// Type definition for pie chart data
export type PieDataItem = {
  id: string;
  label: string;
  value: number;
  color: string;
  originalData?: {
    goalMinutes: number;
    actualMinutes: number;
  };
};

// Type guard function to safely check if segment has originalData
export const hasOriginalData = (segment: PieDataItem): segment is PieDataItem & { originalData: { goalMinutes: number; actualMinutes: number } } => {
  return segment.hasOwnProperty('originalData') && segment.originalData !== undefined;
};

interface Subcategory {
  id: number;
  name: string;
  goalMinutes: number;
  actualMinutes?: number;
  calculatedPercentage?: number;
}

interface CategoryCardProps {
  id: number;
  name: string;
  icon: string;
  color: string;
  goalHours: number;
  monthlyGoalHours?: number;
  goalPeriod?: 'daily' | 'monthly';
  actualHours: number;
  progress: number;
  onClick: () => void;
  isSelected?: boolean;
  subcategories?: Subcategory[];
}

export default function CategoryCard({
  id,
  name,
  icon,
  color,
  goalHours,
  monthlyGoalHours,
  goalPeriod = 'daily',
  actualHours,
  progress,
  onClick,
  isSelected = false,
  subcategories = []
}: CategoryCardProps) {
  // Get balanced color scheme from the category color
  const categoryColor = color.startsWith('#') ? color : '#16A34A';
  const { primary, secondary, tertiary } = generateBalancedColorScheme(categoryColor);
  
  // For backwards compatibility, also use the old color system
  const colorStyle = categoryColors[color] || 
                    (color && color.startsWith('#') ? categoryColors[color] : null) || 
                    categoryColors.blue;
  const iconClass = getCategoryIcon(icon);
  
  /**
   * Create chart segments from subcategories with normalized percentages 
   * 
   * - Generates pie chart segments based on actualMinutes (not goalMinutes)
   * - Ensures segments always add up to exactly 100%
   * - Guarantees minimal segment visibility (at least 1%) for active categories
   * - Provides fallback for edge cases with no data
   */
  const createSegmentsFromSubcategories = () => {
    if (!subcategories || subcategories.length === 0) {
      // Default data if no subcategories
      return [
        { id: 'segment1', label: 'Segment 1', value: 60, color: primary },
        { id: 'segment2', label: 'Segment 2', value: 25, color: secondary },
        { id: 'segment3', label: 'Segment 3', value: 15, color: tertiary }
      ];
    }
    
    // Use the global types defined at the top of the file

    // Determine colors for each subcategory
    const getColorForIndex = (idx: number, total: number) => {
      // For small number of subcategories, use our balanced triad
      if (total <= 3) {
        if (idx === 0) return primary;
        if (idx === 1) return secondary;
        return tertiary;
      }
      
      // For more subcategories, create shades
      if (idx === 0) return primary;
      if (idx === 1) return secondary;
      if (idx === 2) return tertiary;
      
      // For additional items, create shades
      return lightenColor(primary, 20 + (idx * 15) % 50);
    };
    
    // Calculate percentages for each subcategory with improved reactivity
    const calculatePercentage = (subcategory: Subcategory, useActual = false) => {
      // Switch between goal-based and actual time-based percentages
      const minutes = useActual ? (subcategory.actualMinutes || 0) : (subcategory.goalMinutes || 0);
      const totalMinutes = subcategories.reduce(
        (acc, curr) => acc + (useActual ? (curr.actualMinutes || 0) : (curr.goalMinutes || 0)), 
        0
      );
      
      // Calculate the percentage (ensure we don't divide by zero)
      const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      
      // Update the subcategory object with the calculated percentage for rendering
      subcategory.calculatedPercentage = percentage;
      
      // Make sure we never return 0 for valid subcategories to maintain visibility
      return percentage > 0 ? percentage : (minutes > 0 ? 1 : 0);
    };
    
    // Use top 3 subcategories or combine into "Other"
    const MAX_SEGMENTS = 3;
    let segments = [];
    
    if (subcategories.length <= MAX_SEGMENTS) {
      // Use all subcategories
      segments = subcategories.map((sub, idx) => ({
        id: `category-${sub.id}`,
        label: sub.name,
        value: calculatePercentage(sub, true), // Use actual minutes for chart segments
        color: getColorForIndex(idx, subcategories.length),
        originalData: {
          goalMinutes: sub.goalMinutes,
          actualMinutes: sub.actualMinutes || 0
        }
      }));
    } else {
      // Sort by actualMinutes/percentage (descending)
      // First calculate percentages for all subcategories (using actual minutes)
      subcategories.forEach(sub => calculatePercentage(sub, true));
      
      const sortedSubcategories = [...subcategories].sort((a, b) => {
        // First try to sort by actual minutes
        const actualDiff = (b.actualMinutes || 0) - (a.actualMinutes || 0);
        if (actualDiff !== 0) return actualDiff;
        
        // Then try percentage
        if (a.calculatedPercentage && b.calculatedPercentage) {
          return b.calculatedPercentage - a.calculatedPercentage;
        }
        
        // Finally, fall back to goal minutes
        return (b.goalMinutes || 0) - (a.goalMinutes || 0);
      });
      
      // Use top subcategories and combine rest into "Other"
      const topSubcategories = sortedSubcategories.slice(0, MAX_SEGMENTS - 1);
      const otherSubcategories = sortedSubcategories.slice(MAX_SEGMENTS - 1);
      
      segments = topSubcategories.map((sub, idx) => ({
        id: `category-${sub.id}`,
        label: sub.name,
        value: calculatePercentage(sub, true), // Use actual minutes for chart segments
        color: getColorForIndex(idx, MAX_SEGMENTS),
        originalData: {
          goalMinutes: sub.goalMinutes,
          actualMinutes: sub.actualMinutes || 0
        }
      }));
      
      // Add "Other" category
      const otherPercentage = otherSubcategories.reduce(
        (acc, curr) => acc + calculatePercentage(curr, true), // Use actual minutes for chart segments
        0
      );
      
      segments.push({
        id: 'category-other',
        label: 'Other',
        value: otherPercentage,
        color: getColorForIndex(MAX_SEGMENTS - 1, MAX_SEGMENTS),
        originalData: {
          goalMinutes: otherSubcategories.reduce(
            (acc, curr) => acc + (curr.goalMinutes || 0), 
            0
          ),
          actualMinutes: otherSubcategories.reduce(
            (acc, curr) => acc + (curr.actualMinutes || 0), 
            0
          )
        }
      });
    }
    
    // Ensure segments add up to 100%
    const totalPercentage = segments.reduce((acc, segment) => acc + segment.value, 0);
    
    // Only normalize if we have valid data (greater than 0)
    if (totalPercentage > 0) {
      // Make sure segments add up to exactly 100%
      if (totalPercentage !== 100) {
        // First normalize all segments proportionally
        let normalizedSegments = segments.map(segment => ({
          ...segment,
          value: Math.round((segment.value / totalPercentage) * 100)
        }));
        
        // Calculate the new total after rounding
        const newTotal = normalizedSegments.reduce((acc, segment) => acc + segment.value, 0);
        
        // Adjust the largest segment to make total exactly 100%
        if (newTotal !== 100) {
          const diff = 100 - newTotal;
          const largestSegmentIndex = normalizedSegments
            .map((segment, index) => ({ value: segment.value, index }))
            .sort((a, b) => b.value - a.value)[0].index;
          
          normalizedSegments[largestSegmentIndex].value += diff;
        }
        
        segments = normalizedSegments;
      }
    } else {
      // If no valid data, create a placeholder segment
      segments = [
        { id: 'no-data', label: 'No Data', value: 100, color: '#cccccc' }
      ];
    }
    
    return segments;
  };
  
  const pieData = createSegmentsFromSubcategories();
  
  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedHours, setAnimatedHours] = useState(0);
  
  // Trigger entrance animation on mount
  useEffect(() => {
    setIsVisible(true);
    
    // Animate progress value
    const duration = 1500; // ms
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    
    const timer = setInterval(() => {
      frame++;
      const progressPercent = frame / totalFrames;
      
      // Animate progress bar
      const currentProgress = Math.min(Math.round(progressPercent * progress), progress);
      setAnimatedProgress(currentProgress);
      
      // Animate hours
      const currentHours = progressPercent * actualHours;
      setAnimatedHours(currentHours);
      
      if (frame === totalFrames) {
        clearInterval(timer);
        setAnimatedProgress(progress);
        setAnimatedHours(actualHours);
      }
    }, frameDuration);
    
    return () => clearInterval(timer);
  }, [progress, actualHours]);
  
  // Card entrance animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        ease: "easeOut",
        delay: id * 0.05 // Stagger the entrance based on category ID
      }
    }
  };
  
  // Icon animation variants
  const iconVariants = {
    hidden: { scale: 0.7, rotate: -10, opacity: 0 },
    visible: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: { 
        delay: 0.2 + (id * 0.05),
        duration: 0.4,
        type: "spring",
        stiffness: 200
      }
    }
  };
  
  // Progress bar animation variants
  const progressVariants = {
    hidden: { width: "0%" },
    visible: { 
      width: `${animatedProgress}%`,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  // Card hover animation
  const hoverAnimation = {
    scale: 1.02,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    transition: { duration: 0.2 }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={cardVariants}
      whileHover={hoverAnimation}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`
          overflow-hidden cursor-pointer transition-all
          ${isSelected ? `ring-2 ${colorStyle.ring}` : ''}
        `}
        onClick={onClick}
      >
        <CardContent className="p-0 overflow-hidden">
          {/* Category header with primary color background */}
          <div 
            className="p-3 font-bold text-white uppercase text-lg" 
            style={{ backgroundColor: primary }}
          >
            {name}
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row">
              {/* Left column - current reality and goal */}
              <div className="flex-1">
                <div className="mb-5">
                  <motion.h4 
                    className="font-semibold mb-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + (id * 0.05) }}
                  >
                    Current Reality
                  </motion.h4>
                  <motion.div
                    className="text-xl font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 + (id * 0.05) }}
                  >
                    Actual: {formatHours(actualHours)}h
                  </motion.div>
                  <motion.div 
                    className="text-sm text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 + (id * 0.05) }}
                  >
                    Time spent on {name.toLowerCase()}-related activities
                  </motion.div>
                </div>
                
                <div>
                  <motion.h4 
                    className="font-semibold mb-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + (id * 0.05) }}
                  >
                    Goal
                  </motion.h4>
                  <motion.div
                    className="text-xl font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.35 + (id * 0.05) }}
                  >
                    Goal: {formatHours(goalHours)}h
                  </motion.div>
                  <motion.div 
                    className="text-sm text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 + (id * 0.05) }}
                  >
                    {goalPeriod === 'monthly' ? 'Monthly target' : 'Daily target'}
                  </motion.div>
                </div>
              </div>
              
              {/* Right column - donut chart visualization */}
              <div className="flex-1 flex justify-center pt-4 md:pt-0">
                <div className="relative" style={{ width: 180, height: 180 }}>
                  {/* Main Donut Chart */}
                  <div role="img" aria-label={`${name} category progress chart showing ${Math.round(progress)}% overall completion`}>
                    <ResponsivePie
                      data={pieData}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
                      // Add custom arc styling based on goal progress
                      arcLabelsTextColor={{ theme: 'background' }}
                      animate={true}
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
                      tooltip={({ datum }) => {
                      // Use typecasting for the datum, as type system doesn't know the structure
                      const data = datum.data as PieDataItem;
                      const goalMinutes = hasOriginalData(data) ? data.originalData.goalMinutes : 0;
                      const actualMinutes = hasOriginalData(data) ? data.originalData.actualMinutes : 0;
                      
                      return (
                        <div 
                          style={{
                            background: 'white',
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            color: '#333',
                            fontSize: '12px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                          }}
                        >
                          <strong>{datum.label}</strong><br />
                          <span style={{ color: primary, fontWeight: 'bold' }}>
                            Goal: {(goalMinutes / 60).toFixed(1)}h ({Math.round(goalMinutes)}m)
                          </span><br />
                          <span style={{ color: goalMinutes > 0 && actualMinutes >= goalMinutes ? 'green' : 'orange' }}>
                            Actual: {(actualMinutes / 60).toFixed(1)}h ({Math.round(actualMinutes)}m)
                          </span><br />
                          <hr style={{ margin: '4px 0', borderColor: '#eee' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Allocation: {datum.value}%</span>
                            <span>Completion: {goalMinutes > 0 ? Math.round((actualMinutes / goalMinutes) * 100) : 0}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  </div>
                  
                  {/* Center percentage */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold">{Math.round(progress)}%</div>
                    {/* Optional small label below */}
                    <div className="text-xs text-gray-500 mt-1">Completion</div>
                  </div>
                  
                  {/* Segment names positioned with connecting lines */}
                  {pieData.map((segment, idx) => {
                    // Distribute labels evenly around the chart
                    // Adjust angle to position labels based on their position in the pie chart
                    let startAngle = 0;
                    let total = 0;
                    
                    // Calculate the start angle for this segment
                    for (let i = 0; i < idx; i++) {
                      total += pieData[i].value;
                    }
                    
                    startAngle = (total / 100) * 2 * Math.PI;
                    const segmentAngle = (segment.value / 100) * 2 * Math.PI;
                    const midAngle = startAngle + (segmentAngle / 2);
                    
                    // Position labels at calculated angles, a bit further out than the pie chart
                    const innerRadius = 70; // For label position
                    const outerRadius = 83; // For line end position
                    
                    // Calculate positions using trigonometry
                    const labelX = 90 + Math.cos(midAngle) * innerRadius;
                    const labelY = 90 + Math.sin(midAngle) * innerRadius;
                    
                    // Calculate line end point (on the outside edge of the pie segment)
                    const lineEndX = 90 + Math.cos(midAngle) * outerRadius;
                    const lineEndY = 90 + Math.sin(midAngle) * outerRadius;
                    
                    // Calculate completion percentage for this subcategory
                    const goalMinutes = segment.hasOwnProperty('originalData') ? (segment as any).originalData?.goalMinutes || 0 : 0;
                    const actualMinutes = segment.hasOwnProperty('originalData') ? (segment as any).originalData?.actualMinutes || 0 : 0;
                    const completionPercentage = goalMinutes > 0 
                      ? Math.round((actualMinutes / goalMinutes) * 100) 
                      : 0;
                    
                    return (
                      <div key={segment.id}>
                        {/* Draw the label with time values */}
                        <div
                          className="absolute text-xs font-medium z-10 transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${labelX}px`,
                            top: `${labelY}px`,
                            color: darkenColor(segment.color, 30),
                            // Adjust text alignment based on position
                            textAlign: Math.cos(midAngle) < 0 ? 'right' : 'left',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        >
                          {segment.label}
                          <span 
                            className="font-bold ml-1 block"
                            style={{ color: primary }}
                          >
                            {completionPercentage}% - {(actualMinutes / 60).toFixed(1)}h / {(goalMinutes / 60).toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Subcategory Table */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              {/* Table Header */}
              <div className="grid grid-cols-4 mb-2 text-sm font-medium text-gray-700">
                <div className="col-span-1">Sub Category</div>
                <div className="col-span-1 text-center">%Complete</div>
                <div className="col-span-1 text-center">Current Goal</div>
                <div className="col-span-1 text-center">Target Goal</div>
              </div>
              
              {/* Table Rows */}
              {pieData.map((segment) => {
                // Calculate completion percentage between goal and actual minutes
                const goalMinutes = hasOriginalData(segment) ? segment.originalData.goalMinutes : 0;
                const actualMinutes = hasOriginalData(segment) ? segment.originalData.actualMinutes : 0;
                const completionPercentage = goalMinutes > 0 
                  ? Math.round((actualMinutes / goalMinutes) * 100) 
                  : 0;
                
                // Convert minutes to hours for display
                const currentGoalHours = (actualMinutes / 60).toFixed(1);
                const targetGoalHours = (goalMinutes / 60).toFixed(1);
                
                return (
                  <div 
                    key={segment.id} 
                    className="grid grid-cols-4 py-2 text-sm border-b border-gray-100 items-center hover:bg-gray-50"
                  >
                    {/* Subcategory Name with Color Dot */}
                    <div className="col-span-1 flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: segment.color }}
                        role="presentation"
                        aria-hidden="true"
                      ></div>
                      <span className="truncate max-w-[100px]" title={segment.label || 'Category'}>
                        {segment.label || 'Category'}
                      </span>
                    </div>
                    
                    {/* Completion Percentage */}
                    <div className="col-span-1 text-center font-medium" style={{ color: primary }}>
                      {completionPercentage}%
                    </div>
                    
                    {/* Current Goal Hours (Actual time spent) */}
                    <div className="col-span-1 text-center">
                      {currentGoalHours}h ({Math.round(actualMinutes)}m)
                    </div>
                    
                    {/* Target Goal Hours */}
                    <div className="col-span-1 text-center">
                      {targetGoalHours}h ({Math.round(goalMinutes)}m)
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend row with actual subcategory names */}
            <div className="flex justify-center flex-wrap gap-3 mt-4" role="group" aria-label="Category allocation summary">
              {pieData.map((segment) => {
                // Calculate completion percentage for this legend item
                const goalMinutes = hasOriginalData(segment) ? segment.originalData.goalMinutes : 0;
                const actualMinutes = hasOriginalData(segment) ? segment.originalData.actualMinutes : 0;
                
                return (
                  <div 
                    key={`legend-${segment.id}`} 
                    className="flex items-center"
                    role="listitem"
                    aria-label={`${segment.label}: ${segment.value}% allocation, ${(actualMinutes / 60).toFixed(1)} hours actual of ${(goalMinutes / 60).toFixed(1)} hours goal`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-1" 
                      style={{ backgroundColor: segment.color }}
                      role="presentation"
                      aria-hidden="true"
                    ></div>
                    <span 
                      className="text-xs sm:text-sm truncate max-w-[100px]"
                      title={`${segment.label}: ${(actualMinutes / 60).toFixed(1)}h / ${(goalMinutes / 60).toFixed(1)}h`}
                    >
                      {segment.label || 'Category'}
                    </span>
                    <span 
                      className="text-xs font-medium ml-1" 
                      style={{ color: primary }}
                      title="Percentage allocation"
                    >
                      {segment.value}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}