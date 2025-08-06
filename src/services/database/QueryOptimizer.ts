import { logger } from '../../config/logger';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  parameters?: any[];
}

export interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'pagination' | 'join_optimization' | 'cache_suggestion';
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

export class QueryOptimizer {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold: number = 1000; // 1 second
  private maxMetricsHistory: number = 1000;

  constructor(slowQueryThreshold?: number) {
    if (slowQueryThreshold) {
      this.slowQueryThreshold = slowQueryThreshold;
    }
  }

  /**
   * Record query execution metrics
   */
  recordQuery(query: string, executionTime: number, rowsAffected: number, parameters?: any[]): void {
    const metric: QueryMetrics = {
      query: this.normalizeQuery(query),
      executionTime,
      rowsAffected,
      timestamp: new Date(),
      parameters
    };

    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // Log slow queries
    if (executionTime > this.slowQueryThreshold) {
      logger.warn(`Slow query detected (${executionTime}ms): ${query.substring(0, 100)}...`);
    }
  }

  /**
   * Normalize query for analysis (remove specific values, normalize whitespace)
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace PostgreSQL parameters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Analyze query patterns and provide optimization suggestions
   */
  analyzeQueries(): {
    slowQueries: QueryMetrics[];
    frequentQueries: { query: string; count: number; avgTime: number }[];
    suggestions: OptimizationSuggestion[];
  } {
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold);
    
    // Group queries by normalized form
    const queryGroups = new Map<string, QueryMetrics[]>();
    this.queryMetrics.forEach(metric => {
      const normalized = metric.query;
      if (!queryGroups.has(normalized)) {
        queryGroups.set(normalized, []);
      }
      queryGroups.get(normalized)!.push(metric);
    });

    // Find frequent queries
    const frequentQueries = Array.from(queryGroups.entries())
      .map(([query, metrics]) => ({
        query,
        count: metrics.length,
        avgTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate optimization suggestions
    const suggestions = this.generateOptimizationSuggestions(slowQueries, frequentQueries);

    return {
      slowQueries: slowQueries.slice(0, 20), // Top 20 slowest
      frequentQueries,
      suggestions
    };
  }

  /**
   * Generate optimization suggestions based on query analysis
   */
  private generateOptimizationSuggestions(
    slowQueries: QueryMetrics[],
    frequentQueries: { query: string; count: number; avgTime: number }[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze slow queries
    slowQueries.forEach(metric => {
      const query = metric.query;

      // Check for missing indexes
      if (query.includes('where') && !query.includes('index')) {
        if (query.includes('user_id')) {
          suggestions.push({
            type: 'index',
            description: 'Query filtering by user_id without index',
            impact: 'high',
            suggestion: 'CREATE INDEX idx_user_id ON table_name (user_id);'
          });
        }

        if (query.includes('created_at')) {
          suggestions.push({
            type: 'index',
            description: 'Query filtering by created_at without index',
            impact: 'medium',
            suggestion: 'CREATE INDEX idx_created_at ON table_name (created_at);'
          });
        }

        if (query.includes('status')) {
          suggestions.push({
            type: 'index',
            description: 'Query filtering by status without index',
            impact: 'medium',
            suggestion: 'CREATE INDEX idx_status ON table_name (status);'
          });
        }
      }

      // Check for N+1 queries
      if (query.includes('select') && metric.rowsAffected === 1) {
        suggestions.push({
          type: 'query_rewrite',
          description: 'Potential N+1 query detected',
          impact: 'high',
          suggestion: 'Consider using JOIN or batch loading instead of individual queries'
        });
      }

      // Check for missing LIMIT clauses
      if (query.includes('select') && !query.includes('limit') && metric.rowsAffected > 100) {
        suggestions.push({
          type: 'pagination',
          description: 'Large result set without LIMIT clause',
          impact: 'medium',
          suggestion: 'Add LIMIT clause or implement pagination'
        });
      }

      // Check for inefficient JOINs
      if (query.includes('join') && metric.executionTime > this.slowQueryThreshold * 2) {
        suggestions.push({
          type: 'join_optimization',
          description: 'Slow JOIN operation detected',
          impact: 'high',
          suggestion: 'Review JOIN conditions and ensure proper indexes on join columns'
        });
      }
    });

    // Analyze frequent queries for caching opportunities
    frequentQueries.forEach(({ query, count, avgTime }) => {
      if (count > 10 && avgTime > 100) { // Frequent and somewhat slow
        suggestions.push({
          type: 'cache_suggestion',
          description: `Frequently executed query (${count} times, avg ${avgTime.toFixed(2)}ms)`,
          impact: 'medium',
          suggestion: 'Consider caching the results of this query'
        });
      }
    });

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.suggestion === suggestion.suggestion)
    );

    return uniqueSuggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Get query performance statistics
   */
  getPerformanceStats(): {
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    slowQueryPercentage: number;
    topSlowQueries: QueryMetrics[];
  } {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold);
    const averageExecutionTime = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;
    const slowQueryPercentage = totalQueries > 0 ? (slowQueries.length / totalQueries) * 100 : 0;
    
    const topSlowQueries = [...slowQueries]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries,
      slowQueries: slowQueries.length,
      averageExecutionTime,
      slowQueryPercentage,
      topSlowQueries
    };
  }

  /**
   * Generate database optimization report
   */
  generateOptimizationReport(): {
    summary: any;
    analysis: any;
    recommendations: OptimizationSuggestion[];
    indexSuggestions: string[];
  } {
    const stats = this.getPerformanceStats();
    const analysis = this.analyzeQueries();

    // Generate specific index suggestions
    const indexSuggestions = this.generateIndexSuggestions();

    return {
      summary: {
        ...stats,
        reportGeneratedAt: new Date(),
        dataCollectionPeriod: this.getDataCollectionPeriod()
      },
      analysis: {
        slowQueries: analysis.slowQueries,
        frequentQueries: analysis.frequentQueries,
        queryPatterns: this.analyzeQueryPatterns()
      },
      recommendations: analysis.suggestions,
      indexSuggestions
    };
  }

