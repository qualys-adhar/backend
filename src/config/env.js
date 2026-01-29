import { z } from "zod";
const schema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    PORT: z.string().default("3000"),
    // AWS S3
    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_S3_BUCKET: z.string(),
    // MongoDB Atlas
    MONGO_URI: z.string(),
    // ML Service (FastAPI)
    ML_SERVICE_URL: z.string().default("http://localhost:8000"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error("Environment validation failed", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
}
export const env = process.env;
