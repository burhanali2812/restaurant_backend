const express = require("express");
const BillingTransaction = require("../models/billingTransaction");
const Restaurant = require("../models/restaurant");
const User = require("../models/user");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

const allowedBillingRoles = ["owner", "admin", "superadmin"];

const canViewBilling = (role) =>
  allowedBillingRoles.includes(String(role || "").toLowerCase());

const isAdminRole = (role) =>
  ["admin", "superadmin"].includes(String(role || "").toLowerCase());

const buildBillingFilter = async ({ role, userId, restaurantId, cycle, status }) => {
  const filter = {};
  const normalizedRole = String(role || "").toLowerCase();

  if (cycle) filter.cycle = cycle;
  if (status) filter.status = status;

  if (isAdminRole(normalizedRole)) {
    if (restaurantId) filter.restaurantId = restaurantId;
    return filter;
  }

  const user = await User.findById(userId).select("restaurantId");
  if (user?.restaurantId) {
    filter.restaurantId = user.restaurantId;
  }
  return filter;
};

router.get("/transactions", authMiddleWare, async (req, res) => {
  try {
    if (!canViewBilling(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view billing history",
      });
    }

    const { restaurantId, cycle, status } = req.query;
    const filter = await buildBillingFilter({
      role: req.user.role,
      userId: req.user.userId,
      restaurantId,
      cycle,
      status,
    });

    const transactions = await BillingTransaction.find(filter)
      .populate({ path: "restaurantId", select: "name address phone" })
      .populate({ path: "subscriptionId", select: "billingCycle status amount currency" })
      .populate({ path: "planId", select: "name code monthlyCharge currency" })
      .sort({ billingDate: -1, createdAt: -1 });

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get Billing Transactions Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/restaurant/:restaurantId", authMiddleWare, async (req, res) => {
  try {
    if (!canViewBilling(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view billing history",
      });
    }

    const { restaurantId } = req.params;
    const normalizedRole = String(req.user.role || "").toLowerCase();

    if (!isAdminRole(normalizedRole)) {
      const user = await User.findById(req.user.userId).select("restaurantId");
      const currentRestaurantId = String(user?.restaurantId || "");
      if (currentRestaurantId !== String(restaurantId)) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own restaurant billing history",
        });
      }
    }

    const restaurant = await Restaurant.findById(restaurantId).select("name address phone");
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const transactions = await BillingTransaction.find({ restaurantId })
      .populate({ path: "subscriptionId", select: "billingCycle status amount currency" })
      .populate({ path: "planId", select: "name code monthlyCharge currency" })
      .sort({ billingDate: -1, createdAt: -1 });

    const monthlyTransactions = transactions.filter((txn) => txn.cycle === "monthly");
    const yearlyTransactions = transactions.filter((txn) => txn.cycle === "yearly");

    res.status(200).json({
      success: true,
      restaurant,
      transactions,
      monthlyTransactions,
      yearlyTransactions,
    });
  } catch (error) {
    console.error("Get Restaurant Billing History Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