  /**
   * Generate specific index suggestions based on query patterns
   */
  private generateIndexSuggestions(): string[] {
    const suggestions: string[] = [];
    const queryPatterns = this.analyzeQueryPatterns();

    // Common patterns that benefit from indexes
    const indexPatterns = [
      {
        pattern: /where.*user_id\s*=/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_users_user_id ON users (user_id);'
      },
      {
        pattern: /where.*email\s*=/i,
        suggestion: 'CREATE UNIQUE INDEX CONCURRENTLY idx_users_email ON users (email);'
      },
      {
        pattern: /where.*status\s*=/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_status ON table_name (status);'
      },
      {
        pattern: /where.*created_at/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_created_at ON table_name (created_at);'
      },
      {
        pattern: /order by.*created_at/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_created_at_desc ON table_name (created_at DESC);'
      },
      {
        pattern: /where.*store_id.*and.*status/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_store_status ON coupons (store_id, status);'
      },
      {
        pattern: /where.*campaign_id.*and.*user_id/i,
        suggestion: 'CREATE INDEX CONCURRENTLY idx_campaign_user ON notifications (campaign_id, user_id);'
      }
    ];

    queryPatterns.commonPatterns.forEach(pattern => {
      indexPatterns.forEach(({ pattern: regex, suggestion }) => {
        if (regex.test(pattern.example)) {
          suggestions.push(suggestion.replace('table_name', this.extractTableName(pattern.example)));
        }
      });
    });

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string {
    const fromMatch = query.match(/from\s+(\w+)/i);
    const updateMatch = query.match(/update\s+(\w+)/i);
    const insertMatch = query.match(/insert\s+into\s+(\w+)/i);
    
    return fromMatch?.[1] || updateMatch?.[1] || insertMatch?.[1] || 'table_name';
  }

  /**
   * Analyze query patterns
   */
  private analyzeQueryPatterns(): {
    commonPatterns: { pattern: string; count: number; example: string }[];
    tableUsage: { table: string; queryCount: number; avgTime: number }[];
    operationTypes: { operation: string; count: number; avgTime: number }[];
  } {
    // Group by query patterns
    const patterns = new Map<string, { count: number; examples: string[]; totalTime: number }>();
    const tables = new Map<string, { count: number; totalTime: number }>();
    const operations = new Map<string, { count: number; totalTime: number }>();

    this.queryMetrics.forEach(metric => {
      // Extract pattern (simplified)
      const pattern = this.extractQueryPattern(metric.query);
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { count: 0, examples: [], totalTime: 0 });
      }
      const patternData = patterns.get(pattern)!;
      patternData.count++;
      patternData.totalTime += metric.executionTime;
      if (patternData.examples.length < 3) {
        patternData.examples.push(metric.query);
      }

      // Extract table names
      const tableNames = this.extractTableNames(metric.query);
      tableNames.forEach(table => {
        if (!tables.has(table)) {
          tables.set(table, { count: 0, totalTime: 0 });
        }
        const tableData = tables.get(table)!;
        tableData.count++;
        tableData.totalTime += metric.executionTime;
      });

      // Extract operation type
      const operation = this.extractOperationType(metric.query);
      if (!operations.has(operation)) {
        operations.set(operation, { count: 0, totalTime: 0 });
      }
      const opData = operations.get(operation)!;
      opData.count++;
      opData.totalTime += metric.executionTime;
    });

    return {
      commonPatterns: Array.from(patterns.entries())
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          example: data.examples[0] || ''
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      
      tableUsage: Array.from(tables.entries())
        .map(([table, data]) => ({
          table,
          queryCount: data.count,
          avgTime: data.totalTime / data.count
        }))
        .sort((a, b) => b.queryCount - a.queryCount),
      
      operationTypes: Array.from(operations.entries())
        .map(([operation, data]) => ({
          operation,
          count: data.count,
          avgTime: data.totalTime / data.count
        }))
        .sort((a, b) => b.count - a.count)
    };
  }

  private extractQueryPattern(query: string): string {
    // Simplified pattern extraction
    return query
      .replace(/\b\d+\b/g, 'N') // Replace numbers
      .replace(/'[^']*'/g, "'STRING'") // Replace string literals
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTableNames(query: string): string[] {
    const tables: string[] = [];
    const patterns = [
      /from\s+(\w+)/gi,
      /join\s+(\w+)/gi,
      /update\s+(\w+)/gi,
      /insert\s+into\s+(\w+)/gi,
      /delete\s+from\s+(\w+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        tables.push(match[1].toLowerCase());
      }
    });

    return [...new Set(tables)];
  }

  private extractOperationType(query: string): string {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.startsWith('select')) return 'SELECT';
    if (trimmed.startsWith('insert')) return 'INSERT';
    if (trimmed.startsWith('update')) return 'UPDATE';
    if (trimmed.startsWith('delete')) return 'DELETE';
    if (trimmed.startsWith('create')) return 'CREATE';
    if (trimmed.startsWith('alter')) return 'ALTER';
    if (trimmed.startsWith('drop')) return 'DROP';
    return 'OTHER';
  }

  private getDataCollectionPeriod(): { start: Date; end: Date } | null {
    if (this.queryMetrics.length === 0) return null;
    
    const timestamps = this.queryMetrics.map(m => m.timestamp);
    return {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    logger.info('QueryOptimizer: Metrics history cleared');
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizer();