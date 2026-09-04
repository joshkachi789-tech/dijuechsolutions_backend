import { Request } from "express";
import { AdminLog, LogAction } from "../models/AdminLog";

interface LogOptions {
  req: Request;
  action: LogAction;
  description: string;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}

/** Write an admin activity log entry. Fire-and-forget — never throws. */
export async function writeLog(opts: LogOptions): Promise<void> {
  try {
    const { req, action, description, metadata, severity = "info" } = opts;
    if (!req.user) return;

    await AdminLog.create({
      admin: req.user.id,
      adminEmail: req.user.email,
      action,
      description,
      metadata,
      ip: req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress,
      userAgent: req.headers["user-agent"],
      severity,
    });
  } catch {
    // Logging should never crash the main request
  }
}
