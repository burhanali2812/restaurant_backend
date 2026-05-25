const express = require("express");
const Subscription = require("../models/subscription");
const Restaurant = require("../models/restaurant");
const Plan = require("../models/plan");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

const allowedRoles = ["owner", "admin", "superadmin"];

const canManageBilling = (role) => {
  return allowedRoles.includes(String(role || "").toLowerCase());
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

router.get("/", authMiddleWare, async (req, res) => {
  try {
    if (!canManageBilling(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view subscriptions",
      });
    }

    const { status, restaurantId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (restaurantId) filter.restaurantId = restaurantId;

    const subscriptions = await Subscription.find(filter)
      .populate({ path: "restaurantId", select: "name address phone" })
      .populate({ path: "planId", select: "name code monthlyCharge currency" })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    console.error("Get Subscriptions Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/create", authMiddleWare, async (req, res) => {
  try {
    if (!canManageBilling(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create subscriptions",
      });
    }

    const {
      restaurantId,
      planId,
      billingCycle = "monthly",
      startDate,
      status = "active",
      metadata,
    } = req.body;

    if (!restaurantId || !planId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and planId are required",
      });
    }

    const [restaurant, plan] = await Promise.all([
      Restaurant.findById(restaurantId),
      Plan.findById(planId),
    ]);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    const normalizedCycle = String(billingCycle || "monthly").toLowerCase();
    const monthsToAdd = normalizedCycle === "yearly" ? 12 : 1;

    const effectiveStartDate = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(effectiveStartDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid startDate" });
    }

    const renewalDate = addMonths(effectiveStartDate, monthsToAdd);

    await Subscription.updateMany(
      {
        restaurantId,
        status: { $in: ["active", "trialing", "past_due"] },
      },
      { $set: { status: "expired" } },
    );

    const subscription = await Subscription.create({
      restaurantId,
      planId,
      status,
      billingCycle: normalizedCycle === "yearly" ? "yearly" : "monthly",
      amount: Number(plan.monthlyCharge || 0) * monthsToAdd,
      currency: plan.currency || "PKR",
      startDate: effectiveStartDate,
      endDate: renewalDate,
      renewalDate,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    });

    restaurant.currentSubscriptionId = subscription._id;
    await restaurant.save();

    const created = await Subscription.findById(subscription._id)
      .populate({ path: "restaurantId", select: "name address phone" })
      .populate({ path: "planId", select: "name code monthlyCharge currency" });

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      subscription: created,
    });
  } catch (error) {
    console.error("Create Subscription Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.patch("/updateStatus/:id", authMiddleWare, async (req, res) => {
  try {
    if (!canManageBilling(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update subscription status",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "active",
      "past_due",
      "cancelled",
      "expired",
      "trialing",
    ];

    if (!allowedStatuses.includes(String(status || ""))) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    subscription.status = status;
    if (status === "cancelled") {
      subscription.cancelledAt = new Date();
    }

    await subscription.save();

    const updated = await Subscription.findById(id)
      .populate({ path: "restaurantId", select: "name address phone" })
      .populate({ path: "planId", select: "name code monthlyCharge currency" });

    res.status(200).json({
      success: true,
      message: "Subscription status updated successfully",
      subscription: updated,
    });
  } catch (error) {
    console.error("Update Subscription Status Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
