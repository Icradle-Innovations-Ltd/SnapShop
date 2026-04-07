require("dotenv").config();

const { createApp } = require("./app");
const { prisma } = require("./lib/prisma");

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`SnapShop server listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  server.close(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exit(1);
  });
});
