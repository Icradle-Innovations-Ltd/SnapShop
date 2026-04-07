const express = require("express");
const { listPendingVendors, approveVendor } = require("../services/storeService");
const { requireAuth, requireRole } = require("../middleware/auth");

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

module.exports = router;
