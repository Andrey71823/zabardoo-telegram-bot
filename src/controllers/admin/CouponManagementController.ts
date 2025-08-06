import { Request, Response } from 'express';
import { CouponManagementService } from '../../services/admin/CouponManagementService';
import { 
  Coupon, 
  CouponFilter, 
  BulkOperation, 
  ModerationAction 
} from '../../models/CouponManagement';

export class CouponManagementController {
  private couponService: CouponManagementService;

  constructor() {
    this.couponService = new CouponManagementService();
  }

  /**
   * Get coupons with filtering and pagination
   */
  async getCoupons(req: Request, res: Response): Promise<void> {
    try {
      const filter: CouponFilter = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        store: req.query.store ? (req.query.store as string).split(',') : undefined,
        category: req.query.category ? (req.query.category as string).split(',') : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        createdBy: req.query.createdBy as string,
        source: req.query.source ? (req.query.source as string).split(',') : undefined,
        isExclusive: req.query.isExclusive ? req.query.isExclusive === 'true' : undefined,
        isFeatured: req.query.isFeatured ? req.query.isFeatured === 'true' : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      const result = await this.couponService.getCoupons(filter);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupons'
      });
    }
  }

  /**
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
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupon'
      });
    }
  }

  /**
   * Create new coupon
   */
  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const couponData = req.body;
      
      // Add creator information
      couponData.createdBy = req.user?.id || 'admin';
      couponData.source = 'admin';

      const coupon = await this.couponService.createCoupon(couponData);
      
      res.status(201).json({
        success: true,
        data: coupon
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create coupon'
      });
    }
  }

  /**
   * Update coupon
   */
  async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const coupon = await this.couponService.updateCoupon(id, updates);
      
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update coupon'
      });
    }
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.couponService.deleteCoupon(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Coupon not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete coupon'
      });
    }
  }

  /**
   * Get coupon statistics
   */
  async getCouponStats(req: Request, res: Response): Promise<void> {
    try {
      const filter: Partial<CouponFilter> = {};
      
      if (req.query.dateFrom) {
        filter.dateFrom = new Date(req.query.dateFrom as string);
      }
      
      if (req.query.dateTo) {
        filter.dateTo = new Date(req.query.dateTo as string);
      }

      const stats = await this.couponService.getCouponStats(filter);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupon statistics'
      });
    }
  }

  /**
   * Perform bulk operations
   */
  async performBulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const operation: BulkOperation = req.body;
      
      if (!operation.couponIds || operation.couponIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No coupon IDs provided'
        });
        return;
      }

      const result = await this.couponService.performBulkOperation(operation);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
      });
    }
  }

  /**
   * Get coupons pending moderation
   */
  async getPendingModerationCoupons(req: Request, res: Response): Promise<void> {
    try {
      const coupons = await this.couponService.getPendingModerationCoupons();
      
      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending coupons'
      });
    }
  }

  /**
   * Moderate coupon
   */
  async moderateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const action: ModerationAction = {
        ...req.body,
        couponId: id,
        moderatorId: req.user?.id || 'admin'
      };

      const coupon = await this.couponService.moderateCoupon(action);
      
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to moderate coupon'
      });
    }
  }

  /**
   * Get coupon templates
   */
  async getCouponTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.couponService.getCouponTemplates();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupon templates'
      });
    }
  }

  /**
   * Duplicate coupon
   */
  async duplicateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const createdBy = req.user?.id || 'admin';

      const coupon = await this.couponService.duplicateCoupon(id, createdBy);
      
      res.status(201).json({
        success: true,
        data: coupon
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate coupon'
      });
    }
  }

  /**
   * Get coupon performance metrics
   */
  async getCouponPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const performance = await this.couponService.getCouponPerformance(id);
      
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupon performance'
      });
    }
  }

  /**
   * Search coupons
   */
  async searchCoupons(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const coupons = await this.couponService.searchCoupons(query as string, limit);
      
      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search coupons'
      });
    }
  }

  /**
   * Get coupons by store
   */
  async getCouponsByStore(req: Request, res: Response): Promise<void> {
    try {
      const { store } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const coupons = await this.couponService.getCouponsByStore(store, limit);
      
      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupons by store'
      });
    }
  }

  /**
   * Get coupons by category
   */
  async getCouponsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const coupons = await this.couponService.getCouponsByCategory(category, limit);
      
      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get coupons by category'
      });
    }
  }

  /**
   * Validate coupon data
   */
  async validateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const couponData = req.body;
      const validation = await this.couponService.validateCoupon(couponData);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate coupon'
      });
    }
  }
}