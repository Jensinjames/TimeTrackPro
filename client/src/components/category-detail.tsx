import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categoryColors, getCategoryIcon } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CategoryDetailProps {
  category: any;
  currentReality: { name: string; value: string }[];
  goals: { name: string; value: string }[];
}

export default function CategoryDetail({
  category,
  currentReality,
  goals
}: CategoryDetailProps) {
  const { 
    name, 
    icon, 
    color, 
    progress, 
    subcategories = [] 
  } = category;
  
  const colorStyle = categoryColors[color] || categoryColors.blue;
  const iconClass = getCategoryIcon(icon);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Animate progress bar on component mount
  useEffect(() => {
    const duration = 1000; // ms
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    
    const timer = setInterval(() => {
      frame++;
      const progressPercent = frame / totalFrames;
      setAnimatedProgress(Math.min(Math.round(progressPercent * progress), progress));
      
      if (frame === totalFrames) {
        clearInterval(timer);
        setAnimatedProgress(progress);
      }
    }, frameDuration);
    
    return () => clearInterval(timer);
  }, [progress]);
  
  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };
  
  const iconVariants = {
    hidden: { scale: 0.8, rotate: -10, opacity: 0 },
    visible: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 200,
        delay: 0.2
      }
    }
  };
  
  // Staggered card entrance animation
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };
  
  // Staggered subcategory items entrance animation
  const subcategoryVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({ 
      opacity: 1, 
      x: 0,
      transition: { 
        delay: i * 0.05,
        duration: 0.3 
      }
    })
  };
  
  const renderInfoCard = (title: string, items: { name: string; value: string }[], index: number) => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.2 + (index * 0.1) }}
    >
      <Card>
        <CardContent className="p-6">
          <motion.h3 
            className="font-medium text-lg mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + (index * 0.1) }}
          >
            {title}
          </motion.h3>
          <div className="grid grid-cols-2 gap-4">
            {items.map((item, i) => (
              <motion.div 
                key={i} 
                className="space-y-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1) + (i * 0.05) }}
              >
                <p className="text-sm text-gray-500">{item.name}</p>
                <p className="font-medium">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
  
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex justify-between items-start"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-4">
          <motion.div 
            className={`
              h-12 w-12 rounded-full ${colorStyle.light} 
              flex items-center justify-center
            `}
            variants={iconVariants}
          >
            <i className={`${iconClass} ${colorStyle.text} text-lg`}></i>
          </motion.div>
          <div>
            <motion.h2 
              className="text-2xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {name}
            </motion.h2>
            <div className="flex items-center mt-1">
              <div className="w-full max-w-xs">
                <motion.div 
                  className="flex justify-between text-xs mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
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
                    transition={{ duration: 0.7, delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <motion.div 
          className="space-x-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </motion.div>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInfoCard("Current Reality", currentReality, 0)}
        {renderInfoCard("Goals", goals, 1)}
      </div>
      
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        <Tabs defaultValue="subcategories" className="mt-8">
          <TabsList>
            <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
            <TabsTrigger value="timetrend">Time Trend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subcategories" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <motion.div 
                  className="flex justify-between items-center mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <h3 className="font-medium text-lg">Subcategories</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                </motion.div>
                
                {subcategories.length > 0 ? (
                  <motion.div 
                    className="space-y-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.08
                        }
                      }
                    }}
                  >
                    {subcategories.map((sub: any, index: number) => (
                      <motion.div 
                        key={sub.id} 
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                        custom={index}
                        variants={subcategoryVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ 
                          scale: 1.01, 
                          backgroundColor: 'rgba(249, 250, 251, 1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{sub.name}</h4>
                            <Badge variant="outline">{sub.goalType || "Time"}</Badge>
                          </div>
                          {sub.goalMinutes && (
                            <p className="text-sm text-gray-500">
                              Goal: {Math.round(sub.goalMinutes / 60 * 10) / 10} hours
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    className="text-center py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <p className="text-gray-500 mb-4">No subcategories yet</p>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first subcategory
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timetrend" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-4">Time Trend</h3>
                  <p className="text-gray-500">
                    Time trend visualization coming soon...
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}