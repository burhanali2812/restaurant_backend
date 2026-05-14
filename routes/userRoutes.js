const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

// ============= SIGNUP =============
// Public route - anyone can sign up
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, restaurantId, role } = req.body;

    // Validation
    if (!username || !email || !password || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and restaurantId are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      passwordHash: hashedPassword,
      restaurantId,
      role: role || "Staff",
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        restaurantId: newUser.restaurantId,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= LOGIN =============
// Public route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).populate("restaurantId");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET USER PROFILE =============
// Protected route - requires authentication
router.get("/profile", authMiddleWare, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("restaurantId")
      .select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= EDIT USER =============
// Protected route - user can only edit their own profile or admin can edit others
router.put("/edit/:userId", authMiddleWare, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, role, password } = req.body;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    // Authorization check: user can edit their own profile or admin/owner can edit others
    if (
      userId !== currentUserId &&
      currentUserRole !== "Owner" &&
      currentUserRole !== "Admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this user",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update username if provided and check for uniqueness
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }
      user.username = username;
    }

    // Update email if provided and check for uniqueness
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
      user.email = email;
    }

    // Update password if provided
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update role - only Owner/Admin can do this
    if (role && (currentUserRole === "Owner" || currentUserRole === "Admin")) {
      user.role = role;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (error) {
    console.error("Edit User Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= DELETE USER =============
// Protected route - only Owner/Admin can delete users
router.delete("/delete/:userId", authMiddleWare, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.userId;

    // Authorization check: only Owner or Admin can delete users
    if (currentUserRole !== "Owner" && currentUserRole !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Owner or Admin can delete users",
      });
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET ALL USERS (Admin only) =============
// Protected route - only Owner/Admin can view all users
router.get("/all", authMiddleWare, async (req, res) => {
  try {
    const currentUserRole = req.user.role;

    // Authorization check
    if (currentUserRole !== "Owner" && currentUserRole !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Owner or Admin can view all users",
      });
    }

    const users = await User.find()
      .populate("restaurantId")
      .select("-passwordHash");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
