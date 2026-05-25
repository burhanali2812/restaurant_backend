const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const userRoutes = require("./routes/userRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const waiterRoutes = require("./routes/waiterRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const planRoutes = require("./routes/planRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const Plan = require("./models/plan");

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Restaurant POS Backend is Live!");
});

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/waiters", waiterRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

const ensureDefaultPlans = async () => {
  const count = await Plan.countDocuments();
  if (count > 0) return;

  await Plan.insertMany([
    {
      name: "Basic",
      code: "basic",
      description: "Starter monthly plan for small restaurants",
      monthlyCharge: 5000,
      currency: "PKR",
      features: ["Order management", "Product management", "Waiter management"],
      limits: { users: 2, tables: 15, products: 200, ordersPerMonth: 3000 },
      isActive: true,
    },
    {
      name: "Advanced",
      code: "advanced",
      description: "Growth monthly plan for busy restaurants",
      monthlyCharge: 9000,
      currency: "PKR",
      features: [
        "All Basic features",
        "Advanced analytics",
        "Priority support",
      ],
      limits: { users: 5, tables: 40, products: 1000, ordersPerMonth: 10000 },
      isActive: true,
    },
    {
      name: "Premium",
      code: "premium",
      description: "Scale monthly plan for multi-shift operations",
      monthlyCharge: 15000,
      currency: "PKR",
      features: [
        "All Advanced features",
        "Custom reports",
        "Dedicated onboarding",
      ],
      limits: {
        users: 20,
        tables: 200,
        products: 10000,
        ordersPerMonth: 100000,
      },
      isActive: true,
    },
  ]);

  console.log("Default plans seeded");
};


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};
connectDB().then(() => {
  ensureDefaultPlans().catch((err) => {
    console.error("Plan seeding error:", err);
  });

  app.listen(PORT, () => {
    console.log(`Server Running on PORT ${PORT}`);
  });
});
