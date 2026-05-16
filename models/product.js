import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Small, Medium, Large
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

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
export default Product;