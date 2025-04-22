import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categoryColors, getCategoryIcon } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  
  const renderInfoCard = (title: string, items: { name: string; value: string }[]) => (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-medium text-lg mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-1">
              <p className="text-sm text-gray-500">{item.name}</p>
              <p className="font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className={`
            h-12 w-12 rounded-full ${colorStyle.light} 
            flex items-center justify-center
          `}>
            <i className={`${iconClass} ${colorStyle.text} text-lg`}></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <div className="flex items-center mt-1">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span className={colorStyle.text}>{Math.round(progress)}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-2"
                  // Fixing the prop error with a properly styled variant
                  // instead of using indicatorClassName
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-x-2">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInfoCard("Current Reality", currentReality)}
        {renderInfoCard("Goals", goals)}
      </div>
      
      <Tabs defaultValue="subcategories" className="mt-8">
        <TabsList>
          <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
          <TabsTrigger value="timetrend">Time Trend</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subcategories" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-lg">Subcategories</h3>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </Button>
              </div>
              
              {subcategories.length > 0 ? (
                <div className="space-y-4">
                  {subcategories.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">No subcategories yet</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first subcategory
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timetrend" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-4">Time Trend</h3>
              <p className="text-gray-500">
                Time trend visualization coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}