const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const {
  createVendorStore,
  updateVendorStore,
  listVendorProducts,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  addProductImages,
  deleteProductImage,
  listVendorOrders,
  updateVendorOrderStatus
} = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assertNonEmptyString } = require("../utils/validation");
const { isConfigured: cloudinaryReady, uploadImage, deleteImage } = require("../lib/cloudinary");

/* Disk storage fallback when Cloudinary is not configured */
const diskStorage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads/products"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

/* Use memory storage when Cloudinary is ready (temp buffer → cloud upload) */
const memStorage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, gif, webp, svg) are allowed."));
  }
}

const upload = multer({
  storage: cloudinaryReady ? memStorage : diskStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.use(requireAuth, requireRole("VENDOR"));

router.post("/store", async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.name, "Store name");
    assertNonEmptyString(req.body.description, "Store description");

    const store = await createVendorStore(req.auth.user.id, req.body);
    res.status(201).json({
      message: "Store created successfully.",
      store
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await listVendorProducts(req.auth.user.id);
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.post("/products", async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.name, "Product name");
    assertNonEmptyString(req.body.categorySlug, "Category");
    assertNonEmptyString(req.body.description, "Description");

    const product = await createVendorProduct(req.auth.user.id, req.body);
    res.status(201).json({
      message: "Product created successfully.",
      product
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const product = await updateVendorProduct(req.auth.user.id, req.params.id, req.body);
    res.json({
      message: "Product updated successfully.",
      product
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const result = await deleteVendorProduct(req.auth.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/products/:id/images", upload.array("images", 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image file is required." });
    }

    let processedFiles;
    if (cloudinaryReady) {
      /* Upload each file buffer to Cloudinary */
      processedFiles = [];
      for (const file of req.files) {
        /* Write temp file then upload (Cloudinary SDK needs a path or data URI) */
        const tmpPath = path.join(__dirname, "../../uploads/products", file.originalname);
        fs.writeFileSync(tmpPath, file.buffer);
        try {
          const { url, publicId } = await uploadImage(tmpPath);
          processedFiles.push({ filename: publicId, cloudinaryUrl: url });
        } finally {
          fs.unlinkSync(tmpPath);
        }
      }
    } else {
      /* Fallback: disk-only, filename already set by multer */
      processedFiles = req.files.map((f) => ({ filename: f.filename }));
    }

    const product = await addProductImages(req.auth.user.id, req.params.id, processedFiles);
    res.json({ message: "Images uploaded successfully.", product });
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id/images/:imageId", async (req, res, next) => {
  try {
    const product = await deleteProductImage(req.auth.user.id, req.params.id, req.params.imageId);
    res.json({ message: "Image deleted.", product });
  } catch (error) {
    next(error);
  }
});

router.patch("/store", async (req, res, next) => {
  try {
    const store = await updateVendorStore(req.auth.user.id, req.body);
    res.json({ message: "Store updated successfully.", store });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const orders = await listVendorOrders(req.auth.user.id);
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await updateVendorOrderStatus(req.auth.user.id, req.params.id, status, note);
    res.json({ message: "Order status updated.", order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
