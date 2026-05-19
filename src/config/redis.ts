import { createClient } from "redis";
import { log } from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: redisUrl,
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
