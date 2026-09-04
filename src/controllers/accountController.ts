import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

/** GET /api/account/profile */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** PATCH /api/account/profile */
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, phone, address } = req.body as {
      name?: string;
      phone?: string;
      address?: { street?: string; city?: string; state?: string; country?: string };
    };

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { name, phone, address },
      { new: true },
    ).lean();

    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/account/password */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    // Fetch user with password field
    const user = await User.findById(req.user!.id).select("+password");
    if (!user || !user.password) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/users  — admin only */
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({ role: "customer" })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments({ role: "customer" }),
    ]);

    res.json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/stats  — admin dashboard numbers */
export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = await import("../models/Product");
    const { Order } = await import("../models/Order");

    const [totalProducts, totalOrders, totalCustomers, revenue] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    res.json({
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue: revenue[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
}
