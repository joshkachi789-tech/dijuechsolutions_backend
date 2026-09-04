import "dotenv/config";
import dns from "dns";
import http from "http";
import https from "https";
import app from "./app";
import { connectDB } from "./lib/db";

// Force Google DNS — bypasses ISP blocking of mongodb.net SRV records
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const PORT = parseInt(process.env.PORT ?? "5000");

// ─── Keep-alive cron job ──────────────────────────────────────────────────
// Pings the health endpoint every 60 seconds to prevent free-tier spin-down.
// Uses the backend's own URL so it works both locally and in production.
function startKeepAlive(port: number) {
  const BASE_URL = process.env.BACKEND_URL ?? `http://localhost:${port}`;
  const isHttps = BASE_URL.startsWith("https://");

  function ping() {
    const url = `${BASE_URL}/api/health`;
    const client = isHttps ? https : http;
    const req = client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        console.log(`[keep-alive] ping ${res.statusCode} — ${new Date().toLocaleTimeString()}`);
      });
    });
    req.on("error", (err) => {
      console.warn(`[keep-alive] ping failed: ${err.message}`);
    });
    req.end();
  }

  // Start pinging every 60 seconds
  const interval = setInterval(ping, 60 * 1000);
  // First ping after 30 seconds (let server fully start first)
  const initial = setTimeout(ping, 30 * 1000);

  // Clean up on process exit
  process.on("SIGTERM", () => { clearInterval(interval); clearTimeout(initial); });
  process.on("SIGINT",  () => { clearInterval(interval); clearTimeout(initial); });

  console.log(`⏰  Keep-alive cron started — pinging ${BASE_URL}/api/health every 60s`);
}

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
      // Start keep-alive after server is listening
      startKeepAlive(PORT);
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err);
    process.exit(1);
  }
}

start();
