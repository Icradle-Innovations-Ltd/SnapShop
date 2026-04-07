const { prisma, hasDatabase } = require("../lib/prisma");
const { CATEGORIES, PRODUCTS, POLL_CHOICES } = require("../data/catalog");
const { memoryStore } = require("../store/memoryStore");
const { createOrderNumber, calculateCartTotals } = require("../utils/orders");

function serializeProduct(product) {
  return {
    id: product.id || product.slug,
    name: product.name,
    slug: product.slug,
    category: product.category?.name || product.categoryName,
    categorySlug: product.category?.slug || product.categorySlug,
    price: product.price,
    description: product.description,
    featured: Boolean(product.featured),
    active: product.active !== false,
    visualCode: product.visualCode
  };
}

function buildFallbackProducts() {
  return PRODUCTS.map((product) => {
    const category = CATEGORIES.find((item) => item.slug === product.categorySlug);
    return serializeProduct({
      ...product,
      id: product.slug,
      categoryName: category ? category.name : product.categorySlug
    });
  });
}

async function listCategories() {
  if (!hasDatabase) {
    return CATEGORIES.map((category) => ({
      ...category,
      productCount: PRODUCTS.filter((product) => product.categorySlug === category.slug && product.active !== false).length
    }));
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where: {
              active: true
            }
          }
        }
      }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    productCount: category._count.products
  }));
}

async function listProducts(filters = {}) {
  const search = (filters.search || "").trim().toLowerCase();
  const category = (filters.category || "").trim().toLowerCase();
  const featured = filters.featured === true || filters.featured === "true";

  if (!hasDatabase) {
    return buildFallbackProducts().filter((product) => {
      const matchesSearch = !search || product.name.toLowerCase().includes(search);
      const matchesCategory = !category || product.categorySlug.toLowerCase() === category || product.category.toLowerCase() === category;
      const matchesFeatured = !featured || product.featured;
      return product.active && matchesSearch && matchesCategory && matchesFeatured;
    });
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(featured ? { featured: true } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(category
        ? {
            category: {
              OR: [
                { slug: category },
                { name: { equals: category, mode: "insensitive" } }
              ]
            }
          }
        : {})
    },
    include: {
      category: true
    },
    orderBy: [
      { featured: "desc" },
      { name: "asc" }
    ]
  });

  return products.map(serializeProduct);
}

async function getProductByIdOrSlug(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  const products = await listProducts();
  return products.find((product) => product.id.toLowerCase() === normalized || product.slug.toLowerCase() === normalized) || null;
}

async function createContactMessage(payload) {
  const entry = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim()
  };

  if (!hasDatabase) {
    const record = {
      id: `contact-${memoryStore.contactMessages.length + 1}`,
      ...entry,
      createdAt: new Date().toISOString()
    };
    memoryStore.contactMessages.push(record);
    return record;
  }

  return prisma.contactMessage.create({
    data: entry
  });
}

async function createPollVote(choice) {
  if (!POLL_CHOICES.includes(choice)) {
    throw new Error("Invalid poll choice.");
  }

  if (!hasDatabase) {
    const existing = memoryStore.pollVotes.find((item) => item.choice === choice);
    if (existing) {
      existing.count += 1;
    }
    return memoryStore.pollVotes;
  }

  await prisma.pollVote.create({
    data: { choice }
  });

  const votes = await prisma.pollVote.findMany({
    select: {
      choice: true
    }
  });

  return POLL_CHOICES.map((label) => ({
    choice: label,
    count: votes.filter((vote) => vote.choice === label).length
  }));
}

async function createOrder(payload) {
  const catalog = await listProducts();
  const requestedItems = Array.isArray(payload.items) ? payload.items : [];

  if (requestedItems.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  const orderItems = requestedItems.map((item) => {
    const product = catalog.find((candidate) => candidate.id === item.id || candidate.slug === item.id);
    if (!product) {
      throw new Error(`Product not found for item: ${item.id}`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for item: ${item.id}`);
    }

    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity
    };
  });

  const totals = calculateCartTotals(orderItems);
  const orderData = {
    orderNumber: createOrderNumber(),
    customerName: payload.fullName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
    deliveryOption: payload.deliveryOption.trim(),
    paymentMethod: payload.paymentMethod.trim(),
    serviceFee: totals.serviceFee,
    total: totals.total,
    items: orderItems
  };

  if (!hasDatabase) {
    const record = {
      id: `order-${memoryStore.orders.length + 1}`,
      status: "PAID",
      createdAt: new Date().toISOString(),
      ...orderData
    };
    memoryStore.orders.push(record);
    return record;
  }

  return prisma.order.create({
    data: {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      email: orderData.email,
      phone: orderData.phone,
      city: orderData.city,
      address: orderData.address,
      deliveryOption: orderData.deliveryOption,
      paymentMethod: orderData.paymentMethod,
      serviceFee: orderData.serviceFee,
      total: orderData.total,
      status: "PAID",
      items: {
        create: orderItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          product: {
            connect: {
              id: item.productId
            }
          }
        }))
      }
    },
    include: {
      items: true
    }
  });
}

async function getOrderByNumber(orderNumber) {
  if (!hasDatabase) {
    return memoryStore.orders.find((order) => order.orderNumber === orderNumber) || null;
  }

  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true
    }
  });
}

module.exports = {
  listCategories,
  listProducts,
  getProductByIdOrSlug,
  createContactMessage,
  createPollVote,
  createOrder,
  getOrderByNumber,
  POLL_CHOICES
};
