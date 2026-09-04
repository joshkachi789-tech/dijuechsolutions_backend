import { Schema, model, models, Document } from "mongoose";

/** Omit Document.model — conflicts with product model number field */
export interface IProduct extends Omit<Document, "model"> {
  name: string;
  slug: string;
  model: string;
  description: string;
  shortDescription: string;
  price: number;
  currency: "NGN";
  category: string;
  image: string;
  gallery: string[];
  featured: boolean;
  inStock: boolean;
  stockQuantity: number;
  specs: Map<string, string>;
  cloudinaryPublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    gallery: [{ type: String }],
    featured: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },
    specs: { type: Map, of: String, default: {} },
    cloudinaryPublicId: { type: String },
  },
  { timestamps: true },
);

ProductSchema.index({ name: "text", description: "text", category: "text" });
// Note: slug index is created automatically via unique:true on the field above
ProductSchema.index({ category: 1 });
ProductSchema.index({ featured: 1 });

export const Product = models.Product ?? model<IProduct>("Product", ProductSchema);
