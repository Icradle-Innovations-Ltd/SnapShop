const express = require("express");
const { addCustomerAddress, listCustomerOrders, getCustomerOrder, deleteCustomerAddress, cancelCustomerOrder, getCartItems, syncCart, clearCartItems } = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assertNonEmptyString } = require("../utils/validation");

const router = express.Router();

router.use(requireAuth, requireRole("CUSTOMER"));

/* ── Cart endpoints ── */

router.get("/cart", async (req, res, next) => {
  try {
    const items = await getCartItems(req.auth.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/cart/sync", async (req, res, next) => {
  try {
    const merged = await syncCart(req.auth.user.id, req.body.items || []);
    res.json({ items: merged });
  } catch (error) {
    next(error);
  }
});

router.delete("/cart", async (req, res, next) => {
  try {
    await clearCartItems(req.auth.user.id);
    res.json({ message: "Cart cleared.", items: [] });
  } catch (error) {
    next(error);
  }
});

/* ── Addresses ── */

router.post("/addresses", async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.label, "Address label");
    assertNonEmptyString(req.body.city, "City");
    assertNonEmptyString(req.body.addressLine, "Address line");

    const address = await addCustomerAddress(req.auth.user.id, req.body);
    res.status(201).json({
      message: "Address saved successfully.",
      address
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const orders = await listCustomerOrders(req.auth.user.id);
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:orderNumber", async (req, res, next) => {
  try {
    const order = await getCustomerOrder(req.auth.user.id, req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
});

router.delete("/addresses/:id", async (req, res, next) => {
  try {
    const result = await deleteCustomerAddress(req.auth.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:orderNumber/cancel", async (req, res, next) => {
  try {
    const order = await cancelCustomerOrder(req.auth.user.id, req.params.orderNumber);
    res.json({ message: "Order cancelled.", order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
