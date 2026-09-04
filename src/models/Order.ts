import { Schema, model, models, Document, Types } from "mongoose";

export type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled" | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface IOrderItem {
  product: Types.ObjectId;
  productSnapshot: {
    name: string;
    model: string;
    image: string;
    price: number;
  };
  quantity: number;
  unitPrice: number;
  total: number;
}

export type LeanOrder = Omit<IOrder, keyof Document> & {
  _id: Types.ObjectId;
};

export interface IOrder extends Document {
  orderNumber: string;
  user?: Types.ObjectId;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
    };
  };
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "paystack" | "whatsapp" | "bank_transfer";
  paystackReference?: string;
  paystackAccessCode?: string;
  notes?: string;
  statusHistory: { status: OrderStatus; timestamp: Date; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productSnapshot: { name: String, model: String, image: String, price: Number },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    customerInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { street: String, city: String, state: String, country: { type: String, default: "Nigeria" } },
    },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending","confirmed","processing","shipped","delivered","cancelled","refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["paystack", "whatsapp", "bank_transfer"],
      required: true,
    },
    paystackReference: String,
    paystackAccessCode: String,
    notes: String,
    statusHistory: [
      { status: String, timestamp: { type: Date, default: Date.now }, note: String },
    ],
  },
  { timestamps: true },
);

// Note: orderNumber index is created automatically via unique:true on the field above
OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = models.Order ?? model<IOrder>("Order", OrderSchema);
