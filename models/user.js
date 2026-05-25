const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: false,
    },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "Owner" },
    plans: {
      type: String,
      enum: ["Free", "Basic", "Advanced", "Premium"],
      default: "Free",
    },
  },

  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
