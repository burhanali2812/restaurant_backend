const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/product");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    const { Readable } = require("stream");
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

const getCloudinaryPublicIdFromUrl = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
};

router.post(
  "/addProduct",
  authMiddleWare,
  upload.single("image"),
  async (req, res) => {
    if (req.user.role !== "Owner") {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const {
        name,
        description,
        price,
        variants,
        restaurantId: bodyRestaurantId,
      } = req.body;
      const restaurantId = req.user.restaurantId || bodyRestaurantId;

      if (!name || !restaurantId) {
        return res
          .status(400)
          .json({ message: "Name and restaurantId are required" });
      }

      let imageUrl = "";

      if (req.file) {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "restaurant_products",
        );
        imageUrl = result.secure_url;
      } else {
        //pick a default image if no image is uploaded
        imageUrl =
          "https://png.pngtree.com/png-vector/20190820/ourmid/pngtree-no-image-vector-illustration-isolated-png-image_1694547.jpg";
      }

      let parsedVariants = [];
      if (variants) {
        parsedVariants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
      }

      const product = new Product({
        name,
        description: description || "",
        imageURL: imageUrl,
        restaurantId,
        basePrice: price ? Number(price) : undefined,
        variants: Array.isArray(parsedVariants) ? parsedVariants : [],
      });

      await product.save();
      res.status(201).json({ message: "Product added successfully", product });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  },
);

router.get("/getProducts/:restaurantId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { restaurantId } = req.params;
    const products = await Product.find({ restaurantId }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.delete("/deleteProduct/:productId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const publicId = getCloudinaryPublicIdFromUrl(product.imageURL);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    await Product.findByIdAndDelete(productId);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.put(
  "/updateProduct/:productId",
  authMiddleWare,
  upload.single("image"),
  async (req, res) => {
    if (req.user.role !== "Owner") {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { productId } = req.params;
      const { name, description, price, variants, isAvailable } = req.body;

      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updateData = {
        name,
        description: description || "",
        basePrice: price ? Number(price) : undefined,
      };

      if (typeof isAvailable !== "undefined") {
        updateData.isAvailable = isAvailable === "true" || isAvailable === true;
      }

      if (variants) {
        const parsedVariants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
        updateData.variants = Array.isArray(parsedVariants)
          ? parsedVariants
          : [];
      }

      if (req.file) {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "restaurant_products",
        );
        updateData.imageURL = result.secure_url;

        const oldPublicId = getCloudinaryPublicIdFromUrl(
          existingProduct.imageURL,
        );
        const newPublicId = getCloudinaryPublicIdFromUrl(result.secure_url);
        if (oldPublicId && oldPublicId !== newPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true },
      );

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  },
);

module.exports = router;
