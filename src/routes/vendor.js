const express = require("express");
const {
  createVendorStore,
  listVendorProducts,
  createVendorProduct,
  updateVendorProduct
} = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assertNonEmptyString } = require("../utils/validation");

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
    assertNonEmptyString(req.body.sku, "SKU");
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

module.exports = router;
