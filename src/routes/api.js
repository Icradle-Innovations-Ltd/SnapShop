const express = require("express");
const {
  listCategories,
  listProducts,
  getProductByIdOrSlug,
  createContactMessage,
  createPollVote,
  createOrder,
  getOrderByNumber,
  POLL_CHOICES
} = require("../services/storeService");
const { assertEmail, assertNonEmptyString } = require("../utils/validation");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    service: "snapshop-api",
    timestamp: new Date().toISOString()
  });
});

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await listProducts({
      search: req.query.search,
      category: req.query.category,
      featured: req.query.featured
    });
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.get("/products/:identifier", async (req, res, next) => {
  try {
    const product = await getProductByIdOrSlug(req.params.identifier);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    return res.json({ product });
  } catch (error) {
    return next(error);
  }
});

router.get("/poll-options", (req, res) => {
  res.json({ choices: POLL_CHOICES });
});

router.post("/poll-votes", async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.choice, "Choice");
    const results = await createPollVote(req.body.choice.trim());
    res.status(201).json({
      message: "Vote recorded successfully.",
      results
    });
  } catch (error) {
    next(error);
  }
});

router.post("/contact-messages", optionalAuth, async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.name, "Name");
    assertEmail(req.body.email);
    assertNonEmptyString(req.body.message, "Message");

    const contactMessage = await createContactMessage(req.body, req.auth?.user || null);
    res.status(201).json({
      message: "Message received successfully.",
      contactMessage
    });
  } catch (error) {
    next(error);
  }
});

router.post("/orders", optionalAuth, async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.fullName, "Full name");
    assertEmail(req.body.email);
    assertNonEmptyString(req.body.phone, "Phone");
    assertNonEmptyString(req.body.city, "City");
    assertNonEmptyString(req.body.address, "Address");
    assertNonEmptyString(req.body.deliveryOption, "Delivery option");
    assertNonEmptyString(req.body.paymentMethod, "Payment method");

    const order = await createOrder(req.body, req.auth?.user || null);
    res.status(201).json({
      message: "Order created successfully.",
      orderNumber: order.orderNumber,
      total: order.total,
      serviceFee: order.serviceFee
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:orderNumber", async (req, res, next) => {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.json({ order });
  } catch (error) {
    return next(error);
  }
});

router.get("/orders/:orderNumber/track", async (req, res, next) => {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory || []
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
