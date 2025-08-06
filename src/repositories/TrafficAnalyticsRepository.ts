import { Pool } from 'pg';
import { 
  TrafficAnalyticsDashboard, 
  TrafficReport, 
  ABTest, 
  ChannelPerformance, 
  UserJourney, 
  ROIAnalysis,
  AnalyticsAlert,
  AnalyticsInsight,
  DataExport
} from '../models/TrafficAnalytics';
import { BaseRepository } from './base/BaseRepository';

export class TrafficAnalyticsRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Dashboard operations
  async createDashboard(dashboard: Omit<TrafficAnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficAnalyticsDashboard> {
    const query = `
      INSERT INTO traffic_dashboards (
        name, description, dashboard_type, widgets, filters, date_range,
        refresh_interval, is_public, owner_id, permissions, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      dashboard.name, dashboard.description, dashboard.dashboardType,
      JSON.stringify(dashboard.widgets), JSON.stringify(dashboard.filters),
      JSON.stringify(dashboard.dateRange), dashboard.refreshInterval,
      dashboard.isPublic, dashboard.ownerId, JSON.stringify(dashboard.permissions),
      JSON.stringify(dashboard.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToDashboard(result.rows[0]);
  }

  async getDashboardsByOwner(ownerId: string): Promise<TrafficAnalyticsDashboard[]> {
    const query = `
      SELECT * FROM traffic_dashboards 
      WHERE owner_id = $1 OR is_public = true
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [ownerId]);
    return result.rows.map(row => this.mapRowToDashboard(row));
  }

  async updateDashboard(id: string, updates: Partial<TrafficAnalyticsDashboard>): Promise<TrafficAnalyticsDashboard | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (['widgets', 'filters', 'dateRange', 'permissions', 'metadata'].includes(key)) {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE traffic_dashboards 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToDashboard(result.rows[0]) : null;
  }

  // Report operations
  async createReport(report: Omit<TrafficReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficReport> {
    const query = `
      INSERT INTO traffic_reports (
        name, description, report_type, parameters, schedule, format,
        recipients, status, generation_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      report.name, report.description, report.reportType,
      JSON.stringify(report.parameters), JSON.stringify(report.schedule),
      report.format, JSON.stringify(report.recipients), report.status,
      report.generationCount, JSON.stringify(report.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToReport(result.rows[0]);
  }

  async getScheduledReports(): Promise<TrafficReport[]> {
    const query = `
      SELECT * FROM traffic_reports 
      WHERE schedule IS NOT NULL 
        AND status = 'active'
        AND (next_scheduled IS NULL OR next_scheduled <= NOW())
      ORDER BY next_scheduled ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToReport(row));
  }

  async updateReportStatus(reportId: string, status: string, nextScheduled?: Date): Promise<void> {
    const query = `
      UPDATE traffic_reports 
      SET status = $1, next_scheduled = $2, generation_count = generation_count + 1, updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, nextScheduled, reportId]);
  }

  // A/B Test operations
  async createABTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const query = `
      INSERT INTO ab_tests (
        name, description, test_type, status, start_date, end_date,
        traffic_allocation, variants, target_metric, success_criteria,
        statistical_settings, results, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      test.name, test.description, test.testType, test.status,
      test.startDate, test.endDate, test.trafficAllocation,
      JSON.stringify(test.variants), test.targetMetric,
      JSON.stringify(test.successCriteria), JSON.stringify(test.statisticalSettings),
      JSON.stringify(test.results), JSON.stringify(test.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToABTest(result.rows[0]);
  }

  async getActiveABTests(): Promise<ABTest[]> {
    const query = `
      SELECT * FROM ab_tests 
      WHERE status = 'running' 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY start_date DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToABTest(row));
  }

  async updateABTestResults(testId: string, results: any): Promise<void> {
    const query = `
      UPDATE ab_tests 
      SET results = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.pool.query(query, [JSON.stringify(results), testId]);
  }

  // Channel Performance operations
  async createChannelPerformance(performance: Omit<ChannelPerformance, 'id'>): Promise<ChannelPerformance> {
    const query = `
      INSERT INTO channel_performance (
        channel_id, channel_name, channel_type, date_range, metrics,
        trends, segments, top_performers, metadata, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      performance.channelId, performance.channelName, performance.channelType,
      JSON.stringify(performance.dateRange), JSON.stringify(performance.metrics),
      JSON.stringify(performance.trends), JSON.stringify(performance.segments),
      JSON.stringify(performance.topPerformers), JSON.stringify(performance.metadata),
      performance.calculatedAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToChannelPerformance(result.rows[0]);
  }

  async getChannelPerformance(channelId: string, startDate: Date, endDate: Date): Promise<ChannelPerformance | null> {
    const query = `
      SELECT * FROM channel_performance 
      WHERE channel_id = $1 
        AND (date_range->>'startDate')::timestamp <= $2
        AND (date_range->>'endDate')::timestamp >= $3
      ORDER BY calculated_at DESC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [channelId, endDate, startDate]);
    return result.rows.length > 0 ? this.mapRowToChannelPerformance(result.rows[0]) : null;
  }

  async getTopPerformingChannels(limit: number = 10): Promise<ChannelPerformance[]> {
    const query = `
      SELECT DISTINCT ON (channel_id) *
      FROM channel_performance 
      ORDER BY channel_id, calculated_at DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToChannelPerformance(row));
  }

  // User Journey operations
  async createUserJourney(journey: Omit<UserJourney, 'id'>): Promise<UserJourney> {
    const query = `
      INSERT INTO user_journeys (
        user_id, session_id, journey_type, start_time, end_time, duration,
        touchpoints, outcome, path_analysis, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      journey.userId, journey.sessionId, journey.journeyType,
      journey.startTime, journey.endTime, journey.duration,
      JSON.stringify(journey.touchpoints), JSON.stringify(journey.outcome),
      JSON.stringify(journey.pathAnalysis), JSON.stringify(journey.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToUserJourney(result.rows[0]);
  }

  async getUserJourneys(userId: string, limit: number = 50): Promise<UserJourney[]> {
    const query = `
      SELECT * FROM user_journeys 
      WHERE user_id = $1 
      ORDER BY start_time DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToUserJourney(row));
  }

  async getConversionJourneys(startDate: Date, endDate: Date): Promise<UserJourney[]> {
    const query = `
      SELECT * FROM user_journeys 
      WHERE journey_type = 'conversion'
        AND start_time BETWEEN $1 AND $2
      ORDER BY start_time DESC
    `;
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToUserJourney(row));
  }

  // ROI Analysis operations
  async createROIAnalysis(analysis: Omit<ROIAnalysis, 'id'>): Promise<ROIAnalysis> {
    const query = `
      INSERT INTO roi_analysis (
        analysis_type, entity_id, entity_name, date_range, investment,
        returns, roi_metrics, breakdown, trends, benchmarks,
        recommendations, metadata, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      analysis.analysisType, analysis.entityId, analysis.entityName,
      JSON.stringify(analysis.dateRange), JSON.stringify(analysis.investment),
      JSON.stringify(analysis.returns), JSON.stringify(analysis.roiMetrics),
      JSON.stringify(analysis.breakdown), JSON.stringify(analysis.trends),
      JSON.stringify(analysis.benchmarks), JSON.stringify(analysis.recommendations),
      JSON.stringify(analysis.metadata), analysis.calculatedAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToROIAnalysis(result.rows[0]);
  }

  async getROIAnalysis(analysisType: string, entityId: string): Promise<ROIAnalysis | null> {
    const query = `
      SELECT * FROM roi_analysis 
      WHERE analysis_type = $1 AND entity_id = $2
      ORDER BY calculated_at DESC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [analysisType, entityId]);
    return result.rows.length > 0 ? this.mapRowToROIAnalysis(result.rows[0]) : null;
  }

  // Analytics Alert operations
  async createAnalyticsAlert(alert: Omit<AnalyticsAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsAlert> {
    const query = `
      INSERT INTO analytics_alerts (
        name, description, alert_type, metric, conditions, channels,
        recipients, frequency, is_active, trigger_count, suppression_rules, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      alert.name, alert.description, alert.alertType, alert.metric,
      JSON.stringify(alert.conditions), JSON.stringify(alert.channels),
      JSON.stringify(alert.recipients), alert.frequency, alert.isActive,
      alert.triggerCount, JSON.stringify(alert.suppressionRules),
      JSON.stringify(alert.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAnalyticsAlert(result.rows[0]);
  }

  async getActiveAlerts(): Promise<AnalyticsAlert[]> {
    const query = `
      SELECT * FROM analytics_alerts 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToAnalyticsAlert(row));
  }

  async updateAlertTrigger(alertId: string): Promise<void> {
    const query = `
      UPDATE analytics_alerts 
      SET trigger_count = trigger_count + 1, last_triggered = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [alertId]);
  }

  // Analytics Insight operations
  async createAnalyticsInsight(insight: Omit<AnalyticsInsight, 'id'>): Promise<AnalyticsInsight> {
    const query = `
      INSERT INTO analytics_insights (
        type, title, description, severity, confidence, impact,
        evidence, recommendations, affected_entities, detected_at, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      insight.type, insight.title, insight.description, insight.severity,
      insight.confidence, JSON.stringify(insight.impact),
      JSON.stringify(insight.evidence), JSON.stringify(insight.recommendations),
      JSON.stringify(insight.affectedEntities), insight.detectedAt,
      insight.status, JSON.stringify(insight.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAnalyticsInsight(result.rows[0]);
  }

  async getInsightsByStatus(status: string, limit: number = 50): Promise<AnalyticsInsight[]> {
    const query = `
      SELECT * FROM analytics_insights 
      WHERE status = $1 
      ORDER BY detected_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [status, limit]);
    return result.rows.map(row => this.mapRowToAnalyticsInsight(row));
  }

  async updateInsightStatus(insightId: string, status: string): Promise<void> {
    const query = `
      UPDATE analytics_insights 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.pool.query(query, [status, insightId]);
  }

  // Data Export operations
  async createDataExport(dataExport: Omit<DataExport, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataExport> {
    const query = `
      INSERT INTO data_exports (
        name, description, export_type, format, data_source, query,
        filters, schedule, destination, status, export_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      dataExport.name, dataExport.description, dataExport.exportType,
      dataExport.format, dataExport.dataSource, dataExport.query,
      JSON.stringify(dataExport.filters), JSON.stringify(dataExport.schedule),
      JSON.stringify(dataExport.destination), dataExport.status,
      dataExport.exportCount, JSON.stringify(dataExport.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToDataExport(result.rows[0]);
  }

  async getScheduledExports(): Promise<DataExport[]> {
    const query = `
      SELECT * FROM data_exports 
      WHERE schedule IS NOT NULL 
        AND status = 'active'
        AND (next_scheduled IS NULL OR next_scheduled <= NOW())
      ORDER BY next_scheduled ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToDataExport(row));
  }

  // Analytics queries
  async getTrafficOverview(startDate: Date, endDate: Date): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT ce.click_id) as total_clicks,
        COUNT(DISTINCT ce.user_id) as unique_users,
        COUNT(DISTINCT conv.id) as total_conversions,
        COALESCE(SUM(conv.order_value), 0) as total_revenue,
        COALESCE(SUM(conv.commission), 0) as total_commission,
        CASE 
          WHEN COUNT(DISTINCT ce.click_id) > 0 
          THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
          ELSE 0 
        END as conversion_rate,
        CASE 
          WHEN COUNT(DISTINCT conv.id) > 0 
          THEN ROUND(AVG(conv.order_value), 2)
          ELSE 0 
        END as average_order_value
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.click_time BETWEEN $1 AND $2
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows[0];
  }

  async getChannelComparison(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        ce.source as channel,
        COUNT(DISTINCT ce.click_id) as clicks,
        COUNT(DISTINCT conv.id) as conversions,
        COALESCE(SUM(conv.order_value), 0) as revenue,
        COALESCE(SUM(conv.commission), 0) as commission,
        CASE 
          WHEN COUNT(DISTINCT ce.click_id) > 0 
          THEN ROUND((COUNT(DISTINCT conv.id)::decimal / COUNT(DISTINCT ce.click_id) * 100), 2)
          ELSE 0 
        END as conversion_rate
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.click_time BETWEEN $1 AND $2
      GROUP BY ce.source
      ORDER BY revenue DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getTrendData(metric: string, startDate: Date, endDate: Date, granularity: 'hour' | 'day' | 'week' = 'day'): Promise<any[]> {
    const dateFormat = granularity === 'hour' ? 'YYYY-MM-DD HH24:00:00' : 
                      granularity === 'week' ? 'YYYY-"W"WW' : 'YYYY-MM-DD';
    
    const query = `
      SELECT 
        TO_CHAR(ce.click_time, $1) as period,
        COUNT(DISTINCT ce.click_id) as clicks,
        COUNT(DISTINCT conv.id) as conversions,
        COALESCE(SUM(conv.order_value), 0) as revenue,
        COALESCE(SUM(conv.commission), 0) as commission
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.click_time BETWEEN $2 AND $3
      GROUP BY TO_CHAR(ce.click_time, $1)
      ORDER BY period
    `;

    const result = await this.pool.query(query, [dateFormat, startDate, endDate]);
    return result.rows;
  }

  // Helper methods
  private mapRowToDashboard(row: any): TrafficAnalyticsDashboard {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      dashboardType: row.dashboard_type,
      widgets: JSON.parse(row.widgets || '[]'),
      filters: JSON.parse(row.filters || '[]'),
      dateRange: JSON.parse(row.date_range || '{}'),
      refreshInterval: row.refresh_interval,
      isPublic: row.is_public,
      ownerId: row.owner_id,
      permissions: JSON.parse(row.permissions || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToReport(row: any): TrafficReport {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      parameters: JSON.parse(row.parameters || '{}'),
      schedule: JSON.parse(row.schedule || 'null'),
      format: row.format,
      recipients: JSON.parse(row.recipients || '[]'),
      lastGenerated: row.last_generated,
      nextScheduled: row.next_scheduled,
      status: row.status,
      generationCount: row.generation_count,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToABTest(row: any): ABTest {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      testType: row.test_type,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      trafficAllocation: row.traffic_allocation,
      variants: JSON.parse(row.variants || '[]'),
      targetMetric: row.target_metric,
      successCriteria: JSON.parse(row.success_criteria || '{}'),
      statisticalSettings: JSON.parse(row.statistical_settings || '{}'),
      results: JSON.parse(row.results || 'null'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToChannelPerformance(row: any): ChannelPerformance {
    return {
      id: row.id,
      channelId: row.channel_id,
      channelName: row.channel_name,
      channelType: row.channel_type,
      dateRange: JSON.parse(row.date_range || '{}'),
      metrics: JSON.parse(row.metrics || '{}'),
      trends: JSON.parse(row.trends || '{}'),
      segments: JSON.parse(row.segments || '[]'),
      topPerformers: JSON.parse(row.top_performers || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      calculatedAt: row.calculated_at
    };
  }

  private mapRowToUserJourney(row: any): UserJourney {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      journeyType: row.journey_type,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      touchpoints: JSON.parse(row.touchpoints || '[]'),
      outcome: JSON.parse(row.outcome || '{}'),
      pathAnalysis: JSON.parse(row.path_analysis || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToROIAnalysis(row: any): ROIAnalysis {
    return {
      id: row.id,
      analysisType: row.analysis_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      dateRange: JSON.parse(row.date_range || '{}'),
      investment: JSON.parse(row.investment || '{}'),
      returns: JSON.parse(row.returns || '{}'),
      roiMetrics: JSON.parse(row.roi_metrics || '{}'),
      breakdown: JSON.parse(row.breakdown || '[]'),
      trends: JSON.parse(row.trends || '{}'),
      benchmarks: JSON.parse(row.benchmarks || '{}'),
      recommendations: JSON.parse(row.recommendations || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      calculatedAt: row.calculated_at
    };
  }

  private mapRowToAnalyticsAlert(row: any): AnalyticsAlert {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      alertType: row.alert_type,
      metric: row.metric,
      conditions: JSON.parse(row.conditions || '[]'),
      channels: JSON.parse(row.channels || '[]'),
      recipients: JSON.parse(row.recipients || '[]'),
      frequency: row.frequency,
      isActive: row.is_active,
      lastTriggered: row.last_triggered,
      triggerCount: row.trigger_count,
      suppressionRules: JSON.parse(row.suppression_rules || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToAnalyticsInsight(row: any): AnalyticsInsight {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      severity: row.severity,
      confidence: row.confidence,
      impact: JSON.parse(row.impact || '{}'),
      evidence: JSON.parse(row.evidence || '[]'),
      recommendations: JSON.parse(row.recommendations || '[]'),
      affectedEntities: JSON.parse(row.affected_entities || '[]'),
      detectedAt: row.detected_at,
      status: row.status,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToDataExport(row: any): DataExport {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      exportType: row.export_type,
      format: row.format,
      dataSource: row.data_source,
      query: row.query,
      filters: JSON.parse(row.filters || '{}'),
      schedule: JSON.parse(row.schedule || 'null'),
      destination: JSON.parse(row.destination || '{}'),
      lastExported: row.last_exported,
      nextScheduled: row.next_scheduled,
      status: row.status,
      exportCount: row.export_count,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}