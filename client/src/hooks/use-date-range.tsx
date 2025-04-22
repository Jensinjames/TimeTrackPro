import React, { createContext, useContext, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useLocation, useRoute } from 'wouter';

// Type for our context
type DateRangeContextType = {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};

// Create the context with default values
const DateRangeContext = createContext<DateRangeContextType>({
  dateRange: undefined,
  setDateRange: () => {},
});

// Custom hook to use the date range context
export const useDateRange = () => useContext(DateRangeContext);

// Provider component that holds state and synchronizes with URL
export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>(undefined);
  const [location, setLocation] = useLocation();
  
  // Parse URL params on initial load
  useEffect(() => {
    // Check for date range params in URL
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    const toParam = params.get('to');
    
    if (fromParam && toParam) {
      try {
        const fromDate = new Date(fromParam);
        const toDate = new Date(toParam);
        
        // Only set if both dates are valid
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setDateRangeState({ from: fromDate, to: toDate });
        }
      } catch (e) {
        console.error("Failed to parse date range from URL", e);
      }
    }
  }, []);
  
  // Update URL when date range changes
  const setDateRange = (range: DateRange | undefined) => {
    setDateRangeState(range);
    
    // Update URL params
    const currentParams = new URLSearchParams(window.location.search);
    
    if (range && range.from && range.to) {
      // Set date range params
      currentParams.set('from', range.from.toISOString());
      currentParams.set('to', range.to.toISOString());
    } else {
      // Remove date range params if not set
      currentParams.delete('from');
      currentParams.delete('to');
    }
    
    // Build new URL with path and updated parameters
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    setLocation(newUrl, { replace: true }); // Replace current history entry
  };
  
  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}