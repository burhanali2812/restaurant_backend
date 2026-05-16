const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Waiter = require("../models/waiter");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");
const e = require("express");
const router = express.Router();

router.post("/signupWaiter/:restaurantId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { name, shift, phone, salary } = req.body;
    const restaurantId = req.params.restaurantId;

    // Check if waiter already exists
    const existingWaiter = await Waiter.findOne({ phone, restaurantId });
    if (existingWaiter) {
      return res.status(400).json({ message: "Waiter already exists" });
    }

  
    const newWaiter = new Waiter({
      name,
        restaurantId,
        shift,
        phone,
        salary
    });

    await newWaiter.save();

    res.status(201).json({ message: "Waiter created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.get("/getWaiters/:restaurantId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const { restaurantId } = req.params;
        const waiters = await Waiter.find({ restaurantId });
        res.json(waiters);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

router.delete("/deleteWaiter/:waiterId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const { waiterId } = req.params;
        await Waiter.findByIdAndDelete(waiterId);
        res.json({ message: "Waiter deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message ||   "Internal server error" });
    }
});

router.put("/updateWaiter/:waiterId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const { waiterId } = req.params;
        const { name, shift, phone, salary } = req.body;
        const updatedWaiter = await Waiter.findByIdAndUpdate(
            waiterId,
            { name, shift, phone, salary },
            { new: true }
        );
        res.json({ message: "Waiter updated successfully", waiter: updatedWaiter });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message ||   "Internal server error" });
    }

});

router.get("/getWaiter/:waiterId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const { waiterId } = req.params;
        const waiter = await Waiter.findById(waiterId);
        if (!waiter) {
            return res.status(404).json({ message: "Waiter not found" });
        }
        res.json(waiter);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

module.exports = router;