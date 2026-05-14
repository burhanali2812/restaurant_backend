import mongoose from "mongoose";

const waiterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    phone: { type: String, required: true },
    shift: { type: String, required: true, enum: ["Morning", "Afternoon", "Evening"] },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Waiter = mongoose.model("Waiter", waiterSchema);
export default Waiter;