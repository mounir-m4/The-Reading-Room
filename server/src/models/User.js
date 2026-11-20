import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { toJSONPlugin } from './plugins.js';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    fullName: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    region: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'Morocco' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['customer'], default: 'customer' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ['en', 'fr', 'ar'], default: 'en' },
    currency: { type: String, enum: ['MAD', 'EUR', 'USD', 'GBP'], default: 'MAD' },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ createdAt: -1 });
toJSONPlugin(userSchema);

export const User = mongoose.model('User', userSchema);
export const Address = mongoose.model('Address', addressSchema);
