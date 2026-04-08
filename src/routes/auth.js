const express = require("express");
const { registerUser, loginUser, updateUserProfile, changeUserPassword } = require("../services/storeService");
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

router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const payload = await updateUserProfile(req.auth.userId, req.body);
    res.json({ message: "Profile updated.", ...payload });
  } catch (error) {
    next(error);
  }
});

router.patch("/password", requireAuth, async (req, res, next) => {
  try {
    assertPassword(req.body.currentPassword);
    assertPassword(req.body.newPassword);
    const result = await changeUserPassword(req.auth.userId, req.body.currentPassword, req.body.newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
