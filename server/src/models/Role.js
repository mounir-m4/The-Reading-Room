import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins.js';

export const PERMISSIONS = [
  'books.view', 'books.create', 'books.edit', 'books.delete',
  'categories.view', 'categories.manage',
  'authors.view', 'authors.manage',
  'orders.view', 'orders.manage', 'orders.refund',
  'customers.view', 'customers.manage',
  'inventory.view', 'inventory.manage',
  'reviews.manage', 'coupons.manage',
  'cms.manage', 'shipping.manage', 'payments.manage',
  'settings.manage', 'users.manage',
  'analytics.view', 'reports.export',
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['Super Admin', 'Administrator', 'Content Manager', 'Order Manager', 'Inventory Manager', 'Marketing Manager'],
    },
    slug: { type: String, required: true, unique: true },
    description: String,
    permissions: [{ type: String, enum: PERMISSIONS }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

toJSONPlugin(roleSchema);
export const Role = mongoose.model('Role', roleSchema);
