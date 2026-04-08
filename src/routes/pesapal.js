const express = require("express");
const { optionalAuth } = require("../middleware/auth");
const { getIpnId, submitOrderRequest, getTransactionStatus } = require("../services/pesapal");
const { createOrder, getOrderByNumber, updateOrderStatus } = require("../services/storeService");

const router = express.Router();

/* ─── helpers ──────────────────────────────────────────────── */

function buildBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

/* ─── POST /initiate — create order + get Pesapal redirect URL */
router.post("/initiate", optionalAuth, async (req, res, next) => {
  try {
    const { fullName, email, phone, city, address, deliveryOption, paymentMethod, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }
    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: "Customer details required." });
    }

    // 1. Create the order in our system
    const order = await createOrder({
      fullName,
      email,
      phone,
      city,
      address,
      deliveryOption,
      paymentMethod: paymentMethod || "Pesapal",
      items,
      userId: req.auth ? req.auth.user.id : undefined
    });

    const baseUrl = buildBaseUrl(req);
    const ipnUrl = `${baseUrl}/api/pesapal/ipn`;
    const callbackUrl = `${baseUrl}/payment.html`;

    // 2. Register IPN (cached after first call)
    const ipnId = await getIpnId(ipnUrl);

    // 3. Submit order to Pesapal
    const nameParts = fullName.trim().split(/\s+/);
    const pesapalResult = await submitOrderRequest({
      merchantReference: order.orderNumber,
      amount: order.total,
      description: `SnapShop Order ${order.orderNumber}`,
      callbackUrl,
      ipnId,
      customer: {
        email,
        phone,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        address: address || "",
        city: city || ""
      }
    });

    res.json({
      orderNumber: order.orderNumber,
      orderTrackingId: pesapalResult.orderTrackingId,
      redirectUrl: pesapalResult.redirectUrl
    });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /callback — Pesapal redirects customer here ──────── */
router.get("/callback", async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query;

    if (!OrderTrackingId) {
      return res.redirect("/payment.html?error=missing_tracking");
    }

    // Check transaction status with Pesapal
    const status = await getTransactionStatus(OrderTrackingId);

    // Map Pesapal status_code to our order status
    let orderStatus = "PENDING";
    if (status.statusCode === 1) orderStatus = "PAID";
    else if (status.statusCode === 2) orderStatus = "CANCELLED";
    else if (status.statusCode === 3) orderStatus = "CANCELLED";

    // Update our order
    if (OrderMerchantReference) {
      try {
        await updateOrderStatus(null, orderStatus, `Pesapal ${status.statusDescription || "update"} — ${status.confirmationCode || "N/A"}`);
      } catch (_) {
        // Order may have already been updated by IPN
      }
    }

    // Redirect to success page
    if (status.statusCode === 1) {
      res.redirect(`/success.html?ref=${encodeURIComponent(OrderMerchantReference || "")}&tracking=${encodeURIComponent(OrderTrackingId)}`);
    } else {
      res.redirect(`/payment.html?status=${encodeURIComponent(status.statusDescription || "Failed")}&ref=${encodeURIComponent(OrderMerchantReference || "")}`);
    }
  } catch (err) {
    next(err);
  }
});

/* ─── GET /ipn — Pesapal IPN notification ──────────────────── */
router.get("/ipn", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

  try {
    if (OrderTrackingId) {
      const status = await getTransactionStatus(OrderTrackingId);

      let orderStatus = "PENDING";
      if (status.statusCode === 1) orderStatus = "PAID";
      else if (status.statusCode === 2) orderStatus = "CANCELLED";
      else if (status.statusCode === 3) orderStatus = "CANCELLED";

      if (OrderMerchantReference) {
        try {
          await updateOrderStatus(null, orderStatus, `IPN: Pesapal ${status.statusDescription || "update"}`);
        } catch (_) {
          // Ignore if order not found
        }
      }
    }
  } catch (_) {
    // Log silently
  }

  // Respond to Pesapal
  res.json({
    orderNotificationType: OrderNotificationType || "IPNCHANGE",
    orderTrackingId: OrderTrackingId || "",
    orderMerchantReference: OrderMerchantReference || "",
    status: 200
  });
});

/* ─── GET /status/:trackingId — check payment status ───────── */
router.get("/status/:trackingId", async (req, res, next) => {
  try {
    const status = await getTransactionStatus(req.params.trackingId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
