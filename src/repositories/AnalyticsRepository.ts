import { BaseRepository } from './base/BaseRepository';
import { 
  UserEvent, 
  EventAggregation, 
  UserSession, 
  ConversionFunnel,
  FunnelAnalysis,
  CohortAnalysis,
  CustomReport,
  EventBatch,
  EventProcessingRule,
  DataQualityCheck,
  QualityResult,
  RealTimeMetric,
  EventType,
  UserAction,
  BusinessMetric,
  TimeWindow
} from '../models/Analytics';

export class AnalyticsRepository extends BaseRepository {
  
  // Event Management
  async createEvent(event: UserEvent): Promise<UserEvent> {
    const query = `
      INSERT INTO user_events (
        id, user_id, session_id, event_type, event_name, timestamp,
        properties, context, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await this.execute(query, [
      event.id,
      event.userId,
      event.sessionId,
      event.eventType,
      event.eventName,
      event.timestamp,
      JSON.stringify(event.properties),
      JSON.stringify(event.context),
      JSON.stringify(event.metadata)
    ]);
    
    return event;
  }

  async createEventBatch(events: UserEvent[]): Promise<void> {
    if (events.length === 0) return;

    const query = `
      INSERT INTO user_events (
        id, user_id, session_id, event_type, event_name, timestamp,
        properties, context, metadata, created_at
      ) VALUES ?
    `;

    const values = events.map(event => [
      event.id,
      event.userId,
      event.sessionId,
      event.eventType,
      event.eventName,
      event.timestamp,
      JSON.stringify(event.properties),
      JSON.stringify(event.context),
      JSON.stringify(event.metadata),
      new Date()
    ]);

    await this.execute(query, [values]);
  }

  async getEventsByUserId(
    userId: string, 
    limit: number = 100, 
    offset: number = 0,
    filters?: {
      eventType?: EventType;
      eventName?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<UserEvent[]> {
    let query = `
      SELECT * FROM user_events 
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (filters) {
      if (filters.eventType) {
        query += ` AND event_type = ?`;
        params.push(filters.eventType);
      }
      if (filters.eventName) {
        query += ` AND event_name = ?`;
        params.push(filters.eventName);
      }
      if (filters.dateFrom) {
        query += ` AND timestamp >= ?`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        query += ` AND timestamp <= ?`;
        params.push(filters.dateTo);
      }
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await this.query(query, params);
    return rows.map(this.mapRowToEvent);
  }

  async getEventsCount(filters?: {
    eventType?: EventType;
    eventName?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM user_events WHERE 1=1`;
    const params: any[] = [];

    if (filters) {
      if (filters.eventType) {
        query += ` AND event_type = ?`;
        params.push(filters.eventType);
      }
      if (filters.eventName) {
        query += ` AND event_name = ?`;
        params.push(filters.eventName);
      }
      if (filters.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
      }
      if (filters.dateFrom) {
        query += ` AND timestamp >= ?`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        query += ` AND timestamp <= ?`;
        params.push(filters.dateTo);
      }
    }

    const result = await this.query(query, params);
    return result[0].count;
  }

  // Session Management
  async createSession(session: UserSession): Promise<UserSession> {
    const query = `
      INSERT INTO user_sessions (
        id, user_id, session_start, session_end, duration,
        platform, source, properties, context, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await this.execute(query, [
      session.id,
      session.userId,
      session.sessionStart,
      session.sessionEnd,
      session.duration,
      session.platform,
      session.source,
      JSON.stringify(session.properties),
      JSON.stringify(session.context)
    ]);
    
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    const fields = [];
    const params = [];

    if (updates.sessionEnd) {
      fields.push('session_end = ?');
      params.push(updates.sessionEnd);
    }
    if (updates.duration) {
      fields.push('duration = ?');
      params.push(updates.duration);
    }
    if (updates.properties) {
      fields.push('properties = ?');
      params.push(JSON.stringify(updates.properties));
    }

    if (fields.length === 0) return;

    fields.push('updated_at = NOW()');
    params.push(sessionId);

    const query = `UPDATE user_sessions SET ${fields.join(', ')} WHERE id = ?`;
    await this.execute(query, params);
  }

  async getSessionsByUserId(userId: string, limit: number = 50): Promise<UserSession[]> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE user_id = ? 
      ORDER BY session_start DESC 
      LIMIT ?
    `;
    
    const rows = await this.query(query, [userId, limit]);
    return rows.map(this.mapRowToSession);
  }

  // Aggregation Management
  async createAggregation(aggregation: EventAggregation): Promise<EventAggregation> {
    const query = `
      INSERT INTO event_aggregations (
        id, event_type, event_name, aggregation_type, time_window,
        dimensions, metrics, filters, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await this.execute(query, [
      aggregation.id,
      aggregation.eventType,
      aggregation.eventName,
      aggregation.aggregationType,
      aggregation.timeWindow,
      JSON.stringify(aggregation.dimensions),
      JSON.stringify(aggregation.metrics),
      JSON.stringify(aggregation.filters)
    ]);
    
    return aggregation;
  }

  async getAggregatedData(
    aggregationId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<any[]> {
    // This would typically query pre-computed aggregation tables
    // For now, we'll return a mock implementation
    const query = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_events 
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
    
    return await this.query(query, [dateRange.from, dateRange.to]);
  }

  // Funnel Analysis
  async createFunnel(funnel: ConversionFunnel): Promise<ConversionFunnel> {
    const query = `
      INSERT INTO conversion_funnels (
        id, name, description, steps, time_window, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await this.execute(query, [
      funnel.id,
      funnel.name,
      funnel.description,
      JSON.stringify(funnel.steps),
      funnel.timeWindow,
      funnel.isActive
    ]);
    
    return funnel;
  }

  async getFunnelAnalysis(
    funnelId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<FunnelAnalysis> {
    // Complex funnel analysis query - simplified for demo
    const funnel = await this.getFunnelById(funnelId);
    if (!funnel) {
      throw new Error('Funnel not found');
    }

    // Mock implementation - in real scenario, this would be a complex query
    return {
      funnelId,
      dateRange,
      totalUsers: 1000,
      steps: funnel.steps.map((step, index) => ({
        stepId: step.id,
        stepName: step.name,
        usersEntered: Math.max(100, 1000 - (index * 200)),
        usersCompleted: Math.max(80, 800 - (index * 150)),
        conversionRate: Math.max(0.1, 0.8 - (index * 0.15)),
        averageTimeToComplete: 300 + (index * 120),
        dropoffRate: Math.min(0.9, index * 0.2)
      })),
      conversionRate: 0.15,
      dropoffPoints: []
    };
  }

  async getFunnelById(funnelId: string): Promise<ConversionFunnel | null> {
    const query = `SELECT * FROM conversion_funnels WHERE id = ?`;
    const rows = await this.query(query, [funnelId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      steps: JSON.parse(row.steps),
      timeWindow: row.time_window,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Cohort Analysis
  async getCohortAnalysis(
    cohortType: string,
    dateRange: { from: Date; to: Date }
  ): Promise<CohortAnalysis> {
    // Mock implementation - real implementation would be much more complex
    return {
      id: `cohort_${Date.now()}`,
      name: `${cohortType} Cohort Analysis`,
      cohortType: cohortType as any,
      dateRange,
      cohorts: [],
      retentionMatrix: [],
      averageRetention: []
    };
  }

  // Real-time Metrics
  async updateRealTimeMetric(metric: RealTimeMetric): Promise<void> {
    const query = `
      INSERT INTO real_time_metrics (
        id, name, value, previous_value, change_value, change_percent,
        unit, timestamp, trend, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        previous_value = VALUES(previous_value),
        change_value = VALUES(change_value),
        change_percent = VALUES(change_percent),
        timestamp = VALUES(timestamp),
        trend = VALUES(trend),
        updated_at = NOW()
    `;
    
    await this.execute(query, [
      metric.id,
      metric.name,
      metric.value,
      metric.previousValue,
      metric.change,
      metric.changePercent,
      metric.unit,
      metric.timestamp,
      metric.trend
    ]);
  }

  async getRealTimeMetrics(): Promise<RealTimeMetric[]> {
    const query = `
      SELECT * FROM real_time_metrics 
      ORDER BY updated_at DESC
    `;
    
    const rows = await this.query(query);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      value: row.value,
      previousValue: row.previous_value,
      change: row.change_value,
      changePercent: row.change_percent,
      unit: row.unit,
      timestamp: row.timestamp,
      trend: row.trend
    }));
  }

  // Custom Reports
  async createCustomReport(report: CustomReport): Promise<CustomReport> {
    const query = `
      INSERT INTO custom_reports (
        id, name, description, query_config, schedule_config,
        recipients, format, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await this.execute(query, [
      report.id,
      report.name,
      report.description,
      JSON.stringify(report.query),
      JSON.stringify(report.schedule),
      JSON.stringify(report.recipients),
      report.format,
      report.isActive
    ]);
    
    return report;
  }

  async getCustomReports(isActive?: boolean): Promise<CustomReport[]> {
    let query = `SELECT * FROM custom_reports`;
    const params: any[] = [];
    
    if (isActive !== undefined) {
      query += ` WHERE is_active = ?`;
      params.push(isActive);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const rows = await this.query(query, params);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      query: JSON.parse(row.query_config),
      schedule: JSON.parse(row.schedule_config),
      recipients: JSON.parse(row.recipients),
      format: row.format,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Event Processing Rules
  async createProcessingRule(rule: EventProcessingRule): Promise<EventProcessingRule> {
    const query = `
      INSERT INTO event_processing_rules (
        id, name, event_type, conditions, actions, is_active, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await this.execute(query, [
      rule.id,
      rule.name,
      rule.eventType,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.isActive,
      rule.priority
    ]);
    
    return rule;
  }

  async getProcessingRules(eventType?: EventType): Promise<EventProcessingRule[]> {
    let query = `SELECT * FROM event_processing_rules WHERE is_active = true`;
    const params: any[] = [];
    
    if (eventType) {
      query += ` AND event_type = ?`;
      params.push(eventType);
    }
    
    query += ` ORDER BY priority DESC`;
    
    const rows = await this.query(query, params);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      eventType: row.event_type,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
      isActive: row.is_active,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Data Quality
  async createQualityCheck(check: DataQualityCheck): Promise<DataQualityCheck> {
    const query = `
      INSERT INTO data_quality_checks (
        id, name, check_type, rules, schedule, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await this.execute(query, [
      check.id,
      check.name,
      check.checkType,
      JSON.stringify(check.rules),
      check.schedule,
      check.isActive
    ]);
    
    return check;
  }

  async saveQualityResult(result: QualityResult): Promise<void> {
    const query = `
      INSERT INTO data_quality_results (
        check_id, run_at, passed, score, issues, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await this.execute(query, [
      result.checkId,
      result.runAt,
      result.passed,
      result.score,
      JSON.stringify(result.issues),
      JSON.stringify(result.summary)
    ]);
  }

  // Analytics Queries
  async executeCustomQuery(query: string, params: any[] = []): Promise<any[]> {
    // Security note: In production, this should have strict validation
    // and only allow pre-approved query patterns
    return await this.query(query, params);
  }

  async getTopEvents(
    dateRange: { from: Date; to: Date },
    limit: number = 10
  ): Promise<Array<{ eventName: string; count: number }>> {
    const query = `
      SELECT event_name, COUNT(*) as count
      FROM user_events
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT ?
    `;
    
    return await this.query(query, [dateRange.from, dateRange.to, limit]);
  }

  async getActiveUsers(
    dateRange: { from: Date; to: Date },
    timeWindow: TimeWindow = TimeWindow.DAY
  ): Promise<Array<{ date: string; activeUsers: number }>> {
    let dateFormat = '%Y-%m-%d';
    if (timeWindow === TimeWindow.HOUR) {
      dateFormat = '%Y-%m-%d %H:00:00';
    } else if (timeWindow === TimeWindow.MONTH) {
      dateFormat = '%Y-%m';
    }

    const query = `
      SELECT 
        DATE_FORMAT(timestamp, ?) as date,
        COUNT(DISTINCT user_id) as activeUsers
      FROM user_events
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(timestamp, ?)
      ORDER BY date
    `;
    
    return await this.query(query, [dateFormat, dateRange.from, dateRange.to, dateFormat]);
  }

  // Helper methods
  private mapRowToEvent(row: any): UserEvent {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      eventType: row.event_type,
      eventName: row.event_name,
      timestamp: row.timestamp,
      properties: JSON.parse(row.properties || '{}'),
      context: JSON.parse(row.context || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToSession(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      sessionStart: row.session_start,
      sessionEnd: row.session_end,
      duration: row.duration,
      platform: row.platform,
      source: row.source,
      events: [], // Events would be loaded separately if needed
      properties: JSON.parse(row.properties || '{}'),
      context: JSON.parse(row.context || '{}')
    };
  }
}