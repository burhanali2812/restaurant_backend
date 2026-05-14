import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "SuperAdmin" },
}, { timestamps: true });

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);
export default SuperAdmin;