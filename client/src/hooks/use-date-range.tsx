import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useLocation } from "wouter";
import { add, sub, parseISO } from "date-fns";

type DateRangeContextType = {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  isCustomRange: boolean;
  selectedPreset: number | null;
  setSelectedPreset: (preset: number | null) => void;
};

// Custom hook to handle URL search params with wouter
function useUrlParams() {
  const [location, setLocation] = useLocation();
  
  // Parse the current URL search params
  const getParams = () => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  };
  
  // Get a specific param value
  const getParam = (key: string) => {
    return getParams().get(key);
  };
  
  // Update params and navigate
  const setParams = (updater: (params: URLSearchParams) => void) => {
    const params = getParams();
    updater(params);
    
    // Build the new URL with the base path and updated params
    const basePath = location.split('?')[0];
    const newSearch = params.toString();
    const newLocation = newSearch ? `${basePath}?${newSearch}` : basePath;
    
    // Update the URL
    setLocation(newLocation);
  };
  
  return { getParam, getParams, setParams };
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const { getParam, setParams } = useUrlParams();
  
  // Initialize from URL if available
  const fromParam = getParam("from");
  const toParam = getParam("to");
  const presetParam = getParam("preset");
  
  const initialPreset = presetParam ? parseInt(presetParam) : 30; // Default to 30 days
  
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>(() => {
    if (fromParam && toParam) {
      try {
        return {
          from: parseISO(fromParam),
          to: parseISO(toParam)
        };
      } catch (e) {
        console.error("Invalid date format in URL params");
      }
    }
    // Default to last 30 days
    return {
      from: sub(new Date(), { days: initialPreset }),
      to: new Date()
    };
  });
  
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    presetParam ? parseInt(presetParam) : initialPreset
  );
  
  const isCustomRange = !selectedPreset;
  
  // Update URL when date range changes
  const setDateRange = (range: DateRange | undefined) => {
    setDateRangeState(range);
    
    if (range && range.from && range.to) {
      const from = range.from;
      const to = range.to;
      
      setParams((params) => {
        params.set("from", from.toISOString());
        params.set("to", to.toISOString());
        
        if (selectedPreset) {
          params.set("preset", selectedPreset.toString());
        } else {
          params.delete("preset");
        }
      });
    }
  };
  
  return (
    <DateRangeContext.Provider
      value={{
        dateRange,
        setDateRange,
        isCustomRange,
        selectedPreset,
        setSelectedPreset
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}