import { cn } from "@/lib/utils";
import React from "react";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
  className?: string;
}

export function KpiCard({
  icon,
  label,
  value,
  subLabel,
  className,
}: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-lg bg-white dark:bg-slate-800 shadow px-4 py-3",
      className
    )}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-md">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </p>
          {subLabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}