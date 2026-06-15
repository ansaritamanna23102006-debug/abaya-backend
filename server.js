import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dbAndRateLimitMiddleware, errorMiddleware, asyncHandler } from "./middleware/errorHandler.js";
import { AuthService } from "./services/AuthService.js";
import { ProductService } from "./services/ProductService.js";
import { OrderService } from "./services/OrderService.js";
import { CouponService } from "./services/CouponService.js";
import { ReviewService } from "./services/ReviewService.js";
import { AnalyticsService } from "./services/AnalyticsService.js";
import { authenticate } from "./middleware/auth.js";
import {
  RegisterSchema,
  LoginSchema,
  ProductCreateSchema,
  OrderCreateSchema,
  CouponCreateSchema,
  ReviewCreateSchema
} from "./utils/validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Connect to Database & check rate limiting for all /api requests
app.use("/api", dbAndRateLimitMiddleware);

// --- AUTH ROUTES ---
app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const validated = RegisterSchema.parse(req.body);
  const result = await AuthService.register(validated);
  res.status(201).json({ success: true, message: "Registration successful", data: result });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const validated = LoginSchema.parse(req.body);
  const result = await AuthService.login(validated);
  res.json({ success: true, message: "Login successful", data: result });
}));

app.post("/api/auth/logout", asyncHandler(async (req, res) => {
  let user = null;
  try {
    user = await authenticate(req);
  } catch (e) {
    // Guest/bypass
  }
  const result = await AuthService.logout(user, req.body.refreshToken);
  res.json(result);
}));

app.post("/api/auth/refresh", asyncHandler(async (req, res) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  res.json({ success: true, data: result });
}));

app.get("/api/auth/verify-email", asyncHandler(async (req, res) => {
  const token = req.query.token;
  await AuthService.verifyEmail(token);
  res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?verified=true`);
}));

app.post("/api/auth/forgot-password", asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  res.json(result);
}));

app.post("/api/auth/reset-password", asyncHandler(async (req, res) => {
  const result = await AuthService.resetPassword(req.body.token, req.body.password);
  res.json(result);
}));

// --- PRODUCTS ROUTES ---
app.get("/api/products", asyncHandler(async (req, res) => {
  const { query, category, fabric, minPrice, maxPrice, sort, suggest } = req.query;

  if (suggest) {
    const suggestions = await ProductService.getSearchSuggestions(suggest);
    return res.json({ success: true, data: suggestions });
  }

  if (query || category || fabric || minPrice !== undefined || maxPrice !== undefined || sort) {
    const results = await ProductService.searchProducts({
      query,
      category,
      fabric,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort
    });
    return res.json({ success: true, data: results });
  }

  const all = await ProductService.getAllProducts();
  res.json({ success: true, data: all });
}));

app.post("/api/products", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const validated = ProductCreateSchema.parse(req.body);

  if (!validated.slug) {
    validated.slug = validated.id || validated.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  const result = await ProductService.createProduct(validated);
  res.status(201).json({ success: true, message: "Product created successfully", data: result });
}));

app.delete("/api/products/:id", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const result = await ProductService.softDeleteProduct(req.params.id);
  res.json({ success: true, message: "Product soft-deleted successfully", data: result });
}));

// --- ORDERS ROUTES ---
app.get("/api/orders", asyncHandler(async (req, res) => {
  let user = null;
  let filter = {};

  try {
    user = await authenticate(req);
    if (user.role === "Customer") {
      filter = { user: user._id };
    }
  } catch (e) {
    const email = req.query.email;
    if (email) {
      filter = { email };
    } else {
      throw new Error("Authentication required to view order history");
    }
  }

  const result = await OrderService.getAllOrders(filter);
  res.json({ success: true, data: result });
}));

app.post("/api/orders", asyncHandler(async (req, res) => {
  let user = null;
  try {
    user = await authenticate(req);
  } catch (e) {
    // Guest
  }

  const validated = OrderCreateSchema.parse(req.body);
  const result = await OrderService.createOrder(validated, user);
  res.status(201).json({ success: true, message: "Order initiated successfully", data: result });
}));

app.put("/api/orders/:id", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const result = await OrderService.updateOrderStatus(req.params.id, req.body.status);
  res.json({ success: true, message: "Order status updated", data: result });
}));

app.post("/api/orders/:id/verify", asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const result = await OrderService.verifyAndPayOrder({
    orderId: req.params.id,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  });
  res.json({ success: true, message: "Payment verified successfully", data: result });
}));

// --- COUPONS ROUTES ---
app.get("/api/coupons", asyncHandler(async (req, res) => {
  const all = await CouponService.getAllCoupons();
  res.json({ success: true, data: all });
}));

app.post("/api/coupons", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const validated = CouponCreateSchema.parse(req.body);
  const result = await CouponService.createCoupon(validated);
  res.status(201).json({ success: true, message: "Coupon created successfully", data: result });
}));

app.delete("/api/coupons/:code", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const result = await CouponService.deleteCoupon(req.params.code);
  res.json({ success: true, message: "Coupon deleted successfully", data: result });
}));

app.post("/api/coupons/validate", asyncHandler(async (req, res) => {
  const result = await CouponService.validateCoupon(req.body.code);
  res.json({ success: true, data: result });
}));

// --- REVIEWS ROUTES ---
app.get("/api/reviews", asyncHandler(async (req, res) => {
  const all = await ReviewService.getAllReviews();
  res.json({ success: true, data: all });
}));

app.post("/api/reviews", asyncHandler(async (req, res) => {
  const validated = ReviewCreateSchema.parse(req.body);
  const result = await ReviewService.createReview(validated);
  res.status(201).json({ success: true, message: "Review submitted successfully", data: result });
}));

// --- ADMIN ROUTES ---
app.get("/api/admin/analytics", asyncHandler(async (req, res) => {
  await authenticate(req, ["Admin", "Super Admin"]);
  const stats = await AnalyticsService.getDashboardMetrics();
  res.json({ success: true, data: stats });
}));

// Global Error Handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
