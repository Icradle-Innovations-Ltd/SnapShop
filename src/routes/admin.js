const express = require("express");
const {
  listPendingVendors,
  approveVendor,
  rejectVendor,
  listAllVendors,
  toggleUserActive,
  updateOrderStatus,
  listProducts,
  listContactMessages
} = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { prisma, hasDatabase } = require("../lib/prisma");
const { memoryStore } = require("../store/memoryStore");

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
      const orders = memoryStore.orders.map((o) => {
        const profile = o.customerProfileId
          ? memoryStore.customerProfiles.find((p) => p.id === o.customerProfileId)
          : null;
        const user = profile
          ? memoryStore.users.find((u) => u.id === profile.userId)
          : null;
        return {
          ...o,
          customer: user ? { name: user.name, email: user.email } : null
        };
      });
      return res.json({ orders });
    }
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { customerProfile: { include: { user: true } } }
    });
    res.json({
      orders: orders.map((o) => ({
        ...o,
        customerProfile: undefined,
        customer: o.customerProfile?.user ? { name: o.customerProfile.user.name, email: o.customerProfile.user.email } : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    if (!hasDatabase) {
      const users = memoryStore.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive !== false,
        createdAt: u.createdAt
      }));
      return res.json({ users });
    }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const isActive = req.body.isActive === true;
    const user = await toggleUserActive(req.params.id, isActive);
    res.json({ message: `User ${isActive ? "activated" : "deactivated"}.`, user });
  } catch (error) {
    next(error);
  }
});

router.get("/vendors", async (req, res, next) => {
  try {
    const vendors = await listAllVendors();
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

router.patch("/vendors/:vendorProfileId/reject", async (req, res, next) => {
  try {
    const vendor = await rejectVendor(req.params.vendorProfileId);
    res.json({ message: "Vendor rejected.", vendor });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await updateOrderStatus(req.params.id, status, note);
    res.json({ message: "Order status updated.", order });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await listProducts({ includeDrafts: true });
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

router.get("/contact-messages", async (req, res, next) => {
  try {
    const messages = await listContactMessages();
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
