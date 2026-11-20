import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, required: true },
    subjectType: { type: String, enum: ['User', 'Admin'], required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: String,
    userAgent: String,
    ip: String,
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
