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

router.get("/getOrders/:restaurantId", authMiddleWare, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const orders = await Order.find({ restaurantId })
      .populate({
        path: "waiterId",
        select: "name phone",
      })
      .populate({
        path: "items.productId",
        select: "name imageURL",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

router.put("/updateOrder/:orderId", authMiddleWare, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      tableNo,
      orderType,
      waiterId,
      status,
      discount,
    } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const normalizedOrderType = orderType
      ? String(orderType).toLowerCase()
      : order.orderType;

    if (["dine-in", "delivery"].includes(normalizedOrderType) && !waiterId) {
      return res.status(400).json({
        message: "Waiter is required for dine-in and delivery orders",
      });
    }

    const nextDiscount = discount === "" || discount == null ? order.discount : Number(discount) || 0;

    order.tableNo = tableNo;
    order.orderType = normalizedOrderType;
    order.waiterId = ["dine-in", "delivery"].includes(normalizedOrderType)
      ? waiterId
      : undefined;
    order.status = status || order.status;
    order.discount = nextDiscount;
    order.total = Math.max(Number(order.subtotal || 0) - nextDiscount, 0);

    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate({
        path: "waiterId",
        select: "name phone",
      })
      .populate({
        path: "items.productId",
        select: "name imageURL",
      });

    res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

router.put("/updateOrderStatus/:orderId", authMiddleWare, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

router.delete("/deleteOrder/:orderId", authMiddleWare, async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
