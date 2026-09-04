import { Router } from "express";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
} from "../controllers/orderController";
import { protect } from "../middleware/auth";

const router = Router();

// All order routes require auth (protect is used as optional for guest createOrder)
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrder);
router.post("/", createOrder);          // guest-friendly — auth optional
router.patch("/:id", protect, updateOrder);

export default router;
