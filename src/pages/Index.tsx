
import React, { useState } from 'react';
import TimeSeriesChart from '@/components/time-series-chart/TimeSeriesChart';
import { generateMockTimeSeriesData } from '@/components/time-series-chart/utils/data-utils';

const Index = () => {
  const [showError, setShowError] = useState(false);
  
  // Generate some example data
  const mockData = generateMockTimeSeriesData(3, 100, '1h');
  
  // Example thresholds
  const thresholds = [
    { value: 80, label: 'High', color: '#ff5555' },
    { value: 30, label: 'Low', color: '#5555ff' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-5 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-medium tracking-tight">
            Prometheus-Style Time Series Chart
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive time series visualization component for monitoring dashboards
          </p>
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8">
          <section className="grid grid-cols-1 gap-6">
            <h2 className="text-xl font-medium">Basic Example</h2>
            <div className="w-full">
              <TimeSeriesChart 
                title="HTTP Requests"
                description="Total HTTP requests per second"
                initialQuery="http_requests_total"
                initialTimeRange="1h"
                initialData={mockData}
                yAxisUnit="req/s"
              />
            </div>
          </section>
          
          <section className="grid grid-cols-1 gap-6">
            <h2 className="text-xl font-medium">With Thresholds</h2>
            <div className="w-full">
              <TimeSeriesChart 
                title="Server CPU Usage"
                description="CPU utilization percentage by server"
                initialQuery="avg by(instance) (rate(cpu_usage[5m]))"
                initialTimeRange="3h"
                thresholds={thresholds}
                yAxisUnit="%"
              />
            </div>
          </section>
          
          <section className="grid grid-cols-1 gap-6">
            <h2 className="text-xl font-medium">Loading & Error States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TimeSeriesChart 
                title="Loading Example"
                description="Demonstrates the loading state"
                initialQuery="memory_usage"
                initialTimeRange="15m"
                isLoading={true}
              />
              
              <TimeSeriesChart 
                title="Error Example"
                description="Demonstrates the error state"
                initialQuery="error_query{invalid=true}"
                initialTimeRange="30m"
                error="Query failed: invalid query parameters"
              />
            </div>
          </section>
          
          <section className="mt-4 p-6 border border-border rounded-lg bg-muted/20">
            <h2 className="text-xl font-medium mb-4">Component Documentation</h2>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Props API</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium">Prop</th>
                    <th className="text-left py-2 px-4 font-medium">Type</th>
                    <th className="text-left py-2 px-4 font-medium">Default</th>
                    <th className="text-left py-2 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">title</td>
                    <td className="py-2 px-4 text-sm">string</td>
                    <td className="py-2 px-4 text-sm">'Time Series Chart'</td>
                    <td className="py-2 px-4 text-sm">The title of the chart</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">description</td>
                    <td className="py-2 px-4 text-sm">string</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Optional description text</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">initialQuery</td>
                    <td className="py-2 px-4 text-sm">string</td>
                    <td className="py-2 px-4 text-sm">'http_requests_total'</td>
                    <td className="py-2 px-4 text-sm">Initial PromQL query</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">initialTimeRange</td>
                    <td className="py-2 px-4 text-sm">string</td>
                    <td className="py-2 px-4 text-sm">'1h'</td>
                    <td className="py-2 px-4 text-sm">Initial time range (e.g., '5m', '1h', '1d')</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">initialData</td>
                    <td className="py-2 px-4 text-sm">TimeSeriesData[]</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Initial data series to display</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">onQueryChange</td>
                    <td className="py-2 px-4 text-sm">function</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Callback when query changes</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">onTimeRangeChange</td>
                    <td className="py-2 px-4 text-sm">function</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Callback when time range changes</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">thresholds</td>
                    <td className="py-2 px-4 text-sm">object[]</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Threshold lines to display on chart</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">isLoading</td>
                    <td className="py-2 px-4 text-sm">boolean</td>
                    <td className="py-2 px-4 text-sm">false</td>
                    <td className="py-2 px-4 text-sm">Whether data is loading</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">error</td>
                    <td className="py-2 px-4 text-sm">string | null</td>
                    <td className="py-2 px-4 text-sm">null</td>
                    <td className="py-2 px-4 text-sm">Error message, if any</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">yAxisUnit</td>
                    <td className="py-2 px-4 text-sm">string</td>
                    <td className="py-2 px-4 text-sm">undefined</td>
                    <td className="py-2 px-4 text-sm">Unit for y-axis values</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 px-4 font-mono text-sm">showBrush</td>
                    <td className="py-2 px-4 text-sm">boolean</td>
                    <td className="py-2 px-4 text-sm">true</td>
                    <td className="py-2 px-4 text-sm">Whether to show the brush navigator</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Integration Example</h3>
            <pre className="p-4 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap">
{`import TimeSeriesChart from '@/components/time-series-chart/TimeSeriesChart';

const MyDashboard = () => {
  return (
    <div className="dashboard-container">
      <TimeSeriesChart 
        title="API Request Latency"
        description="Average request latency over time"
        initialQuery="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
        initialTimeRange="1h"
        yAxisUnit="ms"
        onTimeRangeChange={(start, end) => {
          console.log('Time range changed:', start, end);
        }}
        onQueryChange={(query) => {
          console.log('Query changed:', query);
        }}
      />
    </div>
  );
};`}
            </pre>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Data Format</h3>
            <pre className="p-4 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap">
{`// TimeSeriesData structure
interface TimeSeriesData {
  id: string;        // Unique identifier for the series
  name: string;      // Display name
  color: string;     // Line color (hex code)
  data: {
    timestamp: Date; // X-axis timestamp
    value: number;   // Y-axis value
  }[];
  visible?: boolean; // Whether the series is visible
  query?: string;    // The query that generated this series
  unit?: string;     // Unit for values in this series
}`}
            </pre>
          </section>
        </div>
      </main>
      
      <footer className="border-t border-border/40 mt-10 px-6 py-10 text-center text-sm text-muted-foreground">
        <p>Prometheus-Style Time Series Chart Component</p>
        <p className="mt-1">A modern, responsive time series visualization for React applications</p>
      </footer>
    </div>
  );
};

export default Index;
