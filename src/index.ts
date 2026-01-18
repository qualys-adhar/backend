import { serve } from "@hono/node-server";
import app from "./app";
import { showRoutes } from "hono/dev";
import { cors } from "hono/cors";
import { connectDB } from "./db/mongo";
// import { env } from "./config/env";
import dotenv from "dotenv";

dotenv.config();

// const port = env.port;
const port = Number(process.env.PORT) || 3000;
showRoutes(app);

if (process.env.MONGO_URI) {
  connectDB(process.env.MONGO_URI).catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
} else {
  console.error("MONGO_URI is not defined in environment variables");
  process.exit(1);
}


// Enable CORS for all routes with default permissive settings
app.use("/*", cors());
serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(
      `server running on http://localhost:${info.port}`
    );
  }
);
