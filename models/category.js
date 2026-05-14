import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);
export default Category;