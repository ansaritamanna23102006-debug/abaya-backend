import { getCacheClient } from "../config/redis.js";

/**
 * IP-based rate limiting helper.
 * @param {string} ip Client IP address
 * @param {number} limit Max requests allowed in timeframe
 * @param {number} windowInSecs Time window in seconds
 */
export async function rateLimit(ip, limit = 60, windowInSecs = 60) {
  const cache = getCacheClient();
  const key = `rl:${ip}`;

  try {
    const record = await cache.get(key);
    const now = Date.now();

    if (!record) {
      const data = {
        count: 1,
        resetTime: now + windowInSecs * 1000
      };
      await cache.set(key, JSON.stringify(data), { EX: windowInSecs });
      return { success: true, count: 1, reset: data.resetTime };
    }

    const { count, resetTime } = JSON.parse(record);

    if (now > resetTime) {
      const data = {
        count: 1,
        resetTime: now + windowInSecs * 1000
      };
      await cache.set(key, JSON.stringify(data), { EX: windowInSecs });
      return { success: true, count: 1, reset: data.resetTime };
    }

    if (count >= limit) {
      return { success: false, count, reset: resetTime };
    }

    const updatedData = {
      count: count + 1,
      resetTime
    };
    const secondsRemaining = Math.max(1, Math.round((resetTime - now) / 1000));
    await cache.set(key, JSON.stringify(updatedData), { EX: secondsRemaining });

    return { success: true, count: count + 1, reset: resetTime };
  } catch (err) {
    console.error("Rate limiter failure, bypassing checks:", err);
    return { success: true, count: 1, reset: Date.now() + windowInSecs * 1000 };
  }
}
