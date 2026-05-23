import { createClient } from "redis";
import { log } from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
    keepAlive: 30000,
    reconnectStrategy: (retries: number) => {
      const baseDelay = Math.min(100 * Math.pow(2, retries), 30000);
      const jitter = Math.random() * baseDelay * 0.2;
      return baseDelay + jitter;
    },
  },
});

redisClient.on("error", (err) => log(`Redis Client Error: ${err}`, "ERROR"));
redisClient.on("connect", () => log("Connected to Redis successfully"));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    log(`Failed to connect to Redis: ${error}`, "ERROR");
  }
};

export default redisClient;
