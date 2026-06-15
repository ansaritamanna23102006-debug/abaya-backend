import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;
let useMemoryDb = true;

// In-Memory cache fallback implementation
const memoryCache = new Map();
const memoryExpiry = new Map();

const localMemoryClient = {
  get: async (key) => {
    const expiresAt = memoryExpiry.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      memoryCache.delete(key);
      memoryExpiry.delete(key);
      return null;
    }
    return memoryCache.get(key) || null;
  },
  set: async (key, value, options = {}) => {
    memoryCache.set(key, value);
    if (options.EX) {
      memoryExpiry.set(key, Date.now() + options.EX * 1000);
    }
    return "OK";
  },
  del: async (key) => {
    memoryCache.delete(key);
    memoryExpiry.delete(key);
    return 1;
  },
  flushAll: async () => {
    memoryCache.clear();
    memoryExpiry.clear();
    return "OK";
  },
  isOpen: true,
};

if (REDIS_URL) {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => {
      console.warn("Redis client error, falling back to local memory:", err);
      useMemoryDb = true;
    });
    redisClient.connect().then(() => {
      console.log("Redis cache connected successfully");
      useMemoryDb = false;
    }).catch((err) => {
      console.warn("Redis connection failed, using memory cache:", err);
      useMemoryDb = true;
    });
  } catch (e) {
    console.warn("Could not instantiate Redis, using memory cache:", e);
    useMemoryDb = true;
  }
}

export const getCacheClient = () => {
  if (useMemoryDb || !redisClient) {
    return localMemoryClient;
  }
  return redisClient;
};
