
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Brush,
  Legend,
  Scatter,
  ScatterChart,
  Cross,
  ZAxis,
} from 'recharts';
import { 
  AreaChart, 
  LineChart as LineChartIcon,
  ZoomIn, 
  ZoomOut, 
  Move, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Loader2,
  Crosshair,
  Plus,
  Minus,
  TrendingUp,
  MousePointer,
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
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

// Enhanced tooltip with more details and styling
const CustomTooltip = ({ active, payload, label, series }: any) => {
  if (active && payload && payload.length) {
    const timestamp = new Date(label);
    
    return (
      <div className="custom-tooltip glass-panel p-3 text-sm shadow-lg border border-border/40 rounded-lg bg-popover/95 backdrop-blur-sm max-w-xs">
        <div className="font-medium mb-2 pb-1 border-b border-border/50">
          {formatAbsoluteTime(timestamp)}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const seriesData = series.find((s: TimeSeriesData) => s.id === entry.dataKey);
            if (!seriesData || seriesData.visible === false) return null;
            
            // Calculate percentage relative to the range
            const min = entry.payload.min || 0;
            const max = entry.payload.max || 100;
            const range = max - min;
            const percentage = range > 0 ? ((entry.value - min) / range * 100).toFixed(1) + '%' : 'N/A';
            
            return (
              <div key={index} className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="max-w-[150px] truncate mr-2">{seriesData?.name}</span>
                <span className="font-medium">
                  {formatValue(entry.value, seriesData?.unit)}
                </span>
                <span className="text-xs ml-2 text-muted-foreground">
                  ({percentage})
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

// Marker component for highlighting specific data points
const DataPointMarker = ({ data, selectedPoint, onClick }: { 
  data: ChartData[]; 
  selectedPoint?: { timestamp: Date; seriesId: string }; 
  onClick: (timestamp: Date, seriesId: string) => void;
}) => {
  if (!data.length) return null;
  
  const markers = [];
  
  for (const point of data) {
    for (const key in point) {
      if (key !== 'timestamp' && typeof point[key] === 'number') {
        const isSelected = selectedPoint && 
          selectedPoint.timestamp.getTime() === point.timestamp.getTime() && 
          selectedPoint.seriesId === key;
        
        markers.push({
          x: point.timestamp.getTime(),
          y: point[key],
          seriesId: key,
          isSelected,
        });
      }
    }
  }
  
  return (
    <ScatterChart width={0} height={0}>
      <ZAxis range={[0, 0]} />
      <Scatter
        data={markers}
        shape={(props: any) => {
          const { cx, cy, seriesId, isSelected } = props.payload;
          
          if (isSelected) {
            return (
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="white"
                stroke={props.fill}
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => onClick(new Date(props.payload.x), seriesId)}
              />
            );
          }
          
          return (
            <circle
              cx={cx}
              cy={cy}
              r={4}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onClick(new Date(props.payload.x), seriesId)}
            />
          );
        }}
      />
    </ScatterChart>
  );
};

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title = '时间序列图表',
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
  const [brushMode, setBrushMode] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    timestamp: Date;
    seriesId: string;
  } | undefined>(undefined);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [crosshairActive, setCrosshairActive] = useState(false);
  
  // State for zoom and brush
  const [zoomArea, setZoomArea] = useState<{
    x1: number | null;
    x2: number | null;
  }>({ x1: null, x2: null });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number] | undefined>(undefined);

  // State for annotations
  const [annotations, setAnnotations] = useState<Array<{
    timestamp: Date;
    text: string;
    color: string;
  }>>([]);
  
  // Refs
  const refreshTimerRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Handle time range changes
  const handleTimeRangeChange = useCallback((newRange: string) => {
    setTimeRange(newRange);
    const [start, end] = getTimeRangeFromValue(newRange);
    setStartTime(start);
    setEndTime(end);
    
    // Reset zoom when changing time range
    setZoomLevel(1);
    setYAxisDomain(undefined);
    
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  }, [onTimeRangeChange]);

  // Handle custom time range changes
  const handleCustomTimeRangeChange = useCallback((start: Date, end: Date) => {
    setStartTime(start);
    setEndTime(end);
    setTimeRange('custom');
    
    // Reset zoom when changing time range
    setZoomLevel(1);
    setYAxisDomain(undefined);
    
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
        title: "数据已刷新",
        description: `查询: ${query}`,
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
        title: "查询已执行",
        description: `执行: ${submittedQuery}`,
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

  // Handle data point click
  const handleDataPointClick = useCallback((timestamp: Date, seriesId: string) => {
    setSelectedPoint(prev => 
      prev?.timestamp.getTime() === timestamp.getTime() && prev.seriesId === seriesId
        ? undefined // Deselect if same point
        : { timestamp, seriesId }
    );
    
    // Find the series and specific data point
    const series = chartData.find(d => d.timestamp.getTime() === timestamp.getTime());
    
    if (series) {
      const value = series[seriesId];
      
      toast({
        title: "数据点选择",
        description: `${formatAbsoluteTime(timestamp)}: ${formatValue(value, yAxisUnit)}`,
      });
    }
  }, [chartData, yAxisUnit]);

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
      
      // Add min/max for percentage calculation in tooltip
      if (newChartData.length > 0) {
        // Find min/max for each series
        const seriesMinMax: Record<string, { min: number; max: number }> = {};
        
        visibleSeries.forEach(s => {
          const values = s.data.map(p => p.value);
          seriesMinMax[s.id] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
        });
        
        // Add to each chart data point
        newChartData.forEach(point => {
          for (const seriesId in seriesMinMax) {
            if (point[seriesId] !== undefined) {
              point[`${seriesId}_min`] = seriesMinMax[seriesId].min;
              point[`${seriesId}_max`] = seriesMinMax[seriesId].max;
            }
          }
        });
      }
      
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
            
            toast({
              title: "导出成功",
              description: "图表已导出为PNG文件",
            });
          }
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (err) {
        console.error('Failed to export chart:', err);
        toast({
          title: "导出失败",
          description: "无法将图表导出为PNG",
          variant: "destructive",
        });
      }
    }
  }, []);

  // Export data as CSV
  const exportData = useCallback(() => {
    if (chartData.length === 0) return;
    
    try {
      // Build CSV header
      const seriesIds = series
        .filter(s => s.visible !== false)
        .map(s => s.id);
      
      const headers = ['timestamp', ...seriesIds];
      const csvRows = [headers.join(',')];
      
      // Add data rows
      chartData.forEach(point => {
        const timestamp = formatAbsoluteTime(point.timestamp);
        const values = seriesIds.map(id => point[id] !== undefined ? point[id] : '');
        
        csvRows.push([timestamp, ...values].join(','));
      });
      
      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.setAttribute('href', url);
      a.setAttribute('download', `chart-data-${new Date().toISOString().slice(0, 19)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "数据导出成功",
        description: "CSV文件已下载",
      });
    } catch (err) {
      console.error('Failed to export data:', err);
      toast({
        title: "数据导出失败",
        description: "无法导出数据",
        variant: "destructive",
      });
    }
  }, [chartData, series]);

  // Chart mouse move handler for tooltip and crosshair
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

  // Handle zoom in/out buttons
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 1));
    
    // Reset to default domain if zoomed all the way out
    if (zoomLevel <= 1.3) {
      setYAxisDomain(undefined);
    }
  };

  // Handle brush end (area selection)
  const handleBrushEnd = ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
    if (startIndex === endIndex || chartData.length === 0) return;
    
    // Get the time range from the selected indices
    const start = chartData[startIndex].timestamp;
    const end = chartData[endIndex].timestamp;
    
    // Update time range
    handleCustomTimeRangeChange(start, end);
    
    toast({
      title: "时间范围已更新",
      description: `${formatAbsoluteTime(start)} - ${formatAbsoluteTime(end)}`,
    });
  };

  // Handle mouse down for area selection in brushMode
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!brushMode || !chartContainerRef.current) return;
    
    const chartRect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - chartRect.left;
    
    dragStartRef.current = { x, y: 0 };
    setZoomArea({ x1: x, x2: null });
  };

  // Handle mouse move for area selection in brushMode
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Update last mouse position for crosshair
    if (chartContainerRef.current) {
      const chartRect = chartContainerRef.current.getBoundingClientRect();
      lastMousePosRef.current = { 
        x: e.clientX - chartRect.left, 
        y: e.clientY - chartRect.top 
      };
    }
    
    // Handle brush area selection
    if (!brushMode || !dragStartRef.current || !chartContainerRef.current) return;
    
    const chartRect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - chartRect.left;
    
    setZoomArea({ x1: dragStartRef.current.x, x2: x });
  };

  // Handle mouse up for area selection in brushMode
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!brushMode || !dragStartRef.current || !chartContainerRef.current || !zoomArea.x1 || !zoomArea.x2) {
      dragStartRef.current = null;
      setZoomArea({ x1: null, x2: null });
      return;
    }
    
    // Convert pixel positions to data indices
    const chartWidth = chartContainerRef.current.clientWidth;
    const dataLength = chartData.length;
    
    if (dataLength === 0) {
      dragStartRef.current = null;
      setZoomArea({ x1: null, x2: null });
      return;
    }
    
    // Ensure x1 < x2
    const [xMin, xMax] = [
      Math.min(zoomArea.x1, zoomArea.x2!),
      Math.max(zoomArea.x1, zoomArea.x2!)
    ];
    
    // Convert x positions to time range
    const xToTimeRatio = dataLength / chartWidth;
    const startIndex = Math.max(0, Math.floor(xMin * xToTimeRatio));
    const endIndex = Math.min(dataLength - 1, Math.ceil(xMax * xToTimeRatio));
    
    if (startIndex !== endIndex) {
      const start = chartData[startIndex].timestamp;
      const end = chartData[endIndex].timestamp;
      
      // Update time range
      handleCustomTimeRangeChange(start, end);
      
      toast({
        title: "已选择时间范围",
        description: `${formatAbsoluteTime(start)} - ${formatAbsoluteTime(end)}`,
      });
    }
    
    dragStartRef.current = null;
    setZoomArea({ x1: null, x2: null });
  };

  // Format X-axis tick
  const formatXAxisTick = (timestamp: number) => {
    return formatTimeForDisplay(new Date(timestamp), timePrecision);
  };

  // Calculate Y-axis domain
  const calculateYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100];
    
    // If yAxisDomain is set, use it
    if (yAxisDomain) return yAxisDomain;
    
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

  // Get cursor style based on active mode
  const getCursorStyle = () => {
    if (panMode) return 'grab';
    if (zoomMode) return 'zoom-in';
    if (brushMode) return 'crosshair';
    return 'default';
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
          <h3 className="text-lg font-medium">暂无数据显示</h3>
          <p className="text-sm text-muted-foreground mt-1">
            尝试更改您的查询或时间范围。
          </p>
          <Button 
            className="mt-4"
            onClick={refreshData}
          >
            加载示例数据
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render chart based on type
  const renderChart = () => {
    const domain = calculateYAxisDomain();
    const ChartComponent = chartType === 'line' ? LineChart : RechartsAreaChart;
    
    return (
      <ChartComponent
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
          domain={domain}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => formatValue(value, yAxisUnit)}
          width={50}
        />
        <Tooltip 
          content={<CustomTooltip series={series} />}
          isAnimationActive={false}
          cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '5 5' }}
        />
        
        {/* Reference lines for thresholds */}
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
        
        {/* Reference areas for selected time windows */}
        {zoomArea.x1 !== null && zoomArea.x2 !== null && (
          <ReferenceArea
            x1={chartData[0]?.timestamp.getTime()}
            x2={chartData[chartData.length - 1]?.timestamp.getTime()}
            y1={domain[0]}
            y2={domain[1]}
            fillOpacity={0.15}
            stroke="#8884d8"
          />
        )}
        
        {/* Draw series based on chart type */}
        {series
          .filter(s => s.visible !== false)
          .map((s) => {
            return chartType === 'line' ? (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: s.color,
                  strokeWidth: 2,
                  fill: 'white',
                  onClick: (data: any) => {
                    handleDataPointClick(new Date(data.payload.timestamp), s.id);
                  }
                }}
                isAnimationActive={false}
              />
            ) : (
              <Area
                key={s.id}
                type="monotone"
                dataKey={s.id}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.2}
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: s.color,
                  strokeWidth: 2,
                  fill: 'white',
                  onClick: (data: any) => {
                    handleDataPointClick(new Date(data.payload.timestamp), s.id);
                  }
                }}
                isAnimationActive={false}
              />
            );
          })}
        
        {/* Data point markers for selection */}
        <DataPointMarker 
          data={chartData} 
          selectedPoint={selectedPoint}
          onClick={handleDataPointClick}
        />
        
        {showBrush && (
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#8884d8"
            tickFormatter={formatXAxisTick}
            startIndex={Math.max(0, chartData.length - 50)}
            onChange={handleBrushEnd}
          />
        )}
      </ChartComponent>
    );
  };

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
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart type selector */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={chartType === 'line' ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setChartType('line')}
                  >
                    <LineChartIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>线图</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={chartType === 'area' ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setChartType('area')}
                  >
                    <AreaChart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>面积图</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <div className="h-8 border-l mx-1 border-border"></div>
            
            {/* Time precision selector */}
            <Select
              value={timePrecision}
              onValueChange={setTimePrecision}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="时间精度" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRECISION.map(precision => (
                  <SelectItem key={precision.value} value={precision.value}>
                    {precision.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="h-8 border-l mx-1 border-border"></div>
            
            {/* Interaction mode buttons */}
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
                      setBrushMode(false);
                      setCrosshairActive(false);
                    }}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {zoomMode ? "禁用缩放" : "启用缩放"}
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
                      setBrushMode(false);
                      setCrosshairActive(false);
                    }}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {panMode ? "禁用平移" : "启用平移"}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={brushMode ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setBrushMode(!brushMode);
                      setZoomMode(false);
                      setPanMode(false);
                      setCrosshairActive(false);
                    }}
                  >
                    <MousePointer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {brushMode ? "禁用选择" : "启用区域选择"}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={crosshairActive ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setCrosshairActive(!crosshairActive);
                      setZoomMode(false);
                      setPanMode(false);
                      setBrushMode(false);
                    }}
                  >
                    <Crosshair className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {crosshairActive ? "禁用十字光标" : "启用十字光标"}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <div className="h-8 border-l mx-1 border-border"></div>
            
            {/* Zoom level controls */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>放大</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>缩小</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <div className="h-8 border-l mx-1 border-border"></div>
            
            {/* Export buttons */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={exportChart}>导出为PNG</Button>
                  <Button size="sm" onClick={exportData}>导出数据</Button>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
        
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="chart">图表</TabsTrigger>
            <TabsTrigger value="query">查询</TabsTrigger>
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
                  {`最近 ${timeRange}`}
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
            <h3 className="text-lg font-medium">加载数据时出错</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">正在加载数据...</p>
          </div>
        ) : (
          <div 
            className="w-full overflow-hidden relative" 
            style={{ 
              height: showBrush ? '400px' : '350px',
              cursor: getCursorStyle()
            }}
            ref={chartContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              dragStartRef.current = null;
              setZoomArea({ x1: null, x2: null });
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
            
            {/* Area selection overlay */}
            {zoomArea.x1 !== null && zoomArea.x2 !== null && (
              <div 
                className="absolute top-0 bottom-0 bg-primary/10 border border-primary/40"
                style={{
                  left: Math.min(zoomArea.x1, zoomArea.x2),
                  width: Math.abs(zoomArea.x1 - zoomArea.x2),
                  pointerEvents: 'none'
                }}
              ></div>
            )}
            
            {/* Crosshair overlay */}
            {crosshairActive && lastMousePosRef.current && (
              <>
                <div
                  className="absolute top-0 bottom-0 border-l border-secondary-foreground/50 pointer-events-none"
                  style={{ left: lastMousePosRef.current.x }}
                ></div>
                <div
                  className="absolute left-0 right-0 border-t border-secondary-foreground/50 pointer-events-none"
                  style={{ top: lastMousePosRef.current.y }}
                ></div>
              </>
            )}
            
            {/* Zoom level indicator */}
            {zoomLevel > 1 && (
              <div className="absolute top-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded text-xs">
                缩放: {zoomLevel.toFixed(1)}x
              </div>
            )}
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
