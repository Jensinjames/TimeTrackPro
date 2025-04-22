import { Card, CardContent } from "@/components/ui/card";
import { categoryColors, getCategoryIcon } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color
}: SummaryCardProps) {
  const colorStyle = categoryColors[color] || categoryColors.blue;
  const [isVisible, setIsVisible] = useState(false);
  
  // Extract numeric value for animation
  const numericValue = parseInt(value.replace(/[^0-9.]/g, '')) || 0;
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // This effect triggers the entrance animation
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  // This effect animates the numeric value
  useEffect(() => {
    const duration = 1000; // ms
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    
    // Don't animate if value is 0
    if (numericValue === 0) {
      setAnimatedValue(0);
      return;
    }
    
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const currentValue = Math.round(progress * numericValue);
      
      if (frame === totalFrames) {
        clearInterval(timer);
        setAnimatedValue(numericValue);
      } else {
        setAnimatedValue(currentValue);
      }
    }, frameDuration);
    
    return () => clearInterval(timer);
  }, [numericValue]);
  
  // Format the displayed value based on the original format
  const getFormattedValue = () => {
    if (value.includes('%')) {
      return `${animatedValue}%`;
    } else if (value.includes('hrs')) {
      return `${animatedValue} hrs`;
    }
    return animatedValue.toString();
  };
  
  // Card entrance animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut" 
      }
    }
  };
  
  // Icon animation variants
  const iconVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        delay: 0.2,
        duration: 0.5,
        type: "spring",
        stiffness: 200
      }
    }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={cardVariants}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className={`${colorStyle.bg} h-1`}></div>
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-gray-500">{subtitle}</p>
              </div>
              <motion.div 
                className={`
                  h-10 w-10 rounded-full ${colorStyle.light} 
                  flex items-center justify-center
                `}
                variants={iconVariants}
              >
                <i className={`${icon} ${colorStyle.text}`}></i>
              </motion.div>
            </div>
            <motion.p 
              className={`text-2xl font-bold mt-4 ${colorStyle.text}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {getFormattedValue()}
            </motion.p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}