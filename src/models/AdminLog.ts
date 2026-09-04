import { Schema, model, models, Document, Types } from "mongoose";

export type LogAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_PRODUCT"
  | "UPDATE_PRODUCT"
  | "DELETE_PRODUCT"
  | "UPDATE_ORDER"
  | "DELETE_ORDER"
  | "UPDATE_USER_ROLE"
  | "VIEW_DASHBOARD"
  | "VIEW_ORDERS"
  | "VIEW_PRODUCTS"
  | "PAYSTACK_WEBHOOK";

export interface IAdminLog extends Document {
  admin: Types.ObjectId;
  adminEmail: string;
  action: LogAction;
  description: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  severity: "info" | "warning" | "critical";
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  { timestamps: true },
);

AdminLogSchema.index({ admin: 1 });
AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ action: 1 });

export const AdminLog = models.AdminLog ?? model<IAdminLog>("AdminLog", AdminLogSchema);
