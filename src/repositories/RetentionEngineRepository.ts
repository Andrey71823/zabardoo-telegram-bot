import { Pool } from 'pg';
import { 
  UserChurnRisk, 
  UserActivityMonitoring, 
  RetentionCampaign, 
  UserLifecycleStage, 
  RetentionCohort,
  WinBackCampaign,
  RetentionAlert,
  PredictiveModel,
  UserPrediction
} from '../models/RetentionEngine';
import { BaseRepository } from './base/BaseRepository';

export class RetentionEngineRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // User Churn Risk operations
  async createChurnRisk(churnRisk: Omit<UserChurnRisk, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserChurnRisk> {
    const query = `
      INSERT INTO user_churn_risk (
        user_id, churn_risk_score, risk_level, risk_factors, predicted_churn_date,
        confidence, last_activity_date, days_since_last_activity, activity_trend,
        engagement_score, lifetime_value, segment_id, intervention_recommendations,
        calculated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      churnRisk.userId, churnRisk.churnRiskScore, churnRisk.riskLevel,
      JSON.stringify(churnRisk.riskFactors), churnRisk.predictedChurnDate,
      churnRisk.confidence, churnRisk.lastActivityDate, churnRisk.daysSinceLastActivity,
      churnRisk.activityTrend, churnRisk.engagementScore, churnRisk.lifetimeValue,
      churnRisk.segmentId, JSON.stringify(churnRisk.interventionRecommendations),
      churnRisk.calculatedAt, JSON.stringify(churnRisk.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToChurnRisk(result.rows[0]);
  }

  async getChurnRiskByUser(userId: string): Promise<UserChurnRisk | null> {
    const query = `
      SELECT * FROM user_churn_risk 
      WHERE user_id = $1 
      ORDER BY calculated_at DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapRowToChurnRisk(result.rows[0]) : null;
  }

  async getHighRiskUsers(riskLevel: string = 'high', limit: number = 100): Promise<UserChurnRisk[]> {
    const query = `
      SELECT DISTINCT ON (user_id) *
      FROM user_churn_risk 
      WHERE risk_level = $1
      ORDER BY user_id, calculated_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [riskLevel, limit]);
    return result.rows.map(row => this.mapRowToChurnRisk(row));
  }

  async updateChurnRisk(userId: string, updates: Partial<UserChurnRisk>): Promise<UserChurnRisk | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (['riskFactors', 'interventionRecommendations', 'metadata'].includes(key)) {
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
    values.push(userId);

    const query = `
      UPDATE user_churn_risk 
      SET ${setClause.join(', ')}
      WHERE user_id = $${paramIndex} AND id = (
        SELECT id FROM user_churn_risk WHERE user_id = $${paramIndex} ORDER BY calculated_at DESC LIMIT 1
      )
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToChurnRisk(result.rows[0]) : null;
  }

  // User Activity Monitoring operations
  async createActivityMonitoring(monitoring: Omit<UserActivityMonitoring, 'id'>): Promise<UserActivityMonitoring> {
    const query = `
      INSERT INTO user_activity_monitoring (
        user_id, monitoring_period, activity_metrics, behavior_patterns,
        engagement_trends, anomalies, health_score, status, last_updated, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      monitoring.userId, JSON.stringify(monitoring.monitoringPeriod),
      JSON.stringify(monitoring.activityMetrics), JSON.stringify(monitoring.behaviorPatterns),
      JSON.stringify(monitoring.engagementTrends), JSON.stringify(monitoring.anomalies),
      monitoring.healthScore, monitoring.status, monitoring.lastUpdated,
      JSON.stringify(monitoring.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToActivityMonitoring(result.rows[0]);
  }

  async getActivityMonitoringByUser(userId: string): Promise<UserActivityMonitoring | null> {
    const query = `
      SELECT * FROM user_activity_monitoring 
      WHERE user_id = $1 
      ORDER BY last_updated DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapRowToActivityMonitoring(result.rows[0]) : null;
  }

  async getUsersByActivityStatus(status: string, limit: number = 100): Promise<UserActivityMonitoring[]> {
    const query = `
      SELECT DISTINCT ON (user_id) *
      FROM user_activity_monitoring 
      WHERE status = $1
      ORDER BY user_id, last_updated DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [status, limit]);
    return result.rows.map(row => this.mapRowToActivityMonitoring(row));
  }

  // Retention Campaign operations
  async createRetentionCampaign(campaign: Omit<RetentionCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionCampaign> {
    const query = `
      INSERT INTO retention_campaigns (
        name, description, campaign_type, status, target_segment, triggers,
        actions, schedule, budget, performance, ab_test_config, start_date,
        end_date, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      campaign.name, campaign.description, campaign.campaignType, campaign.status,
      JSON.stringify(campaign.targetSegment), JSON.stringify(campaign.triggers),
      JSON.stringify(campaign.actions), JSON.stringify(campaign.schedule),
      JSON.stringify(campaign.budget), JSON.stringify(campaign.performance),
      JSON.stringify(campaign.abTestConfig), campaign.startDate, campaign.endDate,
      campaign.createdBy, JSON.stringify(campaign.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRetentionCampaign(result.rows[0]);
  }

  async getActiveCampaigns(): Promise<RetentionCampaign[]> {
    const query = `
      SELECT * FROM retention_campaigns 
      WHERE status = 'active' 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY start_date DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToRetentionCampaign(row));
  }

  async updateCampaignPerformance(campaignId: string, performance: any): Promise<void> {
    const query = `
      UPDATE retention_campaigns 
      SET performance = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.pool.query(query, [JSON.stringify(performance), campaignId]);
  }

  // User Lifecycle Stage operations
  async createLifecycleStage(stage: Omit<UserLifecycleStage, 'id'>): Promise<UserLifecycleStage> {
    const query = `
      INSERT INTO user_lifecycle_stages (
        user_id, current_stage, previous_stage, stage_entry_date, days_in_stage,
        stage_history, next_predicted_stage, stage_transition_probability,
        stage_metrics, interventions, calculated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      stage.userId, stage.currentStage, stage.previousStage, stage.stageEntryDate,
      stage.daysinStage, JSON.stringify(stage.stageHistory), stage.nextPredictedStage,
      JSON.stringify(stage.stageTransitionProbability), JSON.stringify(stage.stageMetrics),
      JSON.stringify(stage.interventions), stage.calculatedAt, JSON.stringify(stage.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToLifecycleStage(result.rows[0]);
  }

  async getLifecycleStageByUser(userId: string): Promise<UserLifecycleStage | null> {
    const query = `
      SELECT * FROM user_lifecycle_stages 
      WHERE user_id = $1 
      ORDER BY calculated_at DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapRowToLifecycleStage(result.rows[0]) : null;
  }

  async getUsersByLifecycleStage(stage: string): Promise<UserLifecycleStage[]> {
    const query = `
      SELECT DISTINCT ON (user_id) *
      FROM user_lifecycle_stages 
      WHERE current_stage = $1
      ORDER BY user_id, calculated_at DESC
    `;
    const result = await this.pool.query(query, [stage]);
    return result.rows.map(row => this.mapRowToLifecycleStage(row));
  }

  // Retention Cohort operations
  async createRetentionCohort(cohort: Omit<RetentionCohort, 'id'>): Promise<RetentionCohort> {
    const query = `
      INSERT INTO retention_cohorts (
        name, description, cohort_definition, cohort_size, creation_date,
        analysis_date, retention_rates, churn_rates, revenue_metrics,
        behavior_insights, comparison_cohorts, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      cohort.name, cohort.description, JSON.stringify(cohort.cohortDefinition),
      cohort.cohortSize, cohort.creationDate, cohort.analysisDate,
      JSON.stringify(cohort.retentionRates), JSON.stringify(cohort.churnRates),
      JSON.stringify(cohort.revenueMetrics), JSON.stringify(cohort.behaviorInsights),
      JSON.stringify(cohort.comparisonCohorts), JSON.stringify(cohort.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRetentionCohort(result.rows[0]);
  }

  async getRetentionCohorts(limit: number = 50): Promise<RetentionCohort[]> {
    const query = `
      SELECT * FROM retention_cohorts 
      ORDER BY creation_date DESC 
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToRetentionCohort(row));
  }

  // Win-back Campaign operations
  async createWinBackCampaign(campaign: Omit<WinBackCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<WinBackCampaign> {
    const query = `
      INSERT INTO winback_campaigns (
        name, description, target_segment, churn_timeframe, winback_strategy,
        offers, touchpoints, performance, budget, status, start_date, end_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      campaign.name, campaign.description, campaign.targetSegment,
      JSON.stringify(campaign.churnTimeframe), JSON.stringify(campaign.winBackStrategy),
      JSON.stringify(campaign.offers), JSON.stringify(campaign.touchpoints),
      JSON.stringify(campaign.performance), campaign.budget, campaign.status,
      campaign.startDate, campaign.endDate, JSON.stringify(campaign.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToWinBackCampaign(result.rows[0]);
  }

  async getActiveWinBackCampaigns(): Promise<WinBackCampaign[]> {
    const query = `
      SELECT * FROM winback_campaigns 
      WHERE status = 'active' 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY start_date DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToWinBackCampaign(row));
  }

  // Retention Alert operations
  async createRetentionAlert(alert: Omit<RetentionAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionAlert> {
    const query = `
      INSERT INTO retention_alerts (
        alert_type, severity, title, description, affected_users, metric,
        current_value, threshold_value, deviation, detected_at, status,
        assigned_to, resolution, related_campaigns, recommended_actions, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      alert.alertType, alert.severity, alert.title, alert.description,
      alert.affectedUsers, alert.metric, alert.currentValue, alert.thresholdValue,
      alert.deviation, alert.detectedAt, alert.status, alert.assignedTo,
      JSON.stringify(alert.resolution), JSON.stringify(alert.relatedCampaigns),
      JSON.stringify(alert.recommendedActions), JSON.stringify(alert.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRetentionAlert(result.rows[0]);
  }

  async getActiveAlerts(): Promise<RetentionAlert[]> {
    const query = `
      SELECT * FROM retention_alerts 
      WHERE status IN ('new', 'acknowledged', 'investigating')
      ORDER BY severity DESC, detected_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToRetentionAlert(row));
  }

  async updateAlertStatus(alertId: string, status: string, assignedTo?: string): Promise<void> {
    const query = `
      UPDATE retention_alerts 
      SET status = $1, assigned_to = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, assignedTo, alertId]);
  }

  // Predictive Model operations
  async createPredictiveModel(model: Omit<PredictiveModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<PredictiveModel> {
    const query = `
      INSERT INTO predictive_models (
        model_name, model_type, algorithm, version, training_data, features,
        performance, deployment_status, last_trained_at, next_retraining_date,
        prediction_thresholds, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      model.modelName, model.modelType, model.algorithm, model.version,
      JSON.stringify(model.trainingData), JSON.stringify(model.features),
      JSON.stringify(model.performance), model.deploymentStatus,
      model.lastTrainedAt, model.nextRetrainingDate,
      JSON.stringify(model.predictionThresholds), JSON.stringify(model.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToPredictiveModel(result.rows[0]);
  }

  async getDeployedModels(modelType?: string): Promise<PredictiveModel[]> {
    let query = `
      SELECT * FROM predictive_models 
      WHERE deployment_status = 'deployed'
    `;
    const values = [];

    if (modelType) {
      query += ' AND model_type = $1';
      values.push(modelType);
    }

    query += ' ORDER BY last_trained_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToPredictiveModel(row));
  }

  // User Prediction operations
  async createUserPrediction(prediction: Omit<UserPrediction, 'id' | 'createdAt'>): Promise<UserPrediction> {
    const query = `
      INSERT INTO user_predictions (
        user_id, model_id, prediction_type, prediction_value, confidence,
        prediction_date, valid_until, feature_values, explanation,
        actual_outcome, prediction_accuracy, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      prediction.userId, prediction.modelId, prediction.predictionType,
      prediction.predictionValue, prediction.confidence, prediction.predictionDate,
      prediction.validUntil, JSON.stringify(prediction.featureValues),
      JSON.stringify(prediction.explanation), prediction.actualOutcome,
      prediction.predictionAccuracy, JSON.stringify(prediction.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToUserPrediction(result.rows[0]);
  }

  async getUserPredictions(userId: string, predictionType?: string): Promise<UserPrediction[]> {
    let query = `
      SELECT * FROM user_predictions 
      WHERE user_id = $1 AND valid_until > NOW()
    `;
    const values = [userId];

    if (predictionType) {
      query += ' AND prediction_type = $2';
      values.push(predictionType);
    }

    query += ' ORDER BY prediction_date DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToUserPrediction(row));
  }

  async updatePredictionOutcome(predictionId: string, actualOutcome: number): Promise<void> {
    const query = `
      UPDATE user_predictions 
      SET actual_outcome = $1, 
          prediction_accuracy = ABS(prediction_value - $1) / GREATEST(prediction_value, $1, 1)
      WHERE id = $2
    `;
    await this.pool.query(query, [actualOutcome, predictionId]);
  }

  // Analytics queries
  async getChurnRiskDistribution(): Promise<any[]> {
    const query = `
      SELECT 
        risk_level,
        COUNT(*) as user_count,
        AVG(churn_risk_score) as avg_risk_score,
        AVG(engagement_score) as avg_engagement_score,
        AVG(lifetime_value) as avg_lifetime_value
      FROM (
        SELECT DISTINCT ON (user_id) *
        FROM user_churn_risk
        ORDER BY user_id, calculated_at DESC
      ) latest_risks
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getLifecycleStageDistribution(): Promise<any[]> {
    const query = `
      SELECT 
        current_stage,
        COUNT(*) as user_count,
        AVG(days_in_stage) as avg_days_in_stage,
        AVG((stage_metrics->>'engagementScore')::numeric) as avg_engagement_score
      FROM (
        SELECT DISTINCT ON (user_id) *
        FROM user_lifecycle_stages
        ORDER BY user_id, calculated_at DESC
      ) latest_stages
      GROUP BY current_stage
      ORDER BY user_count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCampaignPerformanceStats(): Promise<any[]> {
    const query = `
      SELECT 
        campaign_type,
        status,
        COUNT(*) as campaign_count,
        AVG((performance->>'reachRate')::numeric) as avg_reach_rate,
        AVG((performance->>'engagementRate')::numeric) as avg_engagement_rate,
        AVG((performance->>'conversionRate')::numeric) as avg_conversion_rate,
        AVG((performance->>'roi')::numeric) as avg_roi
      FROM retention_campaigns
      WHERE performance IS NOT NULL
      GROUP BY campaign_type, status
      ORDER BY campaign_type, status
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  // Helper methods
  private mapRowToChurnRisk(row: any): UserChurnRisk {
    return {
      id: row.id,
      userId: row.user_id,
      churnRiskScore: row.churn_risk_score,
      riskLevel: row.risk_level,
      riskFactors: JSON.parse(row.risk_factors || '[]'),
      predictedChurnDate: row.predicted_churn_date,
      confidence: row.confidence,
      lastActivityDate: row.last_activity_date,
      daysSinceLastActivity: row.days_since_last_activity,
      activityTrend: row.activity_trend,
      engagementScore: row.engagement_score,
      lifetimeValue: row.lifetime_value,
      segmentId: row.segment_id,
      interventionRecommendations: JSON.parse(row.intervention_recommendations || '[]'),
      calculatedAt: row.calculated_at,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToActivityMonitoring(row: any): UserActivityMonitoring {
    return {
      id: row.id,
      userId: row.user_id,
      monitoringPeriod: JSON.parse(row.monitoring_period || '{}'),
      activityMetrics: JSON.parse(row.activity_metrics || '{}'),
      behaviorPatterns: JSON.parse(row.behavior_patterns || '[]'),
      engagementTrends: JSON.parse(row.engagement_trends || '[]'),
      anomalies: JSON.parse(row.anomalies || '[]'),
      healthScore: row.health_score,
      status: row.status,
      lastUpdated: row.last_updated,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToRetentionCampaign(row: any): RetentionCampaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      campaignType: row.campaign_type,
      status: row.status,
      targetSegment: JSON.parse(row.target_segment || '{}'),
      triggers: JSON.parse(row.triggers || '[]'),
      actions: JSON.parse(row.actions || '[]'),
      schedule: JSON.parse(row.schedule || '{}'),
      budget: JSON.parse(row.budget || '{}'),
      performance: JSON.parse(row.performance || '{}'),
      abTestConfig: JSON.parse(row.ab_test_config || 'null'),
      startDate: row.start_date,
      endDate: row.end_date,
      createdBy: row.created_by,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToLifecycleStage(row: any): UserLifecycleStage {
    return {
      id: row.id,
      userId: row.user_id,
      currentStage: row.current_stage,
      previousStage: row.previous_stage,
      stageEntryDate: row.stage_entry_date,
      daysinStage: row.days_in_stage,
      stageHistory: JSON.parse(row.stage_history || '[]'),
      nextPredictedStage: row.next_predicted_stage,
      stageTransitionProbability: JSON.parse(row.stage_transition_probability || '{}'),
      stageMetrics: JSON.parse(row.stage_metrics || '{}'),
      interventions: JSON.parse(row.interventions || '[]'),
      calculatedAt: row.calculated_at,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToRetentionCohort(row: any): RetentionCohort {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      cohortDefinition: JSON.parse(row.cohort_definition || '{}'),
      cohortSize: row.cohort_size,
      creationDate: row.creation_date,
      analysisDate: row.analysis_date,
      retentionRates: JSON.parse(row.retention_rates || '[]'),
      churnRates: JSON.parse(row.churn_rates || '[]'),
      revenueMetrics: JSON.parse(row.revenue_metrics || '{}'),
      behaviorInsights: JSON.parse(row.behavior_insights || '[]'),
      comparisonCohorts: JSON.parse(row.comparison_cohorts || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToWinBackCampaign(row: any): WinBackCampaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetSegment: row.target_segment,
      churnTimeframe: JSON.parse(row.churn_timeframe || '{}'),
      winBackStrategy: JSON.parse(row.winback_strategy || '{}'),
      offers: JSON.parse(row.offers || '[]'),
      touchpoints: JSON.parse(row.touchpoints || '[]'),
      performance: JSON.parse(row.performance || '{}'),
      budget: row.budget,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToRetentionAlert(row: any): RetentionAlert {
    return {
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      affectedUsers: row.affected_users,
      metric: row.metric,
      currentValue: row.current_value,
      thresholdValue: row.threshold_value,
      deviation: row.deviation,
      detectedAt: row.detected_at,
      status: row.status,
      assignedTo: row.assigned_to,
      resolution: JSON.parse(row.resolution || 'null'),
      relatedCampaigns: JSON.parse(row.related_campaigns || '[]'),
      recommendedActions: JSON.parse(row.recommended_actions || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToPredictiveModel(row: any): PredictiveModel {
    return {
      id: row.id,
      modelName: row.model_name,
      modelType: row.model_type,
      algorithm: row.algorithm,
      version: row.version,
      trainingData: JSON.parse(row.training_data || '{}'),
      features: JSON.parse(row.features || '[]'),
      performance: JSON.parse(row.performance || '{}'),
      deploymentStatus: row.deployment_status,
      lastTrainedAt: row.last_trained_at,
      nextRetrainingDate: row.next_retraining_date,
      predictionThresholds: JSON.parse(row.prediction_thresholds || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToUserPrediction(row: any): UserPrediction {
    return {
      id: row.id,
      userId: row.user_id,
      modelId: row.model_id,
      predictionType: row.prediction_type,
      predictionValue: row.prediction_value,
      confidence: row.confidence,
      predictionDate: row.prediction_date,
      validUntil: row.valid_until,
      featureValues: JSON.parse(row.feature_values || '{}'),
      explanation: JSON.parse(row.explanation || '{}'),
      actualOutcome: row.actual_outcome,
      predictionAccuracy: row.prediction_accuracy,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}