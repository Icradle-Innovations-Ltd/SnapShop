require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { CATEGORIES, PRODUCTS } = require("../src/data/catalog");

const prisma = new PrismaClient();

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
        price: product.price,
        featured: product.featured,
        active: product.active,
        visualCode: product.visualCode,
        categoryId: category.id
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        featured: product.featured,
        active: product.active,
        visualCode: product.visualCode,
        categoryId: category.id
      }
    });
  }
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
