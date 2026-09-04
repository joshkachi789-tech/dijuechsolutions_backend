import "dotenv/config";
import dns from "dns";
import app from "./app";
import { connectDB } from "./lib/db";

// Force Google DNS for all DNS lookups in this process
// Bypasses ISP DNS blocking of mongodb.net SRV records
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const PORT = parseInt(process.env.PORT ?? "5000");

async function start() {
  // Fail fast with a clear message if required env vars are missing
  const mongoUri = process.env.MONGODB_URI ?? "";
  if (!mongoUri || mongoUri.includes("REPLACE_USER") || mongoUri.includes("REPLACE_PASSWORD")) {
    console.error("❌  MONGODB_URI is not configured.");
    console.error("   Open backend/.env and set a valid MongoDB connection string.");
    process.exit(1);
  }
  try {
    await connectDB();
    // Listen on 0.0.0.0 so the backend is reachable from local network + ngrok
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
      console.log(`   Network: http://192.168.100.8:${PORT}`);
      console.log(`   ENV: ${process.env.NODE_ENV}`);
      console.log(`   Frontend: ${process.env.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err);
    process.exit(1);
  }
}

start();
