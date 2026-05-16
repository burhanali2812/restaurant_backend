const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Order = require("../models/order");
const Product = require("../models/product");
const Restaurant = require("../models/restaurant");
const Waiter = require("../models/waiter");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

function generateOrderNo() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let orderNo = "";
  for (let i = 0; i < 6; i++) {
    orderNo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return orderNo;
}

router.post("/createOrder", authMiddleWare, async (req, res) => {
  try {
    const { restaurantId, products, tableNo, orderType, waiterId, discount } =
      req.body;

    const normalizedOrderType = String(orderType || "").toLowerCase();
    const discountAmount = Number(discount) || 0;

    if (!restaurantId || !products || products.length === 0 || !orderType) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (["dine-in", "delivery"].includes(normalizedOrderType) && !waiterId) {
      return res.status(400).json({
        message: "Waiter is required for dine-in and delivery orders",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of products) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: `Product not found`,
        });
      }

      let finalPrice = product.price || 0;
      let productName = product.name;

      // Variant handling
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);

        if (!variant) {
          return res.status(404).json({
            message: `Variant not found`,
          });
        }

        finalPrice += variant.price;
        productName += ` (${variant.name})`;
      }

      const total = finalPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        name: productName,
        price: finalPrice,
        quantity: item.quantity,
        total,
      });

      subtotal += total;
    }

    let orderNo = generateOrderNo();

    const existingOrder = await Order.findOne({
      OrderNo: orderNo,
    });

    if (existingOrder) {
      orderNo = generateOrderNo();
    }

    const newOrder = new Order({
      restaurantId,
      waiterId: ["dine-in", "delivery"].includes(normalizedOrderType)
        ? waiterId
        : undefined,
      tableNo,
      orderType: normalizedOrderType,

      OrderNo: orderNo,

      items: orderItems,

      subtotal,
      discount: discountAmount,
      total: Math.max(subtotal - discountAmount, 0),
    });

    await newOrder.save();

    res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
