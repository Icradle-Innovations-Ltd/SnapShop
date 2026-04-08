const express = require("express");
const { listPendingVendors, approveVendor } = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { prisma, hasDatabase } = require("../lib/prisma");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/vendors/pending", async (req, res, next) => {
  try {
    const vendors = await listPendingVendors();
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

router.patch("/vendors/:vendorProfileId/approve", async (req, res, next) => {
  try {
    const vendor = await approveVendor(req.params.vendorProfileId);
    res.json({
      message: "Vendor approved successfully.",
      vendor
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    if (!hasDatabase) {
      return res.json({ orders: [] });
    }
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { customer: { include: { user: true } } }
    });
    res.json({
      orders: orders.map((o) => ({
        ...o,
        customer: o.customer?.user ? { name: o.customer.user.name, email: o.customer.user.email } : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    if (!hasDatabase) {
      return res.json({ users: [] });
    }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
