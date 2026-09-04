import { Router } from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getStats,
} from "../controllers/accountController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// Customer profile
router.get("/profile",  protect, getProfile);
router.patch("/profile", protect, updateProfile);
router.patch("/password", protect, changePassword);

// Admin
router.get("/admin/users", protect, adminOnly, getUsers);
router.get("/admin/stats", protect, adminOnly, getStats);

export default router;
