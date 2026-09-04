import { Router, Request, Response, NextFunction } from "express";
import { protect, adminOnly } from "../middleware/auth";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { AdminLog } from "../models/AdminLog";

const router = Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

/** GET /api/admin/stats */
router.get("/stats", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalProducts, totalOrders, totalCustomers, revenueAgg] = await Promise.all([
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
      totalRevenue: revenueAgg[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/users */
router.get("/users", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) ?? "1");
    const limit = 20;

    const [users, total] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/logs */
router.get("/logs", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page  = parseInt((req.query.page   as string) ?? "1");
    const limit = parseInt((req.query.limit  as string) ?? "50");
    const action = req.query.action as string | undefined;
    const severity = req.query.severity as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (action)   filter.action   = action;
    if (severity) filter.severity = severity;

    const [logs, total] = await Promise.all([
      AdminLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/admin/logs — clear all logs (critical action) */
router.delete("/logs", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AdminLog.deleteMany({});
    res.json({ success: true, message: "All logs cleared" });
  } catch (err) {
    next(err);
  }
});

export default router;
