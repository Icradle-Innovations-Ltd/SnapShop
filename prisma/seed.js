require("dotenv").config();

if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const { PrismaClient } = require("@prisma/client");
const { CATEGORIES, DEFAULT_STORE, PRODUCTS, DEMO_USERS } = require("../src/data/catalog");
const { hashPassword } = require("../src/utils/auth");

const prisma = new PrismaClient();

async function upsertUser(data) {
  return prisma.user.upsert({
    where: { email: data.email.toLowerCase() },
    update: {
      name: data.name,
      passwordHash: hashPassword(data.password),
      role: data.role,
      isActive: true
    },
    create: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      isActive: true
    }
  });
}

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description
      },
      create: category
    });
  }

  const adminUser = await upsertUser(DEMO_USERS.admin);
  const vendorUser = await upsertUser(DEMO_USERS.vendor);
  const customerUser = await upsertUser(DEMO_USERS.customer);

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {
      businessName: DEMO_USERS.vendor.businessName,
      phone: DEMO_USERS.vendor.phone,
      status: "APPROVED",
      approvedAt: new Date()
    },
    create: {
      userId: vendorUser.id,
      businessName: DEMO_USERS.vendor.businessName,
      phone: DEMO_USERS.vendor.phone,
      status: "APPROVED",
      approvedAt: new Date()
    }
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {
      phone: DEMO_USERS.customer.phone
    },
    create: {
      userId: customerUser.id,
      phone: DEMO_USERS.customer.phone
    }
  });

  await prisma.address.upsert({
    where: { id: "seed-default-address" },
    update: {
      customerProfileId: customerProfile.id,
      label: "Home",
      city: "Kampala",
      addressLine: "Plot 14, Yusuf Lule Road",
      isDefault: true
    },
    create: {
      id: "seed-default-address",
      customerProfileId: customerProfile.id,
      label: "Home",
      city: "Kampala",
      addressLine: "Plot 14, Yusuf Lule Road",
      isDefault: true
    }
  });

  const store = await prisma.store.upsert({
    where: { slug: DEFAULT_STORE.slug },
    update: {
      vendorProfileId: vendorProfile.id,
      name: DEFAULT_STORE.name,
      description: DEFAULT_STORE.description,
      status: DEFAULT_STORE.status
    },
    create: {
      vendorProfileId: vendorProfile.id,
      name: DEFAULT_STORE.name,
      slug: DEFAULT_STORE.slug,
      description: DEFAULT_STORE.description,
      status: DEFAULT_STORE.status
    }
  });

  for (const product of PRODUCTS) {
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug }
    });

    if (!category) {
      throw new Error(`Category not found for product seed: ${product.name}`);
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        sku: product.sku,
        price: product.price,
        stockQuantity: product.stockQuantity,
        featured: product.featured,
        active: product.active,
        status: product.status,
        visualCode: product.visualCode,
        categoryId: category.id,
        storeId: store.id,
        createdById: vendorUser.id
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        sku: product.sku,
        price: product.price,
        stockQuantity: product.stockQuantity,
        featured: product.featured,
        active: product.active,
        status: product.status,
        visualCode: product.visualCode,
        categoryId: category.id,
        storeId: store.id,
        createdById: vendorUser.id
      }
    });
  }

  console.log("Seeded demo users:");
  console.log(`Admin: ${DEMO_USERS.admin.email} / ${DEMO_USERS.admin.password}`);
  console.log(`Vendor: ${DEMO_USERS.vendor.email} / ${DEMO_USERS.vendor.password}`);
  console.log(`Customer: ${DEMO_USERS.customer.email} / ${DEMO_USERS.customer.password}`);
  console.log(`Store owner: ${store.name}`);
  console.log(`Admin user id: ${adminUser.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database seeded successfully.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
