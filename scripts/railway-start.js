/**
 * Railway production start script.
 * Runs Prisma migrate deploy + seed, then starts the server.
 * Gracefully skips DB steps if DATABASE_URL is not set.
 */
require("dotenv").config();

const { spawnSync } = require("child_process");
const path = require("path");

if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

function run(label, command, args) {
  console.log(`[railway-start] ${label}...`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    cwd: path.resolve(__dirname, "..")
  });
  if (result.error) {
    console.error(`[railway-start] ${label} error:`, result.error.message);
    return false;
  }
  if (result.status !== 0) {
    console.error(`[railway-start] ${label} exited with code ${result.status}`);
    return false;
  }
  return true;
}

async function main() {
  if (hasDatabaseUrl) {
    // Deploy migrations (applies pending migrations without prompts)
    const migrateOk = run(
      "Deploying database migrations",
      process.execPath,
      [path.join(__dirname, "prisma-with-public-url.js"), "migrate", "deploy"]
    );

    if (migrateOk) {
      // Seed database (upserts are idempotent, safe to run every deploy)
      run(
        "Seeding database",
        process.execPath,
        [path.join(__dirname, "..", "prisma", "seed.js")]
      );
    } else {
      console.warn("[railway-start] Migration failed, skipping seed. Server will use in-memory fallback.");
    }
  } else {
    console.log("[railway-start] No DATABASE_URL found. Running with in-memory store.");
  }

  // Start the Express server
  console.log("[railway-start] Starting server...");
  require("../src/server");
}

main().catch((err) => {
  console.error("[railway-start] Fatal error:", err);
  process.exit(1);
});
