
import React from 'react';
import { cn } from '@/lib/utils';
import { TimeSeriesData, formatValue } from './utils/data-utils';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, Info, ChevronRight, Pin } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
              "hover:bg-secondary/60"
            )}
          >
            <button
              className="flex items-center focus:outline-none"
              onClick={() => onToggleSeries(s.id)}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full mr-2 flex-shrink-0",
                  isHidden && "opacity-40"
                )}
                style={{ backgroundColor: s.color }}
              />
            
              <span 
                className={cn(
                  "mr-2 max-w-[200px] truncate", 
                  isHidden && "text-muted-foreground line-through"
                )} 
                title={s.name}
              >
                {s.name}
              </span>
            </button>
            
            {selectedPoint && (
              <span className={cn(
                "ml-1 font-medium tabular-nums",
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
                  {isHidden ? '显示数据系列' : '隐藏数据系列'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {s.query && (
              <Popover>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      查看系列详细信息
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <h4 className="font-medium">{s.name}</h4>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    {s.query && (
                      <div className="space-y-1">
                        <div className="font-medium">查询</div>
                        <div className="font-mono bg-muted p-1.5 rounded text-xs overflow-auto">
                          {s.query}
                        </div>
                      </div>
                    )}
                    {s.unit && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">单位</span>
                        <span className="font-medium">{s.unit}</span>
                      </div>
                    )}
                    {selectedPoint && selectedPoint.values[s.id] !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">当前值</span>
                        <span className="font-medium tabular-nums">
                          {formatValue(selectedPoint.values[s.id], s.unit)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最小值</span>
                      <span className="font-medium tabular-nums">
                        {formatValue(Math.min(...s.data.map(d => d.value)), s.unit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最大值</span>
                      <span className="font-medium tabular-nums">
                        {formatValue(Math.max(...s.data.map(d => d.value)), s.unit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均值</span>
                      <span className="font-medium tabular-nums">
                        {formatValue(
                          s.data.reduce((acc, d) => acc + d.value, 0) / s.data.length,
                          s.unit
                        )}
                      </span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChartLegend;
