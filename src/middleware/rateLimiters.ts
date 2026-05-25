import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis";

const createStore = (prefix: string) => {
  if (process.env.NODE_ENV === "test") return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  });
};

export const localLimiter = rateLimit({
  store: createStore("local"),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

export const apiLimiter = rateLimit({
  store: createStore("api"),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  message: "Too many requests to the API, please try again later."
});

export const loginLimiter = rateLimit({
  store: createStore("login"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Too many login attempts, please try again later."
});

export const publicLimiter = rateLimit({
  store: createStore("public"),
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: "Too many requests to public endpoints."
});
