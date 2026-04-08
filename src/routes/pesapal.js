const express = require("express");
const { optionalAuth, requireAuth, requireRole } = require("../middleware/auth");
const {
  getIpnId,
  getRegisteredIPNs,
  submitOrderRequest,
  getTransactionStatus,
  refundRequest,
  cancelOrder: pesapalCancelOrder
} = require("../services/pesapal");
const {
  createOrder,
  getOrderByNumber,
  updateOrderStatusByNumber,
  updateOrderPesapalDetails
} = require("../services/storeService");

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

    // 1. Create the order in our system with PENDING status (not paid yet)
    const order = await createOrder({
      fullName,
      email,
      phone,
      city,
      address,
      deliveryOption,
      paymentMethod: paymentMethod || "Pesapal",
      items,
      initialStatus: "PENDING"
    }, req.auth ? req.auth.user : null);

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

    // 4. Store the Pesapal tracking ID on the order
    await updateOrderPesapalDetails(order.orderNumber, pesapalResult.orderTrackingId, null);

    res.json({
      orderNumber: order.orderNumber,
      orderTrackingId: pesapalResult.orderTrackingId,
      redirectUrl: pesapalResult.redirectUrl
    });
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
          await updateOrderStatusByNumber(
            OrderMerchantReference,
            orderStatus,
            `IPN: Pesapal ${status.statusDescription || "update"} — ${status.confirmationCode || "N/A"}`
          );

          // Store confirmation code for potential refunds
          if (status.confirmationCode) {
            await updateOrderPesapalDetails(OrderMerchantReference, null, status.confirmationCode);
          }
        } catch (_) {
          // Order may have already been updated
        }
      }
    }
  } catch (_) {
    // Log silently — must always respond 200 to Pesapal
  }

  // Respond to Pesapal with acknowledgement
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

    // Also update the order in our system based on the latest status
    if (status.merchantReference) {
      let orderStatus = "PENDING";
      if (status.statusCode === 1) orderStatus = "PAID";
      else if (status.statusCode === 2) orderStatus = "CANCELLED";
      else if (status.statusCode === 3) orderStatus = "CANCELLED";

      try {
        await updateOrderStatusByNumber(
          status.merchantReference,
          orderStatus,
          `Status check: Pesapal ${status.statusDescription || "update"} — ${status.confirmationCode || "N/A"}`
        );
        if (status.confirmationCode) {
          await updateOrderPesapalDetails(status.merchantReference, null, status.confirmationCode);
        }
      } catch (_) {
        // Ignore update errors
      }
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
});

/* ─── GET /ipn-list — list registered IPN URLs ─────────────── */
router.get("/ipn-list", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const list = await getRegisteredIPNs();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/* ─── POST /refund — request a refund ──────────────────────── */
router.post("/refund", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { orderNumber, amount, remarks } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required." });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    if (!order.pesapalConfirmationCode) {
      return res.status(400).json({ error: "No Pesapal confirmation code found for this order. Refund not possible." });
    }

    const refundAmount = amount || order.total;
    const result = await refundRequest({
      confirmationCode: order.pesapalConfirmationCode,
      amount: refundAmount,
      username: req.auth.user.email,
      remarks: remarks || `Refund for order ${orderNumber}`
    });

    // Update order status
    try {
      await updateOrderStatusByNumber(orderNumber, "CANCELLED", `Refund requested: ${result.message || "Processing"}`);
    } catch (_) {}

    res.json({ message: result.message || "Refund request submitted.", orderNumber });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /cancel — cancel a Pesapal order ────────────────── */
router.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required." });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    if (!order.pesapalTrackingId) {
      return res.status(400).json({ error: "No Pesapal tracking ID found for this order." });
    }
    if (order.status === "PAID" || order.status === "DELIVERED") {
      return res.status(400).json({ error: "Cannot cancel a completed or delivered order." });
    }

    const result = await pesapalCancelOrder(order.pesapalTrackingId);

    // Update our order status
    await updateOrderStatusByNumber(orderNumber, "CANCELLED", `Pesapal order cancelled: ${result.message || "Cancelled"}`);

    res.json({ message: result.message || "Order cancelled.", orderNumber });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
