import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

export function getCategoryIcon(icon: string): string {
  return icon || "fa-solid fa-question";
}

export const timeOptions = [
  { value: "0", label: "0 hours" },
  { value: "0.25", label: "15 mins" },
  { value: "0.5", label: "30 mins" },
  { value: "0.75", label: "45 mins" },
  { value: "1", label: "1 hour" },
  { value: "1.25", label: "1 hr 15 mins" },
  { value: "1.5", label: "1 hr 30 mins" },
  { value: "1.75", label: "1 hr 45 mins" },
  { value: "2", label: "2 hours" },
  { value: "2.5", label: "2.5 hours" },
  { value: "3", label: "3 hours" },
  { value: "3.5", label: "3.5 hours" },
  { value: "4", label: "4 hours" },
  { value: "4.5", label: "4.5 hours" },
  { value: "5", label: "5 hours" },
  { value: "6", label: "6 hours" },
  { value: "7", label: "7 hours" },
  { value: "8", label: "8 hours" },
  { value: "9", label: "9 hours" },
  { value: "10", label: "10 hours" },
  { value: "11", label: "11 hours" },
  { value: "12", label: "12 hours" },
];

export const hourOptions = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" },
  { value: "12", label: "12" },
  { value: "14", label: "14" },
  { value: "16", label: "16" },
  { value: "18", label: "18" },
  { value: "20", label: "20" },
];

export const categoryColors: Record<string, { bg: string, text: string, hover: string, border: string, ring: string, light: string }> = {
  blue: { 
    bg: "bg-blue-500", 
    text: "text-blue-500", 
    hover: "hover:bg-blue-600", 
    border: "border-blue-500", 
    ring: "ring-blue-500",
    light: "bg-blue-50"
  },
  green: { 
    bg: "bg-green-500", 
    text: "text-green-500", 
    hover: "hover:bg-green-600", 
    border: "border-green-500", 
    ring: "ring-green-500",
    light: "bg-green-50"
  },
  red: { 
    bg: "bg-red-500", 
    text: "text-red-500", 
    hover: "hover:bg-red-600", 
    border: "border-red-500", 
    ring: "ring-red-500",
    light: "bg-red-50"
  },
  yellow: { 
    bg: "bg-yellow-500", 
    text: "text-yellow-500", 
    hover: "hover:bg-yellow-600", 
    border: "border-yellow-500", 
    ring: "ring-yellow-500",
    light: "bg-yellow-50"
  },
  purple: { 
    bg: "bg-purple-500", 
    text: "text-purple-500", 
    hover: "hover:bg-purple-600", 
    border: "border-purple-500", 
    ring: "ring-purple-500",
    light: "bg-purple-50"
  },
  indigo: { 
    bg: "bg-indigo-500", 
    text: "text-indigo-500", 
    hover: "hover:bg-indigo-600", 
    border: "border-indigo-500", 
    ring: "ring-indigo-500",
    light: "bg-indigo-50"
  },
  pink: { 
    bg: "bg-pink-500", 
    text: "text-pink-500", 
    hover: "hover:bg-pink-600", 
    border: "border-pink-500", 
    ring: "ring-pink-500",
    light: "bg-pink-50"
  },
  orange: { 
    bg: "bg-orange-500", 
    text: "text-orange-500", 
    hover: "hover:bg-orange-600", 
    border: "border-orange-500", 
    ring: "ring-orange-500",
    light: "bg-orange-50"
  },
};

export function getCategoryColor(categoryName: string) {
  return categoryColors[categoryName] || categoryColors.blue;
}