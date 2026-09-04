import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  generateReference,
} from "../lib/paystack";

/** POST /api/payments/initialize */
export async function initialize(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.body as { orderId: string };

    const order = await Order.findOne({
      $or: [{ _id: orderId }, { orderNumber: orderId }],
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Only owner or admin
    if (
      req.user?.role !== "admin" &&
      order.user?.toString() !== req.user?.id &&
      order.customerInfo.email !== req.user?.email
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const reference = generateReference(order.orderNumber);
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    const result = await initializePayment({
      email: order.customerInfo.email,
      amount: order.total,
      reference,
      callbackUrl: `${frontendUrl}/checkout/verify?reference=${reference}&order=${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
      },
    });

    order.paystackReference = result.reference;
    order.paystackAccessCode = result.accessCode;
    await order.save();

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/payments/verify?reference=XXX */
export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reference } = req.query as { reference: string };

    if (!reference) {
      res.status(400).json({ error: "reference query param is required" });
      return;
    }

    const result = await verifyPayment(reference);

    if (result.status === "success") {
      await Order.findOneAndUpdate(
        { paystackReference: reference },
        {
          paymentStatus: "paid",
          status: "confirmed",
          $push: {
            statusHistory: {
              status: "confirmed",
              timestamp: new Date(),
              note: `Payment verified. Ref: ${reference}`,
            },
          },
        },
      );
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/payments/webhook  — Paystack server-to-server */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    // express.raw() puts a Buffer in req.body — convert to string for HMAC
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { event, data } = req.body as {
      event: string;
      data: { reference: string; amount: number };
    };

    if (event === "charge.success") {
      await Order.findOneAndUpdate(
        { paystackReference: data.reference },
        {
          paymentStatus: "paid",
          status: "confirmed",
          $push: {
            statusHistory: {
              status: "confirmed",
              timestamp: new Date(),
              note: `Webhook: payment confirmed. Amount: ₦${data.amount / 100}`,
            },
          },
        },
      );
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
