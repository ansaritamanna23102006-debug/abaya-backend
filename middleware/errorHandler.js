import { connectDB } from "../config/db.js";
import { rateLimit } from "./rateLimiter.js";
import { ZodError } from "zod";

/**
 * Express middleware for Database Connection and Rate Limiting.
 */
export async function dbAndRateLimitMiddleware(req, res, next) {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Rate Limiting Check
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(/, /)[0] : (req.socket.remoteAddress || "127.0.0.1");
    
    const rateCheck = await rateLimit(ip, 120, 60); // relaxed rate limit
    if (!rateCheck.success) {
      res.setHeader("Retry-After", Math.round((rateCheck.reset - Date.now()) / 1000).toString());
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        reset: rateCheck.reset,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Global Express Error Handling Middleware.
 */
export function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Zod Schema Validation Error (400)
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Input validation failed",
      errors: error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    });
  }

  // Authentication/Authorization Errors (401/403)
  const unauthorizedMessages = [
    "unauthorized",
    "credentials were not provided",
    "expired",
    "permission to access",
    "suspended",
    "invalid authentication token",
    "authentication required"
  ];
  const isAuthError = unauthorizedMessages.some((msg) =>
    error.message?.toLowerCase().includes(msg)
  );

  if (isAuthError) {
    const isForbidden = (error.message || "").toLowerCase().includes("permission");
    return res.status(isForbidden ? 403 : 401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }

  // Log all other unexpected critical errors (500, etc.)
  console.error(`[API ERROR] ${req.method} ${req.url}:`, error);

  // Duplicate Key MongoDB Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // Default Server Error
  return res.status(500).json({
    success: false,
    message: error.message || "An unexpected system error occurred",
  });
}

// Helper wrapper to handle async routes catching exceptions and passing to next()
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
