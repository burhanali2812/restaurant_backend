const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
