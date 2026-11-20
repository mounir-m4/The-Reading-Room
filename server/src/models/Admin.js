import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { toJSONPlugin } from './plugins.js';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    avatar: String,
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ['en', 'fr', 'ar'], default: 'en' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLoginAt: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  { timestamps: true },
);

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.virtual('permissions').get(function permissions() {
  return this.role?.permissions || [];
});

toJSONPlugin(adminSchema);
export const Admin = mongoose.model('Admin', adminSchema);
