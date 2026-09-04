import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payments";
import accountRoutes from "./routes/account";
import adminRoutes from "./routes/admin";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

// ─── Security ──────────────────────────────────────────────────────────────
app.use(helmet({
  // Allow ngrok tunnels in development
  crossOriginEmbedderPolicy: process.env.NODE_ENV !== "development",
}));

const allowedOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:3000",
  "http://localhost:3000",
  "http://192.168.100.8:3000",  // local network
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow localhost in any form
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }
      // Allow ngrok tunnels (both .app and .dev domains)
      if (origin.includes("ngrok")) return callback(null, true);
      // Allow explicitly configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  }),
);

// Rate limit all API requests
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 200,
    message: { error: "Too many requests, please try again later" },
  }),
);

// Stricter rate limit on auth routes
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many auth attempts, please try again later" },
  }),
);

// Handle CORS preflight for all routes
app.options("*", cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    if (origin.includes("ngrok")) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
}));

// ─── Parsing ───────────────────────────────────────────────────────────────
// Raw body needed for Paystack webhook signature check
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));  // 10mb for base64 image uploads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/account", accountRoutes);   // was "/api" — fix 404 on profile

// ─── Error handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
