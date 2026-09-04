import { Request, Response, NextFunction } from "express";
import { Product } from "../models/Product";
import { uploadImage, deleteImage } from "../lib/cloudinary";
import { writeLog } from "../lib/logger";

/** GET /api/products */
export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search, featured, page = "1", limit = "20" } = req.query as Record<string, string>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (category) query.category = category;
    if (featured === "true") query.featured = true;
    if (search) query.$text = { $search: search };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products/categories */
export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await Product.distinct("category");
    res.json(categories.sort());
  } catch (err) {
    next(err);
  }
}

/** GET /api/products/:slug */
export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.findOne({
      $or: [{ slug: req.params.slug }, { _id: req.params.slug.length === 24 ? req.params.slug : null }],
    }).lean();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
}

/** POST /api/products  — admin */
export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.create(req.body);
    void writeLog({ req, action: "CREATE_PRODUCT", description: `Created product: ${product.name} (${product.model})`, metadata: { productId: product._id, name: product.name } });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/products/:id  — admin */
export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    void writeLog({ req, action: "UPDATE_PRODUCT", description: `Updated product: ${product.name}`, metadata: { productId: product._id, changes: Object.keys(req.body) } });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/products/:id  — admin */
export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.cloudinaryPublicId) {
      await deleteImage(product.cloudinaryPublicId).catch(console.error);
    }
    void writeLog({ req, action: "DELETE_PRODUCT", description: `Deleted product: ${product.name} (${product.model})`, metadata: { productId: product._id }, severity: "warning" });
    await product.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** POST /api/products/upload  — admin, uploads image to Cloudinary */
export async function uploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image, folder } = req.body as { image: string; folder?: string };
    if (!image) {
      res.status(400).json({ error: "No image provided" });
      return;
    }
    const result = await uploadImage(image, folder ?? "dijutech/products");
    res.json(result);
  } catch (err) {
    next(err);
  }
}
