import { Card, CardContent } from "@/components/ui/card";
import { categoryColors, getCategoryIcon } from "@/lib/utils";

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
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`${colorStyle.bg} h-1`}></div>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
            <div className={`
              h-10 w-10 rounded-full ${colorStyle.light} 
              flex items-center justify-center
            `}>
              <i className={`${icon} ${colorStyle.text}`}></i>
            </div>
          </div>
          <p className={`text-2xl font-bold mt-4 ${colorStyle.text}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}