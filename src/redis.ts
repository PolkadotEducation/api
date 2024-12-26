import { createClient } from "redis";
import { env } from "./environment";

const redisClient = createClient({
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => {
  console.error("[RedisError]:", err);
});

const connectRedis = async () => {
  await redisClient.connect();
};

const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
};

export { redisClient, connectRedis, disconnectRedis };
