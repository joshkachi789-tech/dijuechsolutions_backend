/**
 * One-time admin seed script.
 *
 * Usage:
 *   npx ts-node -e "require('dotenv').config()" src/scripts/seedAdmin.ts
 * OR add to package.json scripts:
 *   "seed:admin": "ts-node --transpile-only -r dotenv/config src/scripts/seedAdmin.ts"
 * then run: npm run seed:admin
 *
 * Set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars before running,
 * or edit the DEFAULTS below.
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Defaults (override via env) ───────────────────────────────────────────
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "DIJUTECH Admin";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@dijutech.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";

// ── Inline schema (avoids circular dep with app.ts) ───────────────────────
const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  role:     { type: String, enum: ["customer", "admin"], default: "customer" },
}, { timestamps: true });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("REPLACE_USER")) {
    console.error("❌  MONGODB_URI is not configured. Set it in backend/.env first.");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("✅  Connected.");

  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

  // Check if admin already exists
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`ℹ️   Admin already exists: ${ADMIN_EMAIL}`);
    } else {
      // Promote existing user to admin
      await User.updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin" } });
      console.log(`✅  Promoted existing user to admin: ${ADMIN_EMAIL}`);
    }
    await mongoose.disconnect();
    return;
  }

  // Create new admin
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name:     ADMIN_NAME,
    email:    ADMIN_EMAIL,
    password: hashed,
    role:     "admin",
  });

  console.log("✅  Admin user created successfully!");
  console.log("─────────────────────────────────────");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Name:     ${ADMIN_NAME}`);
  console.log("─────────────────────────────────────");
  console.log("🔒  Change the password after first login.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
