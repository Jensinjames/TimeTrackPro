import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCategoryIcon, formatHours } from "@/lib/utils";
import { categoryColors } from "@/lib/utils";
import { lightenColor, darkenColor, generateBalancedColorScheme, getContrastingTextColor } from "@/lib/color-utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ResponsivePie } from "@nivo/pie";

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
  
  // Create chart segments from subcategories if available, or use defaults
  const createSegmentsFromSubcategories = () => {
    if (!subcategories || subcategories.length === 0) {
      // Default data if no subcategories
      return [
        { id: 'segment1', label: 'Segment 1', value: 60, color: primary },
        { id: 'segment2', label: 'Segment 2', value: 25, color: secondary },
        { id: 'segment3', label: 'Segment 3', value: 15, color: tertiary }
      ];
    }
    
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
    
    // Calculate percentages for each subcategory
    const calculatePercentage = (subcategory: Subcategory) => {
      // If we already have a calculated percentage, use it
      if (subcategory.calculatedPercentage) {
        return subcategory.calculatedPercentage;
      }
      
      const minutes = subcategory.goalMinutes || 0;
      const totalMinutes = subcategories.reduce(
        (acc, curr) => acc + (curr.goalMinutes || 0), 
        0
      );
      return totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
    };
    
    // Use top 3 subcategories or combine into "Other"
    const MAX_SEGMENTS = 3;
    let segments = [];
    
    if (subcategories.length <= MAX_SEGMENTS) {
      // Use all subcategories
      segments = subcategories.map((sub, idx) => ({
        id: `category-${sub.id}`,
        label: sub.name,
        value: calculatePercentage(sub),
        color: getColorForIndex(idx, subcategories.length),
        originalData: {
          goalMinutes: sub.goalMinutes,
          actualMinutes: sub.actualMinutes || 0
        }
      }));
    } else {
      // Sort by percentage/goalMinutes (descending)
      const sortedSubcategories = [...subcategories].sort((a, b) => {
        if (a.calculatedPercentage && b.calculatedPercentage) {
          return b.calculatedPercentage - a.calculatedPercentage;
        }
        return (b.goalMinutes || 0) - (a.goalMinutes || 0);
      });
      
      // Use top subcategories and combine rest into "Other"
      const topSubcategories = sortedSubcategories.slice(0, MAX_SEGMENTS - 1);
      const otherSubcategories = sortedSubcategories.slice(MAX_SEGMENTS - 1);
      
      segments = topSubcategories.map((sub, idx) => ({
        id: `category-${sub.id}`,
        label: sub.name,
        value: calculatePercentage(sub),
        color: getColorForIndex(idx, MAX_SEGMENTS),
        originalData: {
          goalMinutes: sub.goalMinutes,
          actualMinutes: sub.actualMinutes || 0
        }
      }));
      
      // Add "Other" category
      const otherPercentage = otherSubcategories.reduce(
        (acc, curr) => acc + calculatePercentage(curr), 
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
    if (totalPercentage !== 100 && totalPercentage > 0) {
      // Normalize to 100%
      segments = segments.map(segment => ({
        ...segment,
        value: Math.round((segment.value / totalPercentage) * 100)
      }));
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
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl font-bold">{Math.round(progress)}%</div>
                  </div>
                  
                  {/* Segment percentages positioned dynamically */}
                  {pieData.map((segment, idx) => {
                    // Position labels at calculated angles
                    const angle = (idx / pieData.length) * 2 * Math.PI;
                    const radius = 60; // Distance from center
                    const left = 90 + Math.cos(angle) * radius;
                    const top = 90 + Math.sin(angle) * radius;
                    
                    return (
                      <div
                        key={segment.id}
                        className="absolute text-sm font-medium z-10 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          color: darkenColor(segment.color, 20)
                        }}
                      >
                        {segment.value}%
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Legend row with actual subcategory names */}
            <div className="flex justify-center flex-wrap gap-3 mt-4">
              {pieData.map((segment) => (
                <div key={segment.id} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1" 
                    style={{ backgroundColor: segment.color }}
                  ></div>
                  <span className="text-xs sm:text-sm truncate max-w-[100px]">
                    {segment.label || 'Category'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}