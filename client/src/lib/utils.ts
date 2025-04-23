import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format a number as hours
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

/**
 * Format a date as a string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

/**
 * Get a category icon class from an icon string
 */
export function getCategoryIcon(icon: string): string {
  // If the icon already has a class (fa-...), return it
  if (icon.includes("fa-")) {
    return icon;
  }
  
  // Default mapping of category types to Font Awesome icons
  const iconMap: Record<string, string> = {
    work: "fa-solid fa-briefcase",
    study: "fa-solid fa-book",
    health: "fa-solid fa-heart",
    fitness: "fa-solid fa-dumbbell",
    faith: "fa-solid fa-church",
    family: "fa-solid fa-house",
    friends: "fa-solid fa-user-group",
    entertainment: "fa-solid fa-tv",
    hobbies: "fa-solid fa-palette",
    travel: "fa-solid fa-plane",
    community: "fa-solid fa-people-group",
    default: "fa-solid fa-circle"
  };
  
  return iconMap[icon.toLowerCase()] || iconMap.default;
}

/**
 * Get color styles based on category name
 */
export function getCategoryColor(name: string): { 
  bg: string;
  text: string;
  light: string;
  border: string;
} {
  const colorMap: Record<string, { 
    bg: string;
    text: string;
    light: string;
    border: string;
  }> = {
    work: {
      bg: "bg-blue-600",
      text: "text-blue-600",
      light: "bg-blue-50",
      border: "border-blue-200",
    },
    study: {
      bg: "bg-purple-600",
      text: "text-purple-600",
      light: "bg-purple-50",
      border: "border-purple-200",
    },
    health: {
      bg: "bg-green-600",
      text: "text-green-600",
      light: "bg-green-50",
      border: "border-green-200",
    },
    fitness: {
      bg: "bg-emerald-600",
      text: "text-emerald-600",
      light: "bg-emerald-50",
      border: "border-emerald-200",
    },
    faith: {
      bg: "bg-indigo-600",
      text: "text-indigo-600",
      light: "bg-indigo-50",
      border: "border-indigo-200",
    },
    family: {
      bg: "bg-pink-600",
      text: "text-pink-600",
      light: "bg-pink-50",
      border: "border-pink-200",
    },
    friends: {
      bg: "bg-orange-600",
      text: "text-orange-600",
      light: "bg-orange-50",
      border: "border-orange-200",
    },
    entertainment: {
      bg: "bg-red-600",
      text: "text-red-600",
      light: "bg-red-50",
      border: "border-red-200",
    },
    default: {
      bg: "bg-gray-600",
      text: "text-gray-600",
      light: "bg-gray-50",
      border: "border-gray-200",
    }
  };
  
  // Default to the 'default' color if no category match
  return colorMap[name.toLowerCase()] || colorMap.default;
}

/**
 * Color styles for different category colors
 */
export const categoryColors: Record<string, { 
  bg: string; 
  text: string; 
  light: string;
  ring: string;
}> = {
  blue: {
    bg: "bg-blue-500",
    text: "text-blue-500",
    light: "bg-blue-100",
    ring: "ring-blue-500"
  },
  green: {
    bg: "bg-green-500",
    text: "text-green-500",
    light: "bg-green-100",
    ring: "ring-green-500"
  },
  red: {
    bg: "bg-red-500",
    text: "text-red-500",
    light: "bg-red-100",
    ring: "ring-red-500"
  },
  yellow: {
    bg: "bg-yellow-500",
    text: "text-yellow-500",
    light: "bg-yellow-100",
    ring: "ring-yellow-500"
  },
  purple: {
    bg: "bg-purple-500",
    text: "text-purple-500",
    light: "bg-purple-100",
    ring: "ring-purple-500"
  },
  pink: {
    bg: "bg-pink-500",
    text: "text-pink-500",
    light: "bg-pink-100",
    ring: "ring-pink-500"
  },
  indigo: {
    bg: "bg-indigo-500",
    text: "text-indigo-500",
    light: "bg-indigo-100",
    ring: "ring-indigo-500"
  },
  orange: {
    bg: "bg-orange-500",
    text: "text-orange-500",
    light: "bg-orange-100",
    ring: "ring-orange-500"
  },
  teal: {
    bg: "bg-teal-500",
    text: "text-teal-500",
    light: "bg-teal-100",
    ring: "ring-teal-500"
  },
  gray: {
    bg: "bg-gray-500",
    text: "text-gray-500",
    light: "bg-gray-100",
    ring: "ring-gray-500"
  },
  // Map hex colors with similar Tailwind colors
  "#16A34A": {
    bg: "bg-green-600",
    text: "text-green-600",
    light: "bg-green-100",
    ring: "ring-green-600"
  },
  "#D97706": {
    bg: "bg-amber-600",
    text: "text-amber-600",
    light: "bg-amber-100",
    ring: "ring-amber-600"
  },
  "#DC2626": {
    bg: "bg-red-600",
    text: "text-red-600",
    light: "bg-red-100",
    ring: "ring-red-600"
  },
  "#EC4899": {
    bg: "bg-pink-600",
    text: "text-pink-600",
    light: "bg-pink-100",
    ring: "ring-pink-600"
  }
};

/**
 * Hour options for goal setting
 */
export const hourOptions = [
  { value: "0.5", label: "0.5 hours" },
  { value: "1", label: "1 hour" },
  { value: "1.5", label: "1.5 hours" },
  { value: "2", label: "2 hours" },
  { value: "2.5", label: "2.5 hours" },
  { value: "3", label: "3 hours" },
  { value: "3.5", label: "3.5 hours" },
  { value: "4", label: "4 hours" },
  { value: "4.5", label: "4.5 hours" },
  { value: "5", label: "5 hours" },
  { value: "5.5", label: "5.5 hours" },
  { value: "6", label: "6 hours" },
  { value: "6.5", label: "6.5 hours" },
  { value: "7", label: "7 hours" },
  { value: "7.5", label: "7.5 hours" },
  { value: "8", label: "8 hours" },
  { value: "8.5", label: "8.5 hours" },
  { value: "9", label: "9 hours" },
  { value: "9.5", label: "9.5 hours" },
  { value: "10", label: "10 hours" },
  { value: "11", label: "11 hours" },
  { value: "12", label: "12 hours" },
  { value: "13", label: "13 hours" },
  { value: "14", label: "14 hours" },
  { value: "15", label: "15 hours" },
  { value: "16", label: "16 hours" },
  { value: "17", label: "17 hours" },
  { value: "18", label: "18 hours" },
  { value: "19", label: "19 hours" },
  { value: "20", label: "20 hours" },
  { value: "21", label: "21 hours" },
  { value: "22", label: "22 hours" },
  { value: "23", label: "23 hours" },
  { value: "24", label: "24 hours" },
];

/**
 * Time increments for time tracking
 */
export const timeOptions = [
  { value: "0.25", label: "15 minutes" },
  { value: "0.5", label: "30 minutes" },
  { value: "0.75", label: "45 minutes" },
  { value: "1", label: "1 hour" },
  { value: "1.25", label: "1h 15m" },
  { value: "1.5", label: "1h 30m" },
  { value: "1.75", label: "1h 45m" },
  { value: "2", label: "2 hours" },
  { value: "2.5", label: "2h 30m" },
  { value: "3", label: "3 hours" },
  { value: "3.5", label: "3h 30m" },
  { value: "4", label: "4 hours" },
  { value: "4.5", label: "4h 30m" },
  { value: "5", label: "5 hours" },
  { value: "5.5", label: "5h 30m" },
  { value: "6", label: "6 hours" },
  { value: "6.5", label: "6h 30m" },
  { value: "7", label: "7 hours" },
  { value: "7.5", label: "7h 30m" },
  { value: "8", label: "8 hours" },
  { value: "8.5", label: "8h 30m" },
  { value: "9", label: "9 hours" },
  { value: "9.5", label: "9h 30m" },
  { value: "10", label: "10 hours" },
  { value: "11", label: "11 hours" },
  { value: "12", label: "12 hours" },
  { value: "13", label: "13 hours" },
  { value: "14", label: "14 hours" },
  { value: "15", label: "15 hours" },
  { value: "16", label: "16 hours" }
];