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
  Area,
  ComposedChart,
} from 'recharts';
import { 
  AreaChart as AreaChartIcon, 
  LineChart as LineChartIcon,
  ZoomIn, 
  ZoomOut, 
  Move, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Loader2,
  Crosshair,
  PanelTop,
  Maximize,
  PanelBottomClose,
  Eye,
  EyeOff,
  Ruler,
  BarChart,
  TrendingUp,
  Focus
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';

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
    const visiblePayload = payload.filter((entry: any) => {
      const seriesData = series.find((s: TimeSeriesData) => s.id === entry.dataKey);
      return seriesData && seriesData.visible !== false;
    });
    
    if (visiblePayload.length === 0) return null;
    
    return (
      <div className="custom-tooltip glass-panel p-3 text-sm shadow-lg max-w-xs">
        <div className="font-medium mb-2 border-b pb-1.5">
          {formatAbsoluteTime(timestamp)}
        </div>
        <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
          {visiblePayload.map((entry: any, index: number) => {
            const seriesData = series.find((s: TimeSeriesData) => s.id === entry.dataKey);
            if (!seriesData || seriesData.visible === false) return null;
            
            return (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center max-w-[70%]">
                  <span
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate" title={seriesData?.name}>{seriesData?.name}</span>
                </div>
                <span className="font-medium tabular-nums">
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

const ActiveDot = (props: any) => {
  const { cx, cy, stroke, dataKey } = props;
  
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#fff" opacity={0.4} />
      <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="#fff" strokeWidth={2} />
    </g>
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
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [startTime, setStartTime] = useState<Date>(new Date(Date.now() - 3600000));
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [timePrecision, setTimePrecision] = useState('second');
  
  const [query, setQuery] = useState(initialQuery);
  
  const [series, setSeries] = useState<TimeSeriesData[]>(initialData || []);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{
    timestamp: Date;
    values: Record<string, number>;
  } | undefined>(undefined);
  
  const [zoomMode, setZoomMode] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [brushMode, setBrushMode] = useState(false);
  const [crosshairMode, setCrosshairMode] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{start?: number, end?: number}>({});
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number] | undefined>(undefined);
  const [yAxisScale, setYAxisScale] = useState(100);

  const refreshTimerRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const interactionModeRef = useRef<'zoom' | 'pan' | 'brush' | null>(null);
  const chartRef = useRef<any>(null);

  const handleTimeRangeChange = useCallback((newRange: string) => {
    setTimeRange(newRange);
    const [start, end] = getTimeRangeFromValue(newRange);
    setStartTime(start);
    setEndTime(end);
    
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  }, [onTimeRangeChange]);

  const handleCustomTimeRangeChange = useCallback((start: Date, end: Date) => {
    setStartTime(start);
    setEndTime(end);
    setTimeRange('custom');
    
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  }, [onTimeRangeChange]);

  const handleRefreshIntervalChange = useCallback((interval: number) => {
    setRefreshInterval(interval);
    
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    if (interval > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        refreshData();
      }, interval * 1000);
    }
  }, []);

  const handleRefreshClick = useCallback(() => {
    refreshData();
  }, []);

  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    
    if (timeRange !== 'custom') {
      const now = new Date();
      const [newStart] = getTimeRangeFromValue(timeRange);
      setStartTime(newStart);
      setEndTime(now);
      
      if (onTimeRangeChange) {
        onTimeRangeChange(newStart, now);
      }
    }
    
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

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    if (onQueryChange) {
      onQueryChange(newQuery);
    }
  }, [onQueryChange]);

  const handleQuerySubmit = useCallback((submittedQuery: string) => {
    setIsRefreshing(true);
    
    setTimeout(() => {
      const mockData = generateMockTimeSeriesData(
        Math.floor(Math.random() * 2) + 2,
        100,
        timeRange
      );
      setSeries(mockData);
      setIsRefreshing(false);
      
      toast({
        title: "查询已执行",
        description: `已执行: ${submittedQuery}`,
      });
    }, 700);
  }, [timeRange]);

  const handleToggleSeries = useCallback((id: string) => {
    setSeries(prevSeries => 
      prevSeries.map(s => 
        s.id === id 
          ? { ...s, visible: s.visible === false ? true : false } 
          : s
      )
    );
  }, []);

  useEffect(() => {
    if (series.length > 0) {
      const visibleSeries = series.filter(s => s.visible !== false);
      
      const timestampMap = new Map<number, ChartData>();
      
      visibleSeries.forEach(s => {
        s.data.forEach(point => {
          const timestamp = point.timestamp.getTime();
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {
              timestamp: point.timestamp,
            });
          }
          
          const entry = timestampMap.get(timestamp)!;
          entry[s.id] = point.value;
        });
      });
      
      const newChartData = Array.from(timestampMap.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setChartData(newChartData);
    } else {
      setChartData([]);
    }
  }, [series]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialData && series.length === 0 && !isLoading) {
      refreshData();
    }
  }, []);

  useEffect(() => {
    if (zoomMode) {
      interactionModeRef.current = 'zoom';
      setPanMode(false);
      setBrushMode(false);
    } else if (panMode) {
      interactionModeRef.current = 'pan';
      setZoomMode(false);
      setBrushMode(false);
    } else if (brushMode) {
      interactionModeRef.current = 'brush';
      setZoomMode(false);
      setPanMode(false);
    } else {
      interactionModeRef.current = null;
    }
  }, [zoomMode, panMode, brushMode]);

  const handleBrushChange = (brushData: any) => {
    if (!brushData || !brushData.startIndex || !brushData.endIndex) return;
    
    if (brushData.startIndex === brushData.endIndex) {
      setSelectedArea({});
      return;
    }
    
    setSelectedArea({
      start: brushData.startIndex,
      end: brushData.endIndex
    });
  };

  const handleBrushApply = () => {
    if (!selectedArea.start || !selectedArea.end || selectedArea.start === selectedArea.end) return;
    
    if (chartData.length > 0) {
      const startTime = chartData[selectedArea.start].timestamp;
      const endTime = chartData[selectedArea.end].timestamp;
      
      handleCustomTimeRangeChange(startTime, endTime);
      setSelectedArea({});
      setBrushMode(false);
      
      toast({
        title: "时间范围已更新",
        description: `从 ${formatAbsoluteTime(startTime)} 到 ${formatAbsoluteTime(endTime)}`,
      });
    }
  };

  const handleResetView = () => {
    setYAxisDomain(undefined);
    setYAxisScale(100);
    setBrushMode(false);
    setPanMode(false);
    setZoomMode(false);
    setSelectedArea({});
  };

  const exportChart = useCallback(() => {
    if (chartContainerRef.current) {
      try {
        const svgElement = chartContainerRef.current.querySelector('svg');
        if (!svgElement) return;
        
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = svgElement.clientWidth * 2;
        canvas.height = svgElement.clientHeight * 2;
        
        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
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
        
        toast({
          title: "图表已导出",
          description: "图表已保存为PNG图片",
        });
      } catch (err) {
        console.error('Failed to export chart:', err);
        toast({
          title: "导出失败",
          description: "无法将图表导出为PNG图片",
          variant: "destructive",
        });
      }
    }
  }, []);

  const exportDataCSV = useCallback(() => {
    if (chartData.length === 0 || series.length === 0) {
      toast({
        title: "导出失败",
        description: "没有数据可以导出",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const visibleSeries = series.filter(s => s.visible !== false);
      
      let csvContent = "timestamp," + visibleSeries.map(s => s.name).join(",") + "\n";
      
      chartData.forEach(point => {
        const timestamp = formatAbsoluteTime(point.timestamp);
        const values = visibleSeries.map(s => {
          const value = point[s.id];
          return value !== undefined ? value : "";
        }).join(",");
        
        csvContent += `${timestamp},${values}\n`;
      });
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chart-data-${new Date().toISOString().slice(0, 19)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "数据已导出",
        description: "数据已导出为CSV文件",
      });
    } catch (err) {
      console.error('Failed to export data:', err);
      toast({
        title: "导出失败",
        description: "无法导出数据",
        variant: "destructive",
      });
    }
  }, [chartData, series]);

  const handleChartMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const timestamp = new Date(e.activeLabel);
      const values: Record<string, number> = {};
      
      e.activePayload.forEach((payload: any) => {
        values[payload.dataKey] = payload.value;
      });
      
      setHoveredPoint({ timestamp, values });
      setActivePointIndex(e.activeTooltipIndex);
    }
  };

  const handleChartMouseLeave = () => {
    setHoveredPoint(undefined);
    setActivePointIndex(null);
  };

  const handleChartClick = (e: any) => {
    if (!e || !e.activePayload || e.activePayload.length === 0) return;
    
    const timestamp = new Date(e.activeLabel);
    const values: Record<string, number> = {};
    
    e.activePayload.forEach((payload: any) => {
      values[payload.dataKey] = payload.value;
    });
    
    console.log('Chart clicked:', {
      timestamp: formatAbsoluteTime(timestamp),
      values
    });
  };

  const formatXAxisTick = (timestamp: number) => {
    return formatTimeForDisplay(new Date(timestamp), timePrecision);
  };

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
    
    const padding = (max - min) * 0.1;
    const calculatedDomain: [number, number] = [
      Math.max(0, min - padding),
      max + padding
    ];
    
    if (yAxisScale !== 100) {
      const range = calculatedDomain[1] - calculatedDomain[0];
      const scaleFactor = yAxisScale / 100;
      const newMax = calculatedDomain[0] + (range * scaleFactor);
      return [calculatedDomain[0], newMax];
    }
    
    return calculatedDomain;
  };

  const handleYAxisScaleChange = (value: number[]) => {
    setYAxisScale(value[0]);
  };

  if (!isLoading && !error && series.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AreaChartIcon className="h-16 w-16 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">没有数据可显示</h3>
          <p className="text-sm text-muted-foreground mt-1">
            尝试更改查询或时间范围。
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

  const chartCursor = zoomMode 
    ? 'zoom-in' 
    : panMode 
      ? 'grab' 
      : brushMode 
        ? 'crosshair' 
        : crosshairMode 
          ? 'crosshair' 
          : 'default';

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
            <ToggleGroup type="single" value={chartType} onValueChange={(value) => value && setChartType(value as 'line' | 'area')}>
              <ToggleGroupItem value="line" aria-label="线图">
                <LineChartIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area" aria-label="面积图">
                <AreaChartIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <Select
              value={timePrecision}
              onValueChange={setTimePrecision}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue placeholder="精度" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRECISION.map(precision => (
                  <SelectItem key={precision.value} value={precision.value}>
                    {precision.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-1">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={zoomMode ? "secondary" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setZoomMode(!zoomMode);
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
                      }}
                    >
                      <Focus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {brushMode ? "取消选择" : "选择区域"}
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={crosshairMode ? "secondary" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCrosshairMode(!crosshairMode)}
                    >
                      <Crosshair className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {crosshairMode ? "隐藏十字线" : "显示十字线"}
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
                      onClick={handleResetView}
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重置视图</TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            
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
                <TooltipContent>导出为PNG</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="chart">图表</TabsTrigger>
            <TabsTrigger value="query">查询</TabsTrigger>
            <TabsTrigger value="options">选项</TabsTrigger>
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
          
          <TabsContent value="options" className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Y轴缩放</label>
                <div className="flex items-center space-x-2">
                  <Slider
                    defaultValue={[100]}
                    min={10}
                    max={200}
                    step={10}
                    value={[yAxisScale]}
                    onValueChange={handleYAxisScaleChange}
                  />
                  <span className="w-12 text-sm tabular-nums">{yAxisScale}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">数据导出</label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={exportDataCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出为CSV
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-10 text-destructive">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <h3 className="text-lg font-medium">加载数据出错</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">加载数据中...</p>
          </div>
        ) : (
          <div 
            className="w-full overflow-hidden relative" 
            style={{ 
              height: showBrush ? '400px' : '350px', 
              cursor: chartCursor 
            }}
            ref={chartContainerRef}
          >
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: showBrush ? 60 : 5 }}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                  onClick={handleChartClick}
                  ref={chartRef}
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
                    domain={yAxisDomain || calculateYAxisDomain()}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatValue(value, yAxisUnit)}
                    width={50}
                  />
                  <Tooltip 
                    content={<CustomTooltip series={series} />}
                    isAnimationActive={false}
                    cursor={crosshairMode ? { stroke: '#888', strokeDasharray: '5 5' } : false}
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
                        activeDot={ActiveDot}
                        isAnimationActive={false}
                      />
                    ))}
                  
                  {brushMode && selectedArea.start !== undefined && selectedArea.end !== undefined && (
                    <ReferenceArea 
                      x1={chartData[selectedArea.start]?.timestamp.getTime()} 
                      x2={chartData[selectedArea.end]?.timestamp.getTime()}
                      strokeOpacity={0.3}
                      fill="#8884d8"
                      fillOpacity={0.2}
                    />
                  )}
                  
                  {showBrush && (
                    <Brush
                      dataKey="timestamp"
                      height={30}
                      stroke="#8884d8"
                      tickFormatter={formatXAxisTick}
                      startIndex={Math.max(0, chartData.length - 50)}
                      onChange={handleBrushChange}
                    />
                  )}
                </LineChart>
              ) : (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: showBrush ? 60 : 5 }}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                  onClick={handleChartClick}
                  ref={chartRef}
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
                    domain={yAxisDomain || calculateYAxisDomain()}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatValue(value, yAxisUnit)}
                    width={50}
                  />
                  <Tooltip 
                    content={<CustomTooltip series={series} />}
                    isAnimationActive={false}
                    cursor={crosshairMode ? { stroke: '#888', strokeDasharray: '5 5' } : false}
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
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.3}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={ActiveDot}
                        isAnimationActive={false}
                      />
                    ))}
                  
                  {brushMode && selectedArea.start !== undefined && selectedArea.end !== undefined && (
                    <ReferenceArea 
                      x1={chartData[selectedArea.start]?.timestamp.getTime()} 
                      x2={chartData[selectedArea.end]?.timestamp.getTime()}
                      strokeOpacity={0.3}
                      fill="#8884d8"
                      fillOpacity={0.2}
                    />
                  )}
                  
                  {showBrush && (
                    <Brush
                      dataKey="timestamp"
                      height={30}
                      stroke="#8884d8"
                      tickFormatter={formatXAxisTick}
                      startIndex={Math.max(0, chartData.length - 50)}
                      onChange={handleBrushChange}
                    />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
            
            {brushMode && selectedArea.start !== undefined && selectedArea.end !== undefined && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBrushApply}
                  className="text-xs"
                >
                  应用选择
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedArea({})}
                  className="text-xs"
                >
                  取消选择
                </Button>
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
