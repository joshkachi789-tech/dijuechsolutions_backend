import { Router } from "express";
import {
  getProducts,
  getCategories,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "../controllers/productController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// Public
router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:slug", getProduct);

// Admin only
router.post("/", protect, adminOnly, createProduct);
router.post("/upload", protect, adminOnly, uploadProductImage);
router.patch("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
