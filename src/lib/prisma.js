let PrismaClient = null;

if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

try {
  ({ PrismaClient } = require("@prisma/client"));
} catch (error) {
  PrismaClient = null;
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const prisma = PrismaClient && hasDatabaseUrl ? new PrismaClient() : null;

module.exports = {
  prisma,
  hasDatabase: Boolean(prisma)
};
