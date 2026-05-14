import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, required: true, enum: ["In", "Out"] },
    reason: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });