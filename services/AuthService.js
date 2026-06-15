import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { generateTokens } from "../middleware/auth.js";
import { sendMail } from "../config/nodemailer.js";
import crypto from "crypto";

export class AuthService {
  static async register({ name, email, password, phone }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Check if this is the first user; if so, make them Super Admin.
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? "Super Admin" : "Customer";

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      verificationToken,
      emailVerified: false,
    });

    // Send verification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

    await sendMail({
      to: email,
      subject: "Welcome to Abaya by Tabassum - Verify Your Email",
      html: `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; padding: 30px; background-color: #0b0c10; color: #c5c6c7;">
          <h2 style="color: #d4af37; font-weight: 300; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Abaya By Tabassum</h2>
          <hr style="border: 0; border-top: 1px solid #d4af37; margin-bottom: 25px;">
          <p style="font-size: 16px; font-weight: 300;">Dear ${name},</p>
          <p style="font-weight: 300; line-height: 1.6;">Thank you for registering at Abaya by Tabassum. To experience our exclusive lookbook collections and place orders, please confirm your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #d4af37; color: #0b0c10; padding: 12px 30px; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 0; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="font-size: 12px; color: #888; text-align: center;">If you did not request this registration, please ignore this email.</p>
        </div>
      `,
      text: `Welcome to Abaya by Tabassum. Please verify your email at: ${verificationUrl}`
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens.push(refreshToken);
    await user.save();

    return {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
      accessToken,
      refreshToken
    };
  }

  static async login({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    if (user.status === "Suspended") {
      throw new Error("Your account has been suspended by administration.");
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    // Clear old tokens and save new refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    return {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
      accessToken,
      refreshToken
    };
  }

  static async logout(user, refreshToken) {
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    return { success: true };
  }

  static async refreshToken(token) {
    if (!token) throw new Error("Refresh token required");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || "abaya_secret_refresh_key_premium_luxury_789!");
    } catch (e) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(token)) {
      throw new Error("Refresh token reuse detected or invalid user");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
  }

  static async verifyEmail(token) {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return { success: true, message: "Email verified successfully" };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak registered accounts, return generic success message
      return { success: true, message: "If the email is registered, a reset link will be sent shortly." };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/forgot-password?token=${resetToken}`;

    await sendMail({
      to: email,
      subject: "Password Reset Request - Abaya by Tabassum",
      html: `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; padding: 30px; background-color: #0b0c10; color: #c5c6c7;">
          <h2 style="color: #d4af37; font-weight: 300; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Abaya By Tabassum</h2>
          <hr style="border: 0; border-top: 1px solid #d4af37; margin-bottom: 25px;">
          <p style="font-size: 16px; font-weight: 300;">Dear Client,</p>
          <p style="font-weight: 300; line-height: 1.6;">You requested a password reset for your account. Please click the button below to specify your new credentials (valid for 1 hour):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #d4af37; color: #0b0c10; padding: 12px 30px; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 0; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #888; text-align: center;">If you did not request this update, please ignore this email.</p>
        </div>
      `,
      text: `Reset your password here: ${resetUrl}`
    });

    return { success: true, message: "Reset link dispatched." };
  }

  static async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error("Password reset token is invalid or has expired.");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens = []; // Log out all active sessions for security
    await user.save();

    return { success: true, message: "Password updated successfully." };
  }
}
