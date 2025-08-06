import { Request, Response } from 'express';
import { BusinessDashboardService } from '../services/analytics/BusinessDashboardService';
import { EventCollectionService } from '../services/analytics/EventCollectionService';

export class DashboardController {
  private dashboardService: BusinessDashboardService;
  private eventService: EventCollectionService;

  constructor() {
    this.dashboardService = new BusinessDashboardService();
    this.eventService = new EventCollectionService();
  }

  // GET /api/dashboard/metrics
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, compareFrom, compareTo } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const compareWith = compareFrom && compareTo ? {
        from: new Date(compareFrom as string),
        to: new Date(compareTo as string)
      } : undefined;

      const metrics = await this.dashboardService.getDashboardMetrics(dateRange, compareWith);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /api/dashboard/insights
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const insights = await this.dashboardService.getBusinessInsights(metrics);
      
      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /api/dashboard/export
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      const { format = 'json', from, to } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const exportData = await this.dashboardService.exportDashboardData(
        metrics, 
        format as 'json' | 'csv' | 'excel'
      );

      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /api/dashboard/realtime
  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const realTimeMetrics = await this.dashboardService.getRealTimeMetrics();
      
      res.json({
        success: true,
        data: realTimeMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /api/dashboard/track-event
  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, eventName, properties, context } = req.body;

      if (!userId || !eventName) {
        res.status(400).json({
          success: false,
          error: 'userId and eventName are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.eventService.collectEvent(userId, eventName, properties || {}, context);
      
      res.json({
        success: true,
        message: 'Event tracked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}  /**

   * GET /api/dashboard/forecasts
   * Get revenue and user growth forecasts
   */
  async getForecasts(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, periods = '6' } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const forecastPeriods = parseInt(periods as string);

      const [revenueForecasts, userForecasts, trends] = await Promise.all([
        this.dashboardService.getRevenueForecasts(dateRange, forecastPeriods),
        this.dashboardService.getUserGrowthForecasts(dateRange, forecastPeriods),
        this.dashboardService.getTrendAnalysis(dateRange)
      ]);

      res.json({
        success: true,
        data: {
          revenue: revenueForecasts,
          users: userForecasts,
          trends
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to get forecasts', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/dashboard/projections
   * Get growth projections with scenarios
   */
  async getProjections(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, periods = '12' } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const projectionPeriods = parseInt(periods as string);
      const projections = await this.dashboardService.getGrowthProjections(dateRange, projectionPeriods);

      res.json({
        success: true,
        data: projections,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to get projections', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/dashboard/channel-analysis
   * Get detailed channel profitability analysis
   */
  async getChannelAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const analysis = await this.dashboardService.getChannelProfitabilityAnalysis(dateRange);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to get channel analysis', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/dashboard/executive-summary
   * Get executive summary report
   */
  async getExecutiveSummary(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      const dateRange = {
        from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to as string) : new Date()
      };

      const summary = await this.dashboardService.generateExecutiveSummary(dateRange);

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to get executive summary', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }