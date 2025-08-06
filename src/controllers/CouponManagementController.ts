import { Request, Response } from 'express';
import { CouponManagementService } from '../services/admin/CouponManagementService';
import { Logger } from '../config/logger';
import { CouponFilter, BulkOperation, ModerationAction } from '../models/CouponManagement';

export class CouponManagementController {
  private couponService: CouponManagementService;
  private logger: Logger;

  constructor() {
    this.couponService = new CouponManagementService();
    this.logger = new Logger('CouponManagementController');
  }

  /**
   * POST /api/admin/coupons
   * Create a new coupon
   */
  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const couponData = req.body;
      const coupon = await this.couponService.createCoupon(couponData);

      res.status(201).json({
        success: true,
        data: coupon,
        message: 'Coupon created successfully'
      });
    } catch (error) {
      this.logger.error('Failed to create coupon', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/admin/coupons/:id
   * Update an existing coupon
   */
  async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const coupon = await this.couponService.updateCoupon(id, updateData);

      res.json({
        success: true,
        data: coupon,
        message: 'Coupon updated successfully'
      });
    } catch (error) {
      this.logger.error('Failed to update coupon', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/admin/coupons/:id
   * Delete a coupon
   */
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.couponService.deleteCoupon(id);

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      this.logger.error('Failed to delete coupon', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons/:id
   * Get coupon by ID
   */
  async getCouponById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const coupon = await this.couponService.getCouponById(id);

      if (!coupon) {
        res.status(404).json({
          success: false,
          error: 'Coupon not found'
        });
        return;
      }

      res.json({
        success: true,
        data: coupon
      });
    } catch (error) {
      this.logger.error('Failed to get coupon', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons
   * Get coupons with filtering and pagination
   */
  async getCoupons(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        store,
        category,
        status,
        isActive,
        discountType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter: CouponFilter = {};
      
      if (store) filter.store = store as string;
      if (category) filter.category = category as string;
      if (status) filter.status = status as any;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (discountType) filter.discountType = discountType as any;
      if (sortBy) filter.sortBy = sortBy as string;
      if (sortOrder) filter.sortOrder = sortOrder as 'asc' | 'desc';

      const result = await this.couponService.getCoupons(
        filter,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Failed to get coupons', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons/search
   * Search coupons by text
   */
  async searchCoupons(req: Request, res: Response): Promise<void> {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const result = await this.couponService.searchCoupons(
        q as string,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Failed to search coupons', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons/stats
   * Get coupon statistics
   */
  async getCouponStats(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      let dateRange: { from: Date; to: Date } | undefined;
      if (from && to) {
        dateRange = {
          from: new Date(from as string),
          to: new Date(to as string)
        };
      }

      const stats = await this.couponService.getCouponStats(dateRange);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Failed to get coupon stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/coupons/:id/moderate
   * Moderate coupon (approve/reject)
   */
  async moderateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      const moderatorId = req.user?.id || 'system'; // Assuming user info is in request

      if (!['approve', 'reject'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid moderation action. Must be "approve" or "reject"'
        });
        return;
      }

      const coupon = await this.couponService.moderateCoupon(
        id,
        action as ModerationAction,
        moderatorId,
        reason
      );

      res.json({
        success: true,
        data: coupon,
        message: `Coupon ${action}d successfully`
      });
    } catch (error) {
      this.logger.error('Failed to moderate coupon', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/coupons/bulk
   * Perform bulk operations on coupons
   */
  async bulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const { couponIds, operation, data } = req.body;
      const operatorId = req.user?.id || 'system';

      if (!couponIds || !Array.isArray(couponIds) || couponIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Coupon IDs array is required'
        });
        return;
      }

      if (!operation) {
        res.status(400).json({
          success: false,
          error: 'Operation is required'
        });
        return;
      }

      const result = await this.couponService.bulkOperation(
        couponIds,
        operation as BulkOperation,
        operatorId,
        data
      );

      res.json({
        success: true,
        data: result,
        message: `Bulk ${operation} completed`
      });
    } catch (error) {
      this.logger.error('Failed to perform bulk operation', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/coupons/templates
   * Create coupon template
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      const template = await this.couponService.createTemplate(templateData);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      this.logger.error('Failed to create template', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons/templates
   * Get coupon templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.couponService.getTemplates();

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      this.logger.error('Failed to get templates', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/coupons/templates/:id/create
   * Create coupon from template
   */
  async createFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const overrides = req.body;

      const coupon = await this.couponService.createFromTemplate(id, overrides);

      res.status(201).json({
        success: true,
        data: coupon,
        message: 'Coupon created from template successfully'
      });
    } catch (error) {
      this.logger.error('Failed to create coupon from template', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/admin/coupons/import
   * Import coupons from file
   */
  async importCoupons(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'File is required'
        });
        return;
      }

      const { fileType = 'csv', fieldMapping } = req.body;
      
      if (!fieldMapping) {
        res.status(400).json({
          success: false,
          error: 'Field mapping is required'
        });
        return;
      }

      const importOptions = {
        fieldMapping: JSON.parse(fieldMapping)
      };

      const result = await this.couponService.importCoupons(
        req.file.buffer,
        fileType as 'csv' | 'excel',
        importOptions
      );

      res.json({
        success: true,
        data: result,
        message: 'Import completed'
      });
    } catch (error) {
      this.logger.error('Failed to import coupons', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/coupons/export
   * Export coupons to file
   */
  async exportCoupons(req: Request, res: Response): Promise<void> {
    try {
      const {
        format = 'csv',
        store,
        category,
        status,
        isActive,
        fields
      } = req.query;

      const filter: CouponFilter = {};
      if (store) filter.store = store as string;
      if (category) filter.category = category as string;
      if (status) filter.status = status as any;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const exportOptions = {
        fields: fields ? (fields as string).split(',') : undefined
      };

      const result = await this.couponService.exportCoupons(
        filter,
        format as 'csv' | 'excel',
        exportOptions
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      this.logger.error('Failed to export coupons', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}