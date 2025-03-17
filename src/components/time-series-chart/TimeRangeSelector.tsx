
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  Calendar, 
  Clock,
  RefreshCw 
} from 'lucide-react';
import { 
  TIME_RANGES, 
  REFRESH_INTERVALS, 
  TimeRange, 
  formatDateTimeForInput, 
  parseInputDateTime 
} from './utils/time-utils';

interface TimeRangeSelectorProps {
  selectedRange: string;
  onTimeRangeChange: (range: string) => void;
  onCustomTimeRangeChange: (startTime: Date, endTime: Date) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onRefreshClick: () => void;
  className?: string;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onTimeRangeChange,
  onCustomTimeRangeChange,
  refreshInterval,
  onRefreshIntervalChange,
  onRefreshClick,
  className,
}) => {
  const [customStartTime, setCustomStartTime] = useState<string>(
    formatDateTimeForInput(new Date(Date.now() - 3600000)) // 1h ago
  );
  const [customEndTime, setCustomEndTime] = useState<string>(
    formatDateTimeForInput(new Date())
  );

  const selectedRangeLabel = TIME_RANGES.find(r => r.value === selectedRange)?.label || 'Custom';
  const selectedRefreshLabel = REFRESH_INTERVALS.find(r => r.value === refreshInterval)?.label || 'Off';

  const handleCustomTimeApply = () => {
    const startDate = parseInputDateTime(customStartTime);
    const endDate = parseInputDateTime(customEndTime);
    
    if (startDate && endDate && startDate < endDate) {
      onCustomTimeRangeChange(startDate, endDate);
    }
  };

  const handleRefreshButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRefreshClick();
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Time Range Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 h-9 transition-all duration-200 hover:bg-secondary"
          >
            <span className="text-sm font-medium">{selectedRangeLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {TIME_RANGES.map((range) => (
            <DropdownMenuItem
              key={range.value}
              onClick={() => onTimeRangeChange(range.value)}
              className={cn(
                "flex items-center text-sm cursor-pointer transition-colors",
                selectedRange === range.value && "bg-accent text-accent-foreground"
              )}
            >
              {range.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem 
            onClick={() => {}} 
            className="border-t border-border mt-1 pt-1 text-sm cursor-default hover:bg-transparent text-muted-foreground"
          >
            Custom Range
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Time Range Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 h-9 transition-all duration-200 hover:bg-secondary"
          >
            <Calendar className="h-4 w-4 opacity-70" />
            <span className="text-sm font-medium">Custom Range</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Custom Time Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="datetime-local"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="datetime-local"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleCustomTimeApply}
              className="w-full"
            >
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Refresh Controls */}
      <div className="flex items-center space-x-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 h-9 transition-all duration-200 hover:bg-secondary"
            >
              <Clock className="h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">
                {selectedRefreshLabel}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {REFRESH_INTERVALS.map((interval) => (
              <DropdownMenuItem
                key={interval.value}
                onClick={() => onRefreshIntervalChange(interval.value)}
                className={cn(
                  "flex items-center text-sm cursor-pointer transition-colors",
                  refreshInterval === interval.value && "bg-accent text-accent-foreground"
                )}
              >
                {interval.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 transition-all duration-200 hover:bg-secondary"
          onClick={handleRefreshButtonClick}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TimeRangeSelector;
