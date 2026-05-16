const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Small, Medium, Large
  price: { type: Number, required: true },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageURL: { type: String },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    basePrice: { type: Number }, // optional fallback

    variants: [variantSchema],

    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;