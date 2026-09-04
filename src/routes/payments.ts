import { Router } from "express";
import { initialize, verify, webhook } from "../controllers/paymentController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/initialize", protect, initialize);
router.get("/verify", verify);
router.post("/webhook", webhook);      // Paystack calls this — no auth

export default router;
