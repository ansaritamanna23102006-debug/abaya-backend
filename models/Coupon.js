import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  discountPercent: { type: Number, required: true },
  discountFixed: { type: Number, default: 0 },
  type: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
  expiryDate: { type: Date },
  usageLimit: { type: Number, default: 1000 },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
