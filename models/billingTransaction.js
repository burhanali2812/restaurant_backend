const mongoose = require("mongoose");

const billingTransactionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    cycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR", trim: true },
    status: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "paid",
      index: true,
    },
    invoiceNo: { type: String, required: true, unique: true, index: true },
    billingDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date },
    paidAt: { type: Date },
    remarks: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BillingTransaction", billingTransactionSchema);
