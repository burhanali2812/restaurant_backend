const express = require("express");
const Plan = require("../models/plan");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ monthlyCharge: 1 });
    res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error("Get Plans Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/create", authMiddleWare, async (req, res) => {
  try {
    if (!["SuperAdmin", "Owner", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create plans",
      });
    }

    const {
      name,
      code,
      description,
      monthlyCharge,
      currency,
      features,
      limits,
      isActive,
    } = req.body;

    if (!name || !code || monthlyCharge == null) {
      return res.status(400).json({
        success: false,
        message: "name, code, and monthlyCharge are required",
      });
    }

    const existing = await Plan.findOne({
      $or: [{ name: String(name).trim() }, { code: String(code).toLowerCase() }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Plan with same name or code already exists",
      });
    }

    const plan = await Plan.create({
      name: String(name).trim(),
      code: String(code).toLowerCase().trim(),
      description: description || "",
      monthlyCharge: Number(monthlyCharge) || 0,
      currency: currency || "PKR",
      features: Array.isArray(features) ? features : [],
      limits: limits && typeof limits === "object" ? limits : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("Create Plan Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
