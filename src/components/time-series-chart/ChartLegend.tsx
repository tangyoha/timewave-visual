
import React from 'react';
import { cn } from '@/lib/utils';
import { TimeSeriesData, formatValue } from './utils/data-utils';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, Info, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
        
        // Calculate stats for hover card
        const values = s.data.map(p => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const last = values[values.length - 1];
        
        return (
          <HoverCard key={s.id}>
            <HoverCardTrigger asChild>
              <div
                className={cn(
                  "flex items-center px-2 py-1 rounded-full text-sm",
                  "border transition-colors duration-200",
                  "hover:bg-secondary cursor-pointer",
                  isHidden ? "border-dashed opacity-60" : "opacity-100"
                )}
                onClick={() => onToggleSeries(s.id)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSeries(s.id);
                        }}
                      >
                        {isHidden ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isHidden ? '显示数据系列' : '隐藏数据系列'}
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
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-medium">查询</div>
                          <div className="font-mono opacity-90">{s.query}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <h4 className="font-semibold text-base">{s.name}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">当前值</span>
                    <span className="font-medium">
                      {formatValue(last, s.unit)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">平均值</span>
                    <span className="font-medium">
                      {formatValue(avg, s.unit)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">最小值</span>
                    <span className="font-medium">
                      {formatValue(min, s.unit)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">最大值</span>
                    <span className="font-medium">
                      {formatValue(max, s.unit)}
                    </span>
                  </div>
                </div>
                
                {s.query && (
                  <div className="pt-2 border-t border-border mt-1">
                    <span className="text-xs text-muted-foreground">查询</span>
                    <div className="font-mono text-xs mt-1 bg-muted p-1 rounded">
                      {s.query}
                    </div>
                  </div>
                )}
                
                <div className="flex pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-7 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSeries(s.id);
                    }}
                  >
                    {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {isHidden ? '显示' : '隐藏'}
                  </Button>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
};

export default ChartLegend;
