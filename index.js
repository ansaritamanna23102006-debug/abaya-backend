/**
 * Abaya by Tabassum — Backend Service Library
 * 
 * This module is NOT a standalone server. It is a library of Mongoose models,
 * business services, middleware, and config utilities consumed by Next.js 
 * App Router API routes in the frontend.
 * 
 * Usage from API routes:
 *   import { ProductService } from "@/backend/services/ProductService";
 *   import { authenticate } from "@/backend/middleware/auth";
 *   import { withErrorHandler } from "@/backend/middleware/errorHandler";
 */

// --- Models ---
export { default as User } from "./models/User";
export { default as Product } from "./models/Product";
export { default as Order } from "./models/Order";
export { default as Category } from "./models/Category";
export { default as Coupon } from "./models/Coupon";
export { default as Review } from "./models/Review";
export { default as Notification } from "./models/Notification";

// --- Services ---
export { AuthService } from "./services/AuthService";
export { ProductService } from "./services/ProductService";
export { OrderService } from "./services/OrderService";
export { CouponService } from "./services/CouponService";
export { ReviewService } from "./services/ReviewService";
export { AnalyticsService } from "./services/AnalyticsService";

// --- Middleware ---
export { authenticate, generateTokens } from "./middleware/auth";
export { withErrorHandler } from "./middleware/errorHandler";
export { rateLimit } from "./middleware/rateLimiter";

// --- Config ---
export { connectDB } from "./config/db";
export { uploadImage } from "./config/cloudinary";
export { sendMail } from "./config/nodemailer";
export { getRazorpayInstance, verifyPaymentSignature } from "./config/razorpay";
export { getCacheClient } from "./config/redis";

// --- Utils ---
export {
  RegisterSchema,
  LoginSchema,
  ProductCreateSchema,
  OrderCreateSchema,
  CouponCreateSchema,
  ReviewCreateSchema,
} from "./utils/validator";
