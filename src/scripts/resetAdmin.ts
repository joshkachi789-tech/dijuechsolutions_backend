/**
 * Force-resets the admin password.
 * Run: npx ts-node --transpile-only -r dotenv/config src/scripts/resetAdmin.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@dijutech.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "DIJUTECH Admin";

const UserSchema = new mongoose.Schema({
  name:     { type: String },
  email:    { type: String, unique: true, lowercase: true },
  password: { type: String },
  role:     { type: String, default: "customer" },
}, { timestamps: true });

async function reset() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌  MONGODB_URI not set"); process.exit(1); }

  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("✅  Connected.");

  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { $set: { password: hashed, role: "admin", name: ADMIN_NAME } },
    { upsert: true, new: true },
  );

  console.log("✅  Admin password reset successfully!");
  console.log("──────────────────────────────────────");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     ${result.role}`);
  console.log("──────────────────────────────────────");

  await mongoose.disconnect();
}

reset().catch((err) => { console.error("❌ Reset failed:", err); process.exit(1); });
