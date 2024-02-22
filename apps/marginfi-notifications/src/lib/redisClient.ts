// lib/redisClient.ts
import { createClient } from "redis";
import { env_config } from "../config"; // Adjust the path as necessary

const redisClient = createClient({
  url: env_config.REDIS_URL, // Use Redis URL from env_config
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

export default redisClient;
