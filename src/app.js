const express = require("express");
const fs = require("fs");
const path = require("path");
const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth");
const vendorRouter = require("./routes/vendor");
const customerRouter = require("./routes/customer");
const adminRouter = require("./routes/admin");
const pesapalRouter = require("./routes/pesapal");

const ROOT_DIR = path.resolve(__dirname, "..");
const PAGE_FILES = new Set([
  "index.html",
  "shop.html",
  "about.html",
  "faq.html",
  "contact.html",
  "cart.html",
  "checkout.html",
  "payment.html",
  "sitemap.html",
  "login.html",
  "register.html",
  "dashboard.html",
  "product.html",
  "success.html",
  "404.html"
]);

function sendPage(page) {
  return (req, res) => {
    res.sendFile(path.join(ROOT_DIR, page));
  };
}

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/assets", express.static(path.join(ROOT_DIR, "assets")));
  /* Ensure uploads directory exists */
  const uploadsDir = path.join(ROOT_DIR, "uploads", "products");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(path.join(ROOT_DIR, "uploads")));
  app.get("/styles.css", (req, res) => res.sendFile(path.join(ROOT_DIR, "styles.css")));
  app.get("/script.js", (req, res) => res.sendFile(path.join(ROOT_DIR, "script.js")));
  app.get("/auth-ui.js", (req, res) => res.sendFile(path.join(ROOT_DIR, "auth-ui.js")));

  app.use("/api/auth", authRouter);
  app.use("/api/vendor", vendorRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/pesapal", pesapalRouter);
  app.use("/api", apiRouter);

  app.get("/", sendPage("index.html"));

  PAGE_FILES.forEach((page) => {
    app.get(`/${page}`, sendPage(page));
  });

  app.use((req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Route not found." });
    }
    res.status(404).sendFile(path.join(ROOT_DIR, "404.html"));
  });

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || "Unexpected error."
    });
  });

  return app;
}

module.exports = {
  createApp
};
