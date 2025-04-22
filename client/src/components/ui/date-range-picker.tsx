import { useState, useRef, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format, isAfter, isBefore, add, sub } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const presetDays: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '1y': 365,
  '3y': 1095
};

type DateRangePickerProps = {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
  presets?: number[];
  showCompare?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  align = 'end',
  className,
  presets = [7, 30, 90, 180, 365, 1095],
  showCompare = false
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [compareRange, setCompareRange] = useState<DateRange | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Handle preset selection
  const handlePresetChange = (preset: number) => {
    const end = new Date();
    const start = sub(end, { days: preset });
    
    const range = {
      from: start,
      to: end
    };

    setSelectedPreset(preset.toString());
    onChange(range);

    if (showCompare) {
      // Set compare range to previous period
      const compareEnd = sub(start, { days: 1 });
      const compareStart = sub(compareEnd, { days: preset });
      setCompareRange({
        from: compareStart,
        to: compareEnd
      });
    }
  };

  // Get preset label from days
  const getPresetLabel = (days: number): string => {
    if (days === 7) return '7d';
    if (days === 30) return '30d';
    if (days === 90) return '90d';
    if (days === 180) return '6m';
    if (days === 365) return '1y';
    if (days === 1095) return '3y';
    return `${days}d`;
  };

  // Format date range for display
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return 'Select date range';
    }

    if (!range.to) {
      return format(range.from, 'LLL dd, y');
    }

    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={buttonRef}
            id="date"
            variant={'outline'}
            size="sm"
            className={cn(
              'h-9 py-1 px-3 justify-between font-normal items-center',
              !value && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center space-x-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDateRange(value)}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={inputRef}
          className="w-auto p-0"
          align={align}
        >
          <div className="border-b p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={selectedPreset === preset.toString() ? 'default' : 'outline'}
                  onClick={() => handlePresetChange(preset)}
                >
                  {getPresetLabel(preset)}
                </Button>
              ))}
            </div>
            <div className="flex mt-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedPreset(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}