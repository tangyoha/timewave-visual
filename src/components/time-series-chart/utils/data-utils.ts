
import { subMinutes, subHours, addMinutes } from 'date-fns';

export interface DataPoint {
  timestamp: Date;
  value: number;
  anomaly?: boolean;
  annotated?: boolean;
  annotation?: string;
}

export interface TimeSeriesData {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
  visible?: boolean;
  query?: string;
  unit?: string;
  aggregation?: string;
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

// Function to detect anomalies in time series data
export function detectAnomalies(data: DataPoint[], sensitivityFactor: number = 2): DataPoint[] {
  if (!data || data.length < 5) return data;
  
  // Calculate rolling mean and standard deviation
  const values = data.map(p => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  // Calculate standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  // Mark anomalies
  return data.map(point => {
    const zScore = Math.abs((point.value - mean) / stdDev);
    return {
      ...point,
      anomaly: zScore > sensitivityFactor
    };
  });
}

// Function to generate a smooth trend line from data points
export function generateTrendLine(data: DataPoint[]): DataPoint[] {
  if (!data || data.length < 3) return [];

  // Simple linear regression for trend
  const n = data.length;
  const timestamps = data.map((p, i) => i); // Use index as x for simplicity
  const values = data.map(p => p.value);
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += timestamps[i];
    sumY += values[i];
    sumXY += timestamps[i] * values[i];
    sumXX += timestamps[i] * timestamps[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate trend line data points
  return data.map((point, i) => ({
    timestamp: point.timestamp,
    value: intercept + slope * i
  }));
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
      
      // Add occasional anomalies (1% chance)
      const isAnomaly = Math.random() < 0.01;
      if (isAnomaly) {
        value = value * (Math.random() > 0.5 ? 2 : 0.3); // Either spike or drop
      }
      
      // Add occasional annotations (0.5% chance)
      const isAnnotated = Math.random() < 0.005;
      let annotation;
      if (isAnnotated) {
        const events = ["系统部署", "配置更改", "服务重启", "网络波动", "负载测试"];
        annotation = events[Math.floor(Math.random() * events.length)];
      }
      
      data.push({
        timestamp: currentTime,
        value: Number(value.toFixed(2)),
        anomaly: isAnomaly,
        annotated: isAnnotated,
        annotation: annotation
      });
      
      currentTime = addMinutes(currentTime, interval / (60 * 1000));
    }
    
    // Generate series name like Prometheus metrics
    const metricTypes = ['http_requests_total', 'memory_usage', 'cpu_usage', 'disk_io', 'network_traffic'];
    const metricType = metricTypes[i % metricTypes.length];
    const labels = ['service="api"', 'instance="server-01"', 'job="prometheus"', 'env="production"'];
    const aggregations = ['avg', 'sum', 'max', 'min', 'rate'];
    
    // Add anomaly detection
    const processedData = Math.random() > 0.7 ? detectAnomalies(data) : data;
    
    series.push({
      id: `series-${i}`,
      name: `${metricType}{${labels.slice(0, 2).join(', ')}}`,
      color: colors[i % colors.length],
      data: processedData,
      visible: true,
      query: `${aggregations[i % aggregations.length]}(${metricType}{${labels.slice(0, 2).join(', ')}})`,
      unit: i === 0 ? 'req/s' : i === 1 ? 'MB' : i === 2 ? '%' : '',
      aggregation: aggregations[i % aggregations.length],
    });
  }
  
  return series;
}

export function formatValue(value: number, unit?: string): string {
  if (value === undefined || value === null) return 'N/A';
  
  // Format bytes with appropriate units if the unit is byte-related
  if (unit === 'B' || unit === 'bytes') {
    return formatBytes(value);
  }
  
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

// Helper function to format bytes to human-readable form
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
