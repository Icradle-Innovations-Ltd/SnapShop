const express = require("express");
const path = require("path");
const apiRouter = require("./routes/api");

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
  "sitemap.html"
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
  app.get("/styles.css", (req, res) => res.sendFile(path.join(ROOT_DIR, "styles.css")));
  app.get("/script.js", (req, res) => res.sendFile(path.join(ROOT_DIR, "script.js")));

  app.use("/api", apiRouter);

  app.get("/", sendPage("index.html"));

  PAGE_FILES.forEach((page) => {
    app.get(`/${page}`, sendPage(page));
  });

  app.use((req, res) => {
    res.status(404).json({
      error: "Route not found."
    });
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
