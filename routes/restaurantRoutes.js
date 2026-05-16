const express = require("express");
const Restaurant = require("../models/restaurant");
const User = require("../models/user");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

// ============= CREATE RESTAURANT =============
// Public route - Anyone can create a new restaurant
router.post("/create", async (req, res) => {
  // if (req.user.role !== "SuperAdmin") {
  //   return res.status(403).json({
  //     success: false,
  //     message: "Only SuperAdmin can create restaurants",
  //   });
  // }
  try {
    const { name, address, phone } = req.body;

    // Validation
    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, address, and phone are required",
      });
    }

    // Create new restaurant
    const newRestaurant = new Restaurant({
      name,
      address,
      phone,
      isActive: true,
    });

    await newRestaurant.save();

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurant: newRestaurant,
    });
  } catch (error) {
    console.error("Create Restaurant Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET RESTAURANT BY ID =============
// Public route
router.get("/getRestaurant/:id", authMiddleWare, async (req, res) => {
  if (req.user.role !== "SuperAdmin" && req.user.role !== "Owner") {
    return res.status(403).json({
      success: false,
      message: "Only SuperAdmin or Owner can view restaurant details",
    });
  }
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      restaurant,
    });
  } catch (error) {
    console.error("Get Restaurant Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET ALL RESTAURANTS =============
// Public route
router.get("/", async (req, res) => {
  try {
    const restaurants = await Restaurant.find();

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("Get All Restaurants Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET USER'S RESTAURANT =============
// Protected route - Get restaurant assigned to current user
router.get("/my/restaurant", authMiddleWare, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user || !user.restaurantId) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned to any restaurant",
      });
    }

    const restaurant = await Restaurant.findById(user.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      restaurant,
    });
  } catch (error) {
    console.error("Get User's Restaurant Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= EDIT RESTAURANT =============
// Protected route - Only admin/owner role can edit
router.put("/edit/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, isActive } = req.body;
    const userRole = req.user.role;

    // Authorization check: only Admin or Owner role can edit
    if (userRole !== "Admin" && userRole !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Owner can edit restaurants",
      });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Update fields
    if (name) restaurant.name = name;
    if (address) restaurant.address = address;
    if (phone) restaurant.phone = phone;
    if (isActive !== undefined) restaurant.isActive = isActive;

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Edit Restaurant Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= DELETE RESTAURANT =============
// Protected route - Only admin/owner role can delete
router.delete("/delete/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Authorization check: only Admin or Owner role can delete
    if (userRole !== "Admin" && userRole !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Owner can delete restaurants",
      });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    await Restaurant.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    console.error("Delete Restaurant Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET RESTAURANTS BY USER =============
// Protected route - Get all restaurants assigned to users
router.get("/search/by-user", authMiddleWare, async (req, res) => {
  try {
    const userRole = req.user.role;

    // Authorization check
    if (userRole !== "Owner" && userRole !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Owner or Admin can view this",
      });
    }

    const users = await User.find({
      restaurantId: { $exists: true, $ne: null },
    }).populate("restaurantId");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get Restaurants by User Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= TOGGLE RESTAURANT ACTIVE STATUS =============
// Protected route - Only admin/owner role can toggle status
router.patch("/toggle-status/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Authorization check
    if (userRole !== "Admin" && userRole !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Owner can toggle restaurant status",
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${restaurant.isActive ? "active" : "inactive"}`,
      restaurant,
    });
  } catch (error) {
    console.error("Toggle Restaurant Status Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
