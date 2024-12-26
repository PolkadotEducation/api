import { redisClient } from "@/redis";

export const setCache = async <T>(key: string, value: T, ttl: number = 86400): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error("[SetCache]", err);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cachedData = await redisClient.get(key);
    return cachedData ? (JSON.parse(cachedData) as T) : null;
  } catch (err) {
    console.error("[GetCache]", err);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error("[DelCache]", err);
  }
};
