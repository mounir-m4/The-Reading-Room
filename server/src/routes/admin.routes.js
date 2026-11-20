import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import * as ops from '../controllers/operationsController.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { validate, couponSchema, adminSchema, shippingZoneSchema } from '../validators/index.js';
import { fromMinor } from '../utils/money.js';

const router = Router();
const guard = [protect, adminOnly];

router.get('/admin/dashboard', ...guard, authorize('analytics.view'), admin.dashboard);
router.get('/admin/analytics/revenue', ...guard, authorize('analytics.view'), admin.dashboard);
router.get('/admin/analytics/orders', ...guard, authorize('analytics.view'), admin.dashboard);
router.get('/admin/analytics/products', ...guard, authorize('analytics.view'), admin.dashboard);
router.get('/admin/reports', ...guard, authorize('analytics.view'), admin.report);

router.get('/admin/customers', ...guard, authorize('customers.view'), admin.listCustomers);
router.get('/admin/customers/:id', ...guard, authorize('customers.view'), admin.getCustomer);
router.put('/admin/customers/:id', ...guard, authorize('customers.manage'), admin.toggleCustomer);

router.get('/admin/admins', ...guard, authorize('users.manage'), admin.listAdmins);
router.post('/admin/admins', ...guard, authorize('users.manage'), validate(adminSchema), admin.createAdmin);
router.put('/admin/admins/:id', ...guard, authorize('users.manage'), admin.updateAdmin);
router.delete('/admin/admins/:id', ...guard, authorize('users.manage'), admin.deleteAdmin);
router.get('/admin/roles', ...guard, authorize('users.manage'), admin.listRoles);
router.put('/admin/roles/:id', ...guard, authorize('users.manage'), admin.updateRole);

router.get('/admin/audit', ...guard, authorize('users.manage'), admin.listAudit);
router.get('/admin/notifications', ...guard, admin.listNotifications);
router.post('/admin/notifications/read-all', ...guard, admin.markAllRead);
router.put('/admin/notifications/:id', ...guard, admin.markNotificationRead);

// Coupons
router.get('/admin/coupons', ...guard, authorize('coupons.manage'), ops.listCoupons);
router.get('/coupons/validate', ops.validateCoupon);
router.post('/admin/coupons', ...guard, authorize('coupons.manage'), validate(couponSchema), ops.createCoupon);
router.put('/admin/coupons/:id', ...guard, authorize('coupons.manage'), validate(couponSchema), ops.updateCoupon);
router.delete('/admin/coupons/:id', ...guard, authorize('coupons.manage'), ops.deleteCoupon);

// Inventory
router.get('/admin/inventory', ...guard, authorize('inventory.view'), ops.inventoryList);
router.get('/admin/inventory/movements', ...guard, authorize('inventory.view'), ops.inventoryMovements);
router.get('/admin/inventory/low-stock', ...guard, authorize('inventory.view'), ops.lowStockAlert);
router.post('/admin/inventory/adjustments', ...guard, authorize('inventory.manage'), ops.adjustStock);

// Shipping
router.get('/shipping/zones', ops.listShippingZones);
router.get('/admin/shipping/zones', ...guard, authorize('shipping.manage'), ops.listShippingZones);
router.post('/admin/shipping/zones', ...guard, authorize('shipping.manage'), validate(shippingZoneSchema), ops.createShippingZone);
router.put('/admin/shipping/zones/:id', ...guard, authorize('shipping.manage'), validate(shippingZoneSchema), ops.updateShippingZone);
router.delete('/admin/shipping/zones/:id', ...guard, authorize('shipping.manage'), ops.deleteShippingZone);

// Payments
router.get('/admin/payments', ...guard, authorize('payments.manage'), ops.listTransactions);
router.post('/admin/payments/:id/refund', ...guard, authorize('payments.manage'), ops.refundPayment);

// Exports (server renders from client-supplied report rows fetched with permissions)
router.post('/admin/export/csv', ...guard, authorize('reports.export'), ops.exportCsv);
router.post('/admin/export/xlsx', ...guard, authorize('reports.export'), ops.exportXlsx);
router.post('/admin/export/pdf', ...guard, authorize('reports.export'), ops.exportPdf);

export default router;
