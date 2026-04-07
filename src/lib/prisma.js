let PrismaClient = null;

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
