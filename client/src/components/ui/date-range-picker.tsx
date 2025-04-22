import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface DateRangePickerProps {
  value?: DateRange | undefined;
  onChange: (range?: DateRange) => void;
  placeholder?: string;
  className?: string;
  presets?: number[];
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className,
  presets = [7, 30, 90],
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Function to create a preset range
  const createPresetRange = (daysFromToday: number): DateRange => {
    const endDate = new Date();
    const startDate = addDays(endDate, -daysFromToday + 1); // +1 to include today
    return { from: startDate, to: endDate };
  };

  // Handle preset selection
  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      // Keep current selection
      return;
    } else if (value === "clear") {
      // Clear the date range selection
      onChange(undefined);
      setIsOpen(false);
      return;
    }

    // Convert string to number and create preset range
    const days = parseInt(value, 10);
    if (!isNaN(days)) {
      const range = createPresetRange(days);
      onChange(range);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto flex flex-col space-y-4 p-4" align="start">
          {/* Preset dropdown */}
          <Select
            onValueChange={handlePresetChange}
            defaultValue={value ? "custom" : presets[0]?.toString()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a preset range" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="custom">Custom Range</SelectItem>
              {presets.map((days) => (
                <SelectItem key={days} value={days.toString()}>
                  Last {days} days
                </SelectItem>
              ))}
              <SelectItem value="clear">Clear Selection</SelectItem>
            </SelectContent>
          </Select>

          {/* Calendar */}
          <div className="border rounded-md p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (value?.from && !value.to) {
                  // If only start date is selected, treat as single day
                  onChange({ from: value.from, to: value.from });
                }
                setIsOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}