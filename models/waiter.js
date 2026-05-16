const mongoose = require("mongoose");

const waiterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    phone: { type: String, required: true },
    salary: { type: Number, required: true },
    shift: {
      type: String,
      required: true,
      enum: ["Morning", "Afternoon", "Evening"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Waiter = mongoose.model("Waiter", waiterSchema);
module.exports = Waiter;
