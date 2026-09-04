import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: "customer" | "admin";
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    image: { type: String },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "Nigeria" },
    },
    googleId: { type: String },
  },
  { timestamps: true },
);

export const User = models.User ?? model<IUser>("User", UserSchema);
