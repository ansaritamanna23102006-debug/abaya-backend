import Coupon from "../models/Coupon.js";

export class CouponService {
  static async seedIfNeeded() {
    const count = await Coupon.countDocuments({});
    if (count === 0) {
      console.log("Seeding default coupons...");
      await Coupon.create([
        { code: "ATELIER10", discountPercent: 10, isActive: true },
        { code: "MODESTY", discountPercent: 15, isActive: true },
      ]);
    }
  }

  static async getAllCoupons() {
    await this.seedIfNeeded();
    return Coupon.find({ isActive: true });
  }

  static async validateCoupon(code) {
    await this.seedIfNeeded();
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      throw new Error("Invalid or inactive coupon code");
    }

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      throw new Error("This coupon has expired");
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error("This coupon usage limit has been reached");
    }

    return coupon;
  }

  static async createCoupon(couponData) {
    const existing = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existing) throw new Error("Coupon with this code already exists");

    return Coupon.create(couponData);
  }

  static async deleteCoupon(code) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) throw new Error("Coupon not found");
    coupon.isActive = false;
    await coupon.save();
    return coupon;
  }
}
