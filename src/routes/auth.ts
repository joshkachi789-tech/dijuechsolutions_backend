import { Router } from "express";
import { register, login, logout, getMe, tokenExchange, googleRedirect, googleCallback } from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/token-exchange", tokenExchange);

// Google OAuth
router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);

export default router;
