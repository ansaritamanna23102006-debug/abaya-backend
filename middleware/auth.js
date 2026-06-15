import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { connectDB } from "../config/db.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "abaya_secret_access_key_premium_luxury_123!";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "abaya_secret_refresh_key_premium_luxury_789!";

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
  );

  return { accessToken, refreshToken };
}

/**
 * Helper to authenticate request and check role permissions.
 * Returns the authenticated user object or throws an error.
 */
export async function authenticate(req, allowedRoles = []) {
  await connectDB();

  const authHeader = req.headers["authorization"] || req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authentication credentials were not provided");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error("User associated with token not found");
    }

    if (user.status === "Suspended") {
      throw new Error("Your account has been suspended");
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      throw new Error("You do not have permission to access this resource");
    }

    return user;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    throw new Error(err.message || "Invalid authentication token");
  }
}
