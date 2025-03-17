
import { subMinutes, subHours, addMinutes } from 'date-fns';

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface TimeSeriesData {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
  visible?: boolean;
  query?: string;
  unit?: string;
}

export interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
}

export function parsePrometheusResponse(response: PrometheusResponse): TimeSeriesData[] {
  if (response.status !== 'success' || !response.data.result.length) {
    return [];
  }

  const colors = ['#3584e4', '#f8e45c', '#95d45b', '#ff7800', '#9c27b0', '#00acc1', '#ff5722', '#607d8b'];
  
  return response.data.result.map((series, index) => {
    // Create a name from the metric labels
    const metricName = series.metric.__name__ || 'unknown';
    const labels = Object.entries(series.metric)
      .filter(([key]) => key !== '__name__')
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');
      
    const name = labels ? `${metricName}{${labels}}` : metricName;
    
    // Convert values to data points
    const data = series.values.map(([timestamp, value]) => ({
      timestamp: new Date(timestamp * 1000),
      value: parseFloat(value),
    }));
    
    return {
      id: `series-${index}`,
      name,
      color: colors[index % colors.length],
      data,
      visible: true,
    };
  });
}

export function generateMockTimeSeriesData(
  seriesCount = 3,
  pointCount = 100,
  timeRange = '1h'
): TimeSeriesData[] {
  const now = new Date();
  const series: TimeSeriesData[] = [];
  const colors = ['#3584e4', '#f8e45c', '#95d45b', '#ff7800', '#9c27b0'];
  
  let startTime: Date;
  let interval: number;
  
  // Set time parameters based on the range
  if (timeRange.endsWith('m')) {
    const minutes = parseInt(timeRange.replace('m', ''));
    startTime = subMinutes(now, minutes);
    interval = (minutes * 60 * 1000) / pointCount;
  } else if (timeRange.endsWith('h')) {
    const hours = parseInt(timeRange.replace('h', ''));
    startTime = subHours(now, hours);
    interval = (hours * 60 * 60 * 1000) / pointCount;
  } else {
    // Default to 1h
    startTime = subHours(now, 1);
    interval = (60 * 60 * 1000) / pointCount;
  }
  
  // Generate series
  for (let i = 0; i < seriesCount; i++) {
    const data: DataPoint[] = [];
    const baseValue = Math.random() * 100;
    const variance = Math.random() * 30;
    const trend = Math.random() * 0.1 - 0.05; // Slight up or down trend
    const noise = Math.random() * 0.5;
    const pattern = Math.random() > 0.5 ? 'sine' : 'random';
    
    let currentTime = new Date(startTime);
    
    for (let j = 0; j < pointCount; j++) {
      const timeProgress = j / pointCount;
      let value = baseValue + (trend * j);
      
      // Add pattern variation
      if (pattern === 'sine') {
        value += Math.sin(timeProgress * Math.PI * 4) * variance;
      } else {
        value += (Math.random() - 0.5) * variance;
      }
      
      // Add small noise
      value += (Math.random() - 0.5) * noise * baseValue;
      
      // Ensure we don't go below zero for metrics
      value = Math.max(0, value);
      
      data.push({
        timestamp: currentTime,
        value: Number(value.toFixed(2)),
      });
      
      currentTime = addMinutes(currentTime, interval / (60 * 1000));
    }
    
    // Generate series name like Prometheus metrics
    const metricTypes = ['http_requests_total', 'memory_usage', 'cpu_usage', 'disk_io', 'network_traffic'];
    const metricType = metricTypes[i % metricTypes.length];
    const labels = ['service="api"', 'instance="server-01"', 'job="prometheus"', 'env="production"'];
    
    series.push({
      id: `series-${i}`,
      name: `${metricType}{${labels.slice(0, 2).join(', ')}}`,
      color: colors[i % colors.length],
      data,
      visible: true,
      query: `${metricType}{${labels.slice(0, 2).join(', ')}}`,
      unit: i === 0 ? 'req/s' : i === 1 ? 'MB' : i === 2 ? '%' : '',
    });
  }
  
  return series;
}

export function formatValue(value: number, unit?: string): string {
  if (value === undefined || value === null) return 'N/A';
  
  // Format with appropriate precision
  let formattedValue: string;
  if (Math.abs(value) >= 1000) {
    formattedValue = value.toFixed(0);
  } else if (Math.abs(value) >= 100) {
    formattedValue = value.toFixed(1);
  } else if (Math.abs(value) >= 10) {
    formattedValue = value.toFixed(2);
  } else {
    formattedValue = value.toFixed(3);
  }
  
  // Remove trailing zeros after decimal
  formattedValue = formattedValue.replace(/\.0+$/, '');
  formattedValue = formattedValue.replace(/(\.\d*?)0+$/, '$1');
  
  // Add unit if provided
  return unit ? `${formattedValue} ${unit}` : formattedValue;
}
