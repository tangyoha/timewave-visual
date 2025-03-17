
import React from 'react';
import { cn } from '@/lib/utils';
import { TimeSeriesData, formatValue } from './utils/data-utils';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChartLegendProps {
  series: TimeSeriesData[];
  onToggleSeries: (id: string) => void;
  selectedPoint?: {
    timestamp: Date;
    values: Record<string, number>;
  };
  className?: string;
}

const ChartLegend: React.FC<ChartLegendProps> = ({
  series,
  onToggleSeries,
  selectedPoint,
  className,
}) => {
  if (series.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2 mt-2", className)}>
      {series.map((s) => {
        const isHidden = s.visible === false;
        const currentValue = selectedPoint && selectedPoint.values[s.id];
        
        return (
          <div
            key={s.id}
            className={cn(
              "flex items-center px-2 py-1 rounded-full text-sm",
              "border transition-colors duration-200",
              isHidden ? "border-dashed opacity-60" : "opacity-100",
              "hover:bg-secondary"
            )}
          >
            <div
              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            
            <span className="mr-2 max-w-[200px] truncate" title={s.name}>
              {s.name}
            </span>
            
            {selectedPoint && (
              <span className={cn(
                "ml-1 font-medium",
                isHidden && "line-through opacity-50"
              )}>
                {currentValue !== undefined 
                  ? formatValue(currentValue, s.unit) 
                  : 'N/A'}
              </span>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={() => onToggleSeries(s.id)}
                  >
                    {isHidden ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isHidden ? 'Show series' : 'Hide series'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {s.query && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-medium">Query</div>
                      <div className="font-mono opacity-90">{s.query}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChartLegend;
