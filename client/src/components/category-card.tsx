import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCategoryIcon } from "@/lib/utils";
import { categoryColors } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
}: CategoryCardProps) {
  // Handle both named colors and hex codes
  const colorStyle = categoryColors[color] || 
                    (color && color.startsWith('#') ? categoryColors[color] : null) || 
                    categoryColors.blue;
  const iconClass = getCategoryIcon(icon);
  
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
        <CardContent className="p-0">
          <motion.div 
            className={`${colorStyle.bg} h-2`}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.7, delay: id * 0.05 }}
          ></motion.div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <motion.h3 
                  className="font-medium text-lg"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + (id * 0.05) }}
                >
                  {name}
                </motion.h3>
                <motion.p 
                  className="text-sm text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + (id * 0.05) }}
                >
                  {animatedHours.toFixed(1)} / {goalPeriod === 'monthly' ? 
                    (monthlyGoalHours || goalHours * 30).toFixed(0) + ' hrs/month' : 
                    goalHours + ' hrs/day'}
                </motion.p>
              </div>
              <motion.div 
                className={`
                  h-10 w-10 rounded-full ${colorStyle.light} 
                  flex items-center justify-center
                `}
                variants={iconVariants}
              >
                <i className={`${iconClass} ${colorStyle.text}`}></i>
              </motion.div>
            </div>
            
            <div className="space-y-2">
              <motion.div 
                className="flex justify-between text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + (id * 0.05) }}
              >
                <span>Progress</span>
                <span className={colorStyle.text}>{Math.round(animatedProgress)}%</span>
              </motion.div>
              
              <div className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                  className={`absolute h-full ${colorStyle.bg}`}
                  style={{ width: `${animatedProgress}%` }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${animatedProgress}%` }}
                  transition={{ duration: 0.7, delay: 0.3 + (id * 0.05) }}
                />
              </div>
              
              {goalPeriod === 'monthly' && (
                <motion.span 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + (id * 0.05) }}
                >
                  Monthly Goal
                </motion.span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}