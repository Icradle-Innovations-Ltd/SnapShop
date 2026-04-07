const express = require("express");
const { registerUser, loginUser } = require("../services/storeService");
const { assertEmail, assertNonEmptyString, assertPassword } = require("../utils/validation");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    assertNonEmptyString(req.body.name, "Name");
    assertEmail(req.body.email);
    assertPassword(req.body.password);
    assertNonEmptyString(req.body.role, "Role");

    if (req.body.role === "VENDOR") {
      assertNonEmptyString(req.body.businessName, "Business name");
    }

    const authPayload = await registerUser(req.body);
    res.status(201).json({
      message: "Account created successfully.",
      ...authPayload
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    assertEmail(req.body.email);
    assertPassword(req.body.password);

    const authPayload = await loginUser(req.body.email, req.body.password);
    res.json({
      message: "Login successful.",
      ...authPayload
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: req.auth.user
  });
});

module.exports = router;
