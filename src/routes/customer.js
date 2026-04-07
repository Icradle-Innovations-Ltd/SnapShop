const express = require("express");
const { addCustomerAddress, listCustomerOrders, getCustomerOrder } = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assertNonEmptyString } = require("../utils/validation");

const router = express.Router();

router.use(requireAuth, requireRole("CUSTOMER"));

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

module.exports = router;
