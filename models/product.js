import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    stock: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;