import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { signToken, cookieOptions } from "../lib/jwt";
import { writeLog } from "../lib/logger";
import { getGoogleAuthUrl, getGoogleUser } from "../lib/google";

/** POST /api/auth/register */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
    res.cookie("token", token, cookieOptions());

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
    res.cookie("token", token, cookieOptions());

    // Log admin logins
    if (user.role === "admin") {
      req.user = { id: user._id.toString(), email: user.email, role: user.role };
      void writeLog({
        req,
        action: "LOGIN",
        description: `Admin login from ${req.ip ?? "unknown IP"}`,
        severity: "info",
      });
    }

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export function logout(req: Request, res: Response): void {
  if (req.user?.role === "admin") {
    void writeLog({
      req,
      action: "LOGOUT",
      description: "Admin logged out",
      severity: "info",
    });
  }
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
}

/** GET /api/auth/me */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/token-exchange — called from the frontend OAuth callback page */
export async function tokenExchange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    // Verify the token is valid before setting the cookie
    const { verifyToken } = await import("../lib/jwt");
    const payload = verifyToken(token);

    // Set the httpOnly cookie — this request comes from localhost:3000 so cookie domain matches
    const { cookieOptions } = await import("../lib/jwt");
    res.cookie("token", token, cookieOptions());

    res.json({ ok: true, user: { id: payload.id, email: payload.email, role: payload.role } });
  } catch (err) {
    next(err);
  }
}
export function googleRedirect(_req: Request, res: Response): void {
  const url = getGoogleAuthUrl();
  res.redirect(url);
}

/** GET /api/auth/google/callback — handle Google response */
export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";

  try {
    const code = req.query.code as string | undefined;
    console.log("[Google OAuth] callback hit, code present:", !!code);

    if (!code) {
      console.error("[Google OAuth] no code in query:", req.query);
      res.redirect(`${FRONTEND}/login?error=google_failed`);
      return;
    }

    console.log("[Google OAuth] exchanging code for user...");
    const googleUser = await getGoogleUser(code);
    console.log("[Google OAuth] got user:", googleUser.email, "verified:", googleUser.email_verified);

    if (!googleUser.email_verified) {
      res.redirect(`${FRONTEND}/login?error=email_not_verified`);
      return;
    }

    // Upsert — find by googleId OR email, then update/create
    let user = await User.findOne({
      $or: [{ googleId: googleUser.sub }, { email: googleUser.email.toLowerCase() }],
    });

    if (user) {
      // Link Google account to existing email user if not yet linked
      if (!user.googleId) {
        user.googleId = googleUser.sub;
        if (!user.image && googleUser.picture) user.image = googleUser.picture;
        await user.save();
      }
    } else {
      // New user via Google
      user = await User.create({
        name:     googleUser.name,
        email:    googleUser.email.toLowerCase(),
        image:    googleUser.picture,
        googleId: googleUser.sub,
        role:     "customer",
      });
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });

    // Can't set httpOnly cookie cross-origin (5000 → 3000).
    // Pass the token as a URL param — the frontend reads it, calls /api/auth/me, and stores the session.
    res.redirect(`${FRONTEND}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    res.redirect(`${FRONTEND}/login?error=google_failed&detail=${encodeURIComponent(errMsg)}`);
  }
}
