
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Clock, ArrowRight } from 'lucide-react';

interface QueryInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: (query: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface QueryHistory {
  query: string;
  timestamp: Date;
}

// This would ideally be stored in localStorage in a real implementation
const SAMPLE_QUERY_HISTORY: QueryHistory[] = [
  { query: 'http_requests_total{status="200"}', timestamp: new Date(Date.now() - 3600000) },
  { query: 'rate(http_requests_total[5m])', timestamp: new Date(Date.now() - 7200000) },
  { query: 'sum(rate(node_cpu{mode!="idle"}[1m])) by (instance)', timestamp: new Date(Date.now() - 14400000) },
  { query: 'memory_usage{instance="server-01"}', timestamp: new Date(Date.now() - 28800000) },
];

// Sample query suggestions for auto-complete
const QUERY_SUGGESTIONS = [
  'rate(http_requests_total[5m])',
  'sum by(status_code) (rate(http_requests_total[5m]))',
  'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',
  'memory_usage',
  'cpu_usage{instance="server-01"}',
  'node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100',
];

const QueryInput: React.FC<QueryInputProps> = ({
  query,
  onQueryChange,
  onQuerySubmit,
  className,
  placeholder = 'Enter PromQL query...',
  disabled = false,
}) => {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>(SAMPLE_QUERY_HISTORY);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>(QUERY_SUGGESTIONS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (query) {
      const filtered = QUERY_SUGGESTIONS.filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(QUERY_SUGGESTIONS);
    }
  }, [query]);

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuerySubmit(query);
      addToQueryHistory(query);
    } else {
      toast({
        title: "Error",
        description: "Query cannot be empty",
        variant: "destructive",
      });
    }
  };

  const addToQueryHistory = (newQuery: string) => {
    // Don't add duplicates
    if (!queryHistory.some(item => item.query === newQuery)) {
      setQueryHistory([
        { query: newQuery, timestamp: new Date() },
        ...queryHistory.slice(0, 9), // Keep last 10 queries
      ]);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onQueryChange(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleHistorySelect = (historyQuery: string) => {
    onQueryChange(historyQuery);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form onSubmit={handleQuerySubmit} className={cn("flex space-x-2 w-full", className)}>
      <div className="relative flex-1 min-w-0">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-10 transition-all duration-200",
            "border-input focus-visible:ring-1 focus-visible:ring-ring",
            "glass-input"
          )}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Auto-complete Suggestions */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 transition-all duration-200 hover:bg-secondary"
            disabled={disabled}
          >
            <span className="sr-only">Open suggestions</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[400px]" align="end">
          <Command>
            <CommandInput placeholder="Search queries..." />
            <CommandList>
              {filteredSuggestions.map(suggestion => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                  className="flex items-center text-sm cursor-pointer"
                >
                  <div className="flex-1 truncate">{suggestion}</div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Query History */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 transition-all duration-200 hover:bg-secondary"
            disabled={disabled}
          >
            <span className="sr-only">History</span>
            <Clock className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[400px]" align="end">
          <Command>
            <CommandInput placeholder="Search history..." />
            <CommandList>
              {queryHistory.map((item, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => handleHistorySelect(item.query)}
                  className="flex items-center text-sm cursor-pointer"
                >
                  <div className="flex-1 truncate">{item.query}</div>
                  <span className="text-xs text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="submit"
        disabled={disabled}
        className="transition-all duration-200"
      >
        Execute
      </Button>
    </form>
  );
};

export default QueryInput;
