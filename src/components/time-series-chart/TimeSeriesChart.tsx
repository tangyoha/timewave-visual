
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Brush,
  Legend,
} from 'recharts';
import { 
  AreaChart, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TimeRangeSelector from './TimeRangeSelector';
import QueryInput from './QueryInput';
import ChartLegend from './ChartLegend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { 
  TIME_PRECISION, 
  formatTimeForDisplay, 
  getTimeRangeFromValue,
  formatAbsoluteTime,
  formatDuration
} from './utils/time-utils';
import { 
  TimeSeriesData, 
  DataPoint,
  formatValue,
  generateMockTimeSeriesData
} from './utils/data-utils';

interface TimeSeriesChartProps {
  title?: string;
  description?: string;
  initialQuery?: string;
  initialTimeRange?: string;
  initialData?: TimeSeriesData[];
  onQueryChange?: (query: string) => void;
  onTimeRangeChange?: (startTime: Date, endTime: Date) => void;
  thresholds?: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  isLoading?: boolean;
  error?: string | null;
  yAxisUnit?: string;
  showBrush?: boolean;
  className?: string;
}

interface ChartData {
  timestamp: Date;
  [key: string]: any;
}

const CustomTooltip = ({ active, payload, label, series }: any) => {
  if (active && payload && payload.length) {
    const timestamp = new Date(label);
    
    return (
      <div className="custom-tooltip glass-panel p-3 text-sm shadow-lg">
        <div className="font-medium mb-1.5">
          {formatAbsoluteTime(timestamp)}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const seriesData = series.find((s: TimeSeriesData) => s.id === entry.dataKey);
            if (!seriesData || seriesData.visible === false) return null;
            
            return (
              <div key={index} className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="max-w-[150px] truncate mr-2">{seriesData?.name}</span>
                <span className="font-medium">
                  {formatValue(entry.value, seriesData?.unit)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title = 'Time Series Chart',
  description,
  initialQuery = 'http_requests_total',
  initialTimeRange = '1h',
  initialData,
  onQueryChange,
  onTimeRangeChange,
  thresholds,
  isLoading = false,
  error = null,
  yAxisUnit,
  showBrush = true,
  className,
}) => {
  // State for time control
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [startTime, setStartTime] = useState<Date>(new Date(Date.now() - 3600000)); // 1h ago
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(0); // 0 = off
  const [timePrecision, setTimePrecision] = useState('second');
  
  // State for query control
  const [query, setQuery] = useState(initialQuery);
  
  // State for chart data
  const [series, setSeries] = useState<TimeSeriesData[]>(initialData || []);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{
    timestamp: Date;
    values: Record<string, number>;
  } | undefined>(undefined);
  
  // State for chart interaction
  const [zoomMode, setZoomMode] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refs
  const refreshTimerRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Handle time range changes
  const handleTimeRangeChange = useCallback((newRange: string) => {
    setTimeRange(newRange);
    const [start, end] = getTimeRangeFromValue(newRange);
    setStartTime(start);
    setEndTime(end);
    
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  }, [onTimeRangeChange]);

  // Handle custom time range changes
  const handleCustomTimeRangeChange = useCallback((start: Date, end: Date) => {
    setStartTime(start);
    setEndTime(end);
    setTimeRange('custom');
    
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  }, [onTimeRangeChange]);

  // Handle refresh interval changes
  const handleRefreshIntervalChange = useCallback((interval: number) => {
    setRefreshInterval(interval);
    
    // Clear existing timer
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Set new timer if interval > 0
    if (interval > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        refreshData();
      }, interval * 1000);
    }
  }, []);

  // Handle refresh button click
  const handleRefreshClick = useCallback(() => {
    refreshData();
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    
    // If timeRange is not custom, update the end time to now and recalculate start time
    if (timeRange !== 'custom') {
      const now = new Date();
      const [newStart] = getTimeRangeFromValue(timeRange);
      setStartTime(newStart);
      setEndTime(now);
      
      if (onTimeRangeChange) {
        onTimeRangeChange(newStart, now);
      }
    }
    
    // Simulate data loading
    setTimeout(() => {
      const mockData = generateMockTimeSeriesData(3, 100, timeRange);
      setSeries(mockData);
      setIsRefreshing(false);
      
      toast({
        title: "Data refreshed",
        description: `Query: ${query}`,
      });
    }, 500);
  }, [timeRange, query, onTimeRangeChange]);

  // Handle query changes
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    if (onQueryChange) {
      onQueryChange(newQuery);
    }
  }, [onQueryChange]);

  // Handle query submission
  const handleQuerySubmit = useCallback((submittedQuery: string) => {
    setIsRefreshing(true);
    
    // Simulate data loading
    setTimeout(() => {
      const mockData = generateMockTimeSeriesData(
        Math.floor(Math.random() * 2) + 2, // 2-3 series
        100,
        timeRange
      );
      setSeries(mockData);
      setIsRefreshing(false);
      
      toast({
        title: "Query executed",
        description: `Executed: ${submittedQuery}`,
      });
    }, 700);
  }, [timeRange]);

  // Handle series visibility toggle
  const handleToggleSeries = useCallback((id: string) => {
    setSeries(prevSeries => 
      prevSeries.map(s => 
        s.id === id 
          ? { ...s, visible: s.visible === false ? true : false } 
          : s
      )
    );
  }, []);

  // Format chart data from series
  useEffect(() => {
    if (series.length > 0) {
      const visibleSeries = series.filter(s => s.visible !== false);
      
      // Create a map of all timestamps
      const timestampMap = new Map<number, ChartData>();
      
      // Collect all data points
      visibleSeries.forEach(s => {
        s.data.forEach(point => {
          const timestamp = point.timestamp.getTime();
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {
              timestamp: point.timestamp,
            });
          }
          
          // Add value to the timestamp entry
          const entry = timestampMap.get(timestamp)!;
          entry[s.id] = point.value;
        });
      });
      
      // Convert map to array and sort by timestamp
      const newChartData = Array.from(timestampMap.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setChartData(newChartData);
    } else {
      setChartData([]);
    }
  }, [series]);

  // Handle component unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Load initial data if needed
  useEffect(() => {
    if (!initialData && series.length === 0 && !isLoading) {
      refreshData();
    }
  }, []);

  // Export chart as PNG
  const exportChart = useCallback(() => {
    if (chartContainerRef.current) {
      try {
        // Create a canvas from the chart
        const svgElement = chartContainerRef.current.querySelector('svg');
        if (!svgElement) return;
        
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Set canvas dimensions
        canvas.width = svgElement.clientWidth * 2; // 2x for better quality
        canvas.height = svgElement.clientHeight * 2;
        
        img.onload = () => {
          if (ctx) {
            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the SVG
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convert to PNG and download
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `chart-${new Date().toISOString().slice(0, 19)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (err) {
        console.error('Failed to export chart:', err);
        toast({
          title: "Export failed",
          description: "Could not export the chart as PNG",
          variant: "destructive",
        });
      }
    }
  }, []);

  // Chart mouse move handler
  const handleChartMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const timestamp = new Date(e.activeLabel);
      const values: Record<string, number> = {};
      
      e.activePayload.forEach((payload: any) => {
        values[payload.dataKey] = payload.value;
      });
      
      setHoveredPoint({ timestamp, values });
    }
  };

  // Chart mouse leave handler
  const handleChartMouseLeave = () => {
    setHoveredPoint(undefined);
  };

  // Format X-axis tick
  const formatXAxisTick = (timestamp: number) => {
    return formatTimeForDisplay(new Date(timestamp), timePrecision);
  };

  // Calculate Y-axis domain
  const calculateYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100];
    
    let min = Infinity;
    let max = -Infinity;
    
    series.forEach(s => {
      if (s.visible === false) return;
      
      s.data.forEach(point => {
        min = Math.min(min, point.value);
        max = Math.max(max, point.value);
      });
    });
    
    // Adjust min/max to provide padding
    const padding = (max - min) * 0.1;
    return [
      Math.max(0, min - padding), // Don't go below 0 for most metrics
      max + padding
    ];
  };

  // Empty state
  if (!isLoading && !error && series.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AreaChart className="h-16 w-16 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No data to display</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try changing your query or time range.
          </p>
          <Button 
            className="mt-4"
            onClick={refreshData}
          >
            Load sample data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <CardTitle className="inline-flex items-center">
              {title}
              {isRefreshing && (
                <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
              )}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={timePrecision}
              onValueChange={setTimePrecision}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Precision" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRECISION.map(precision => (
                  <SelectItem key={precision.value} value={precision.value}>
                    {precision.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={zoomMode ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setZoomMode(!zoomMode);
                      setPanMode(false);
                    }}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {zoomMode ? "Disable zoom" : "Enable zoom"}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={panMode ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPanMode(!panMode);
                      setZoomMode(false);
                    }}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {panMode ? "Disable pan" : "Enable pan"}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={exportChart}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as PNG</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="pt-2">
            <TimeRangeSelector
              selectedRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              onCustomTimeRangeChange={handleCustomTimeRangeChange}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={handleRefreshIntervalChange}
              onRefreshClick={handleRefreshClick}
            />
            
            {timeRange !== 'custom' && (
              <div className="mt-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal">
                  {`Last ${timeRange}`}
                </Badge>
                <span className="mx-2">·</span>
                <span>{formatDuration(endTime.getTime() - startTime.getTime())}</span>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="query" className="pt-2">
            <QueryInput
              query={query}
              onQueryChange={handleQueryChange}
              onQuerySubmit={handleQuerySubmit}
              disabled={isLoading}
            />
          </TabsContent>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-10 text-destructive">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <h3 className="text-lg font-medium">Error loading data</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </div>
        ) : (
          <div 
            className="w-full overflow-hidden" 
            style={{ height: showBrush ? '400px' : '350px' }}
            ref={chartContainerRef}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: showBrush ? 60 : 5 }}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  className="stroke-chart-grid"
                />
                <XAxis
                  dataKey="timestamp"
                  scale="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatXAxisTick}
                  tick={{ fontSize: 12 }}
                  minTickGap={50}
                />
                <YAxis
                  domain={calculateYAxisDomain()}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatValue(value, yAxisUnit)}
                  width={50}
                />
                <Tooltip 
                  content={<CustomTooltip series={series} />}
                  isAnimationActive={false}
                />
                
                {thresholds?.map((threshold, index) => (
                  <ReferenceLine
                    key={`threshold-${index}`}
                    y={threshold.value}
                    stroke={threshold.color}
                    strokeDasharray="3 3"
                    label={{
                      value: threshold.label,
                      position: 'insideTopRight',
                      fill: threshold.color,
                      fontSize: 12,
                    }}
                  />
                ))}
                
                {series
                  .filter(s => s.visible !== false)
                  .map((s) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 1 }}
                      isAnimationActive={false}
                    />
                  ))}
                
                {showBrush && (
                  <Brush
                    dataKey="timestamp"
                    height={30}
                    stroke="#8884d8"
                    tickFormatter={formatXAxisTick}
                    startIndex={Math.max(0, chartData.length - 50)}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 pb-4">
        <ChartLegend
          series={series}
          onToggleSeries={handleToggleSeries}
          selectedPoint={hoveredPoint}
        />
      </CardFooter>
    </Card>
  );
};

export default TimeSeriesChart;
