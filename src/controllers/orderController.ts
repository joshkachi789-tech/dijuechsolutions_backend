import { Request, Response, NextFunction } from "express";
import { Order, OrderStatus, type LeanOrder } from "../models/Order";
import { generateOrderNumber } from "../lib/orderUtils";
import { writeLog } from "../lib/logger";

/** GET /api/orders  — admin sees all, customer sees own */
export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = "1", limit = "20", status } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any =
      req.user!.role === "admin" ? {} : { user: req.user!.id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({ orders, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/:id */
export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderNumber: req.params.id }],
    }).lean<LeanOrder>();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Customer can only see their own order
    if (
      req.user!.role !== "admin" &&
      order.user?.toString() !== req.user!.id
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
}

/** POST /api/orders  — create new order (auth optional for guest checkout) */
export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { customerInfo, items, paymentMethod, deliveryFee = 0, notes } = req.body as {
      customerInfo: { name: string; email: string; phone: string; address?: object };
      items: { product: string; productSnapshot: object; quantity: number; unitPrice: number }[];
      paymentMethod: string;
      deliveryFee?: number;
      notes?: string;
    };

    if (!customerInfo || !items?.length || !paymentMethod) {
      res.status(400).json({ error: "customerInfo, items and paymentMethod are required" });
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user?.id,
      customerInfo,
      items: items.map((i) => ({ ...i, total: i.unitPrice * i.quantity })),
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      notes,
      statusHistory: [{ status: "pending", timestamp: new Date() }],
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/orders/:id  — admin updates status; customer can cancel pending */
export async function updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderNumber: req.params.id }],
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (req.user!.role === "admin") {
      const { status, paymentStatus, statusNote, notes } = req.body as {
        status?: OrderStatus;
        paymentStatus?: string;
        statusNote?: string;
        notes?: string;
      };

      if (status && status !== order.status) {
        order.status = status;
        order.statusHistory.push({ status, timestamp: new Date(), note: statusNote });
      }
      if (paymentStatus) order.paymentStatus = paymentStatus as "unpaid" | "paid" | "failed" | "refunded";
      if (notes !== undefined) order.notes = notes;
    } else {
      // Customer can only cancel their own pending order
      if (
        order.user?.toString() !== req.user!.id ||
        req.body.status !== "cancelled" ||
        order.status !== "pending"
      ) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      order.status = "cancelled";
      order.statusHistory.push({ status: "cancelled", timestamp: new Date() });
    }

    await order.save();
    void writeLog({
      req,
      action: "UPDATE_ORDER",
      description: `Order ${order.orderNumber} → status: ${order.status}, payment: ${order.paymentStatus}`,
      metadata: { orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
}
