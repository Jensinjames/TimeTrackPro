import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${Math.floor(hours)}h ${hours % 1 > 0 ? `${Math.round((hours % 1) * 60)}m` : ''}`;
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

export function getCategoryIcon(icon: string): string {
  const iconMap: Record<string, string> = {
    "pray": "fas fa-pray",
    "sun": "fas fa-sun",
    "briefcase": "fas fa-briefcase",
    "heart": "fas fa-heart",
    "clock": "fas fa-clock",
    "book": "fas fa-book",
    "dumbbell": "fas fa-dumbbell",
    "utensils": "fas fa-utensils",
    "tint": "fas fa-tint",
    "moon": "fas fa-moon",
    "running": "fas fa-running",
    "meditation": "fas fa-om",
    "code": "fas fa-code",
    "music": "fas fa-music",
    "graduation-cap": "fas fa-graduation-cap",
    "paint-brush": "fas fa-paint-brush",
    "theater-masks": "fas fa-theater-masks",
    "users": "fas fa-users"
  };
  
  return iconMap[icon] || "fas fa-star";
}

export const timeOptions = [
  { value: "0", label: "0 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "75", label: "1 hour 15 minutes" },
  { value: "90", label: "1 hour 30 minutes" },
  { value: "105", label: "1 hour 45 minutes" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2 hours 30 minutes" },
  { value: "180", label: "3 hours" },
  { value: "210", label: "3 hours 30 minutes" },
  { value: "240", label: "4 hours" },
  { value: "270", label: "4 hours 30 minutes" },
  { value: "300", label: "5 hours" },
  { value: "330", label: "5 hours 30 minutes" },
  { value: "360", label: "6 hours" },
  { value: "420", label: "7 hours" },
  { value: "480", label: "8 hours" },
];

export const hourOptions = [
  { value: "0", label: "0 hours" },
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
  { value: "5", label: "5 hours" },
  { value: "6", label: "6 hours" },
  { value: "7", label: "7 hours" },
  { value: "8", label: "8 hours" },
  { value: "9", label: "9 hours" },
  { value: "10", label: "10 hours" },
  { value: "12", label: "12 hours" },
  { value: "14", label: "14 hours" },
  { value: "16", label: "16 hours" },
  { value: "18", label: "18 hours" },
  { value: "20", label: "20 hours" },
  { value: "24", label: "24 hours" },
  { value: "30", label: "30 hours" },
  { value: "40", label: "40 hours" },
  { value: "50", label: "50 hours" },
  { value: "60", label: "60 hours" },
];

export const categoryColors: Record<string, { bg: string, text: string, hover: string, border: string, ring: string, light: string }> = {
  "Faith": {
    bg: "bg-green-500",
    text: "text-green-500",
    hover: "hover:bg-green-600",
    border: "border-green-500",
    ring: "ring-green-500",
    light: "bg-green-100"
  },
  "Life": {
    bg: "bg-amber-500",
    text: "text-amber-500",
    hover: "hover:bg-amber-600",
    border: "border-amber-500",
    ring: "ring-amber-500",
    light: "bg-amber-100"
  },
  "Work": {
    bg: "bg-red-500",
    text: "text-red-500",
    hover: "hover:bg-red-600",
    border: "border-red-500",
    ring: "ring-red-500",
    light: "bg-red-100"
  },
  "Health": {
    bg: "bg-pink-500",
    text: "text-pink-500",
    hover: "hover:bg-pink-600",
    border: "border-pink-500",
    ring: "ring-pink-500",
    light: "bg-pink-100"
  },
  "default": {
    bg: "bg-blue-500",
    text: "text-blue-500",
    hover: "hover:bg-blue-600",
    border: "border-blue-500",
    ring: "ring-blue-500",
    light: "bg-blue-100"
  }
};

export function getCategoryColor(categoryName: string) {
  return categoryColors[categoryName] || categoryColors.default;
}
