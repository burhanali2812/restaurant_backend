const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, default: "" },
    monthlyCharge: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "PKR", trim: true },
    features: [{ type: String, trim: true }],
    limits: {
      users: { type: Number, default: 1 },
      tables: { type: Number, default: 10 },
      products: { type: Number, default: 100 },
      ordersPerMonth: { type: Number, default: 1000 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
