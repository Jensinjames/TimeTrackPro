import { Card, CardContent } from "@/components/ui/card";

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
  const colorClasses: Record<string, { bg: string, text: string, light: string }> = {
    blue: { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-50" },
    green: { bg: "bg-green-500", text: "text-green-500", light: "bg-green-50" },
    red: { bg: "bg-red-500", text: "text-red-500", light: "bg-red-50" },
    yellow: { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-50" },
    purple: { bg: "bg-purple-500", text: "text-purple-500", light: "bg-purple-50" },
    indigo: { bg: "bg-indigo-500", text: "text-indigo-500", light: "bg-indigo-50" },
    pink: { bg: "bg-pink-500", text: "text-pink-500", light: "bg-pink-50" },
    orange: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50" },
  };
  
  const colorStyle = colorClasses[color] || colorClasses.blue;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className={`text-2xl font-bold mt-1 ${colorStyle.text}`}>{value}</h3>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`h-10 w-10 rounded-full ${colorStyle.light} flex items-center justify-center`}>
            <i className={`${icon} ${colorStyle.text}`}></i>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}