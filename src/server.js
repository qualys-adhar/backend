/**
 * Server Entry Point
 *
 * Starts the Express server and connects to MongoDB.
 */
import mongoose from "mongoose";
import { app } from "./app";
import { config } from "./config/env";
import { mlService } from "./ml/ml.service";
const PORT = config.server.port;
/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        await mongoose.connect(config.mongodb.uri);
        console.log("✓ Connected to MongoDB");
    }
    catch (error) {
        console.error("✗ MongoDB connection failed:", error);
        process.exit(1);
    }
}
/**
 * Check ML service availability
 */
async function checkMLService() {
    try {
        const isHealthy = await mlService.healthCheck();
        if (isHealthy) {
            console.log("✓ ML service is healthy");
        }
        else {
            console.warn("⚠ ML service is not healthy");
        }
    }
    catch (error) {
        console.warn("⚠ Could not connect to ML service");
    }
}
/**
 * Start the server
 */
async function start() {
    console.log("Starting Book Recommendation API...");
    console.log(`Environment: ${config.server.env}`);
    // Connect to database
    await connectDB();
    // Check ML service
    await checkMLService();
    // Start HTTP server
    app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
        console.log(`  API: http://localhost:${PORT}`);
        console.log(`  Health: http://localhost:${PORT}/health`);
        console.log("");
    });
}
/**
 * Graceful shutdown
 */
process.on("SIGTERM", async () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    await mongoose.connection.close();
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    await mongoose.connection.close();
    process.exit(0);
});
// Start the application
start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
