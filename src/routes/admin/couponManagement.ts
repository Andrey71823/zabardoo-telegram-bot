import { Router } from 'express';
import { CouponManagementController } from '../../controllers/admin/CouponManagementController';

const router = Router();
const couponController = new CouponManagementController();

// Coupon CRUD operations
router.get('/coupons', couponController.getCoupons.bind(couponController));
router.get('/coupons/stats', couponController.getCouponStats.bind(couponController));
router.get('/coupons/templates', couponController.getCouponTemplates.bind(couponController));
router.get('/coupons/pending-moderation', couponController.getPendingModerationCoupons.bind(couponController));
router.get('/coupons/search', couponController.searchCoupons.bind(couponController));
router.get('/coupons/store/:store', couponController.getCouponsByStore.bind(couponController));
router.get('/coupons/category/:category', couponController.getCouponsByCategory.bind(couponController));
router.get('/coupons/:id', couponController.getCouponById.bind(couponController));
router.get('/coupons/:id/performance', couponController.getCouponPerformance.bind(couponController));

router.post('/coupons', couponController.createCoupon.bind(couponController));
router.post('/coupons/bulk-operation', couponController.performBulkOperation.bind(couponController));
router.post('/coupons/validate', couponController.validateCoupon.bind(couponController));
router.post('/coupons/:id/duplicate', couponController.duplicateCoupon.bind(couponController));

router.put('/coupons/:id', couponController.updateCoupon.bind(couponController));
router.put('/coupons/:id/moderate', couponController.moderateCoupon.bind(couponController));

router.delete('/coupons/:id', couponController.deleteCoupon.bind(couponController));

export default router;