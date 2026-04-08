const { prisma, hasDatabase } = require("../lib/prisma");
const { CATEGORIES, DEFAULT_STORE, PRODUCTS, POLL_CHOICES, DEMO_USERS } = require("../data/catalog");
const { memoryStore } = require("../store/memoryStore");
const { createOrderNumber, calculateCartTotals } = require("../utils/orders");
const { hashPassword, verifyPassword, signJwt } = require("../utils/auth");
const { slugify } = require("../utils/slug");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

function serializeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    category: product.category?.name || product.categoryName,
    categorySlug: product.category?.slug || product.categorySlug,
    storeId: product.store?.id || product.storeId,
    storeName: product.store?.name || product.storeName,
    storeSlug: product.store?.slug || product.storeSlug,
    price: product.price,
    stockQuantity: product.stockQuantity,
    description: product.description,
    featured: Boolean(product.featured),
    active: product.active !== false,
    status: product.status,
    visualCode: product.visualCode
  };
}

function seedMemoryStore() {
  if (memoryStore.users.length > 0) {
    return;
  }

  const adminUser = {
    id: "user-admin",
    name: DEMO_USERS.admin.name,
    email: DEMO_USERS.admin.email,
    passwordHash: hashPassword(DEMO_USERS.admin.password),
    role: DEMO_USERS.admin.role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const vendorUser = {
    id: "user-vendor",
    name: DEMO_USERS.vendor.name,
    email: DEMO_USERS.vendor.email,
    passwordHash: hashPassword(DEMO_USERS.vendor.password),
    role: DEMO_USERS.vendor.role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const customerUser = {
    id: "user-customer",
    name: DEMO_USERS.customer.name,
    email: DEMO_USERS.customer.email,
    passwordHash: hashPassword(DEMO_USERS.customer.password),
    role: DEMO_USERS.customer.role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memoryStore.users.push(adminUser, vendorUser, customerUser);

  const vendorProfile = {
    id: "vendor-profile-1",
    userId: vendorUser.id,
    businessName: DEMO_USERS.vendor.businessName,
    phone: DEMO_USERS.vendor.phone,
    status: "APPROVED",
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoryStore.vendorProfiles.push(vendorProfile);

  const customerProfile = {
    id: "customer-profile-1",
    userId: customerUser.id,
    phone: DEMO_USERS.customer.phone,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoryStore.customerProfiles.push(customerProfile);

  memoryStore.addresses.push({
    id: "address-1",
    customerProfileId: customerProfile.id,
    label: "Home",
    city: "Kampala",
    addressLine: "Plot 14, Yusuf Lule Road",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const store = {
    id: "store-1",
    vendorProfileId: vendorProfile.id,
    name: DEFAULT_STORE.name,
    slug: DEFAULT_STORE.slug,
    description: DEFAULT_STORE.description,
    status: DEFAULT_STORE.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoryStore.stores.push(store);

  PRODUCTS.forEach((product, index) => {
    const category = CATEGORIES.find((item) => item.slug === product.categorySlug);
    memoryStore.products.push({
      id: `product-${index + 1}`,
      ...product,
      categoryId: category ? category.slug : product.categorySlug,
      categoryName: category ? category.name : product.categorySlug,
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      createdById: vendorUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

seedMemoryStore();

async function listCategories() {
  if (!hasDatabase) {
    return CATEGORIES.map((category) => ({
      ...category,
      productCount: memoryStore.products.filter((product) => product.categorySlug === category.slug && product.active).length
    }));
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where: {
              active: true,
              status: "ACTIVE"
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
  const storeId = (filters.storeId || "").trim().toLowerCase();
  const includeDrafts = filters.includeDrafts === true;

  if (!hasDatabase) {
    return memoryStore.products
      .filter((product) => {
        const matchesSearch = !search || product.name.toLowerCase().includes(search);
        const matchesCategory = !category || product.categorySlug === category || product.categoryName.toLowerCase() === category;
        const matchesFeatured = !featured || product.featured;
        const matchesStore = !storeId || product.storeId.toLowerCase() === storeId || product.storeSlug.toLowerCase() === storeId;
        const matchesStatus = includeDrafts ? true : product.status === "ACTIVE";
        return product.active && matchesSearch && matchesCategory && matchesFeatured && matchesStore && matchesStatus;
      })
      .map(serializeProduct);
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(includeDrafts ? {} : { status: "ACTIVE" }),
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
        : {}),
      ...(storeId
        ? {
            store: {
              OR: [
                { id: storeId },
                { slug: storeId }
              ]
            }
          }
        : {})
    },
    include: {
      category: true,
      store: true
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
  const products = await listProducts({ includeDrafts: true });
  return products.find((product) => product.id.toLowerCase() === normalized || product.slug.toLowerCase() === normalized) || null;
}

async function getUserForAuth(email) {
  if (!hasDatabase) {
    return memoryStore.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  }

  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      vendorProfile: {
        include: {
          store: true
        }
      },
      customerProfile: {
        include: {
          addresses: true
        }
      }
    }
  });
}

async function findUserById(userId) {
  if (!hasDatabase) {
    const user = memoryStore.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    const vendorProfile = memoryStore.vendorProfiles.find((profile) => profile.userId === user.id) || null;
    const customerProfile = memoryStore.customerProfiles.find((item) => item.userId === user.id) || null;

    return {
      ...user,
      vendorProfile: vendorProfile
        ? {
            ...vendorProfile,
            store: memoryStore.stores.find((store) => store.vendorProfileId === vendorProfile.id) || null
          }
        : null,
      customerProfile: customerProfile
        ? {
            ...customerProfile,
            addresses: memoryStore.addresses.filter((address) => address.customerProfileId === customerProfile.id)
          }
        : null
    };
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      vendorProfile: {
        include: {
          store: true
        }
      },
      customerProfile: {
        include: {
          addresses: true
        }
      }
    }
  });
}

async function buildAuthPayload(user) {
  const fullUser = await findUserById(user.id);
  return {
    token: signJwt({
      sub: fullUser.id,
      role: fullUser.role,
      email: fullUser.email
    }),
    user: {
      ...sanitizeUser(fullUser),
      vendorProfile: fullUser.vendorProfile
        ? {
            id: fullUser.vendorProfile.id,
            businessName: fullUser.vendorProfile.businessName,
            phone: fullUser.vendorProfile.phone,
            status: fullUser.vendorProfile.status,
            approvedAt: fullUser.vendorProfile.approvedAt,
            store: fullUser.vendorProfile.store || null
          }
        : null,
      customerProfile: fullUser.customerProfile
        ? {
            id: fullUser.customerProfile.id,
            phone: fullUser.customerProfile.phone,
            addresses: fullUser.customerProfile.addresses || []
          }
        : null
    }
  };
}

async function registerUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const role = payload.role;

  if (!["CUSTOMER", "VENDOR"].includes(role)) {
    throw new Error("Registration is available only for customers and vendors.");
  }

  const existing = await getUserForAuth(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  if (!hasDatabase) {
    const user = {
      id: `user-${memoryStore.users.length + 1}`,
      name: payload.name.trim(),
      email,
      passwordHash: hashPassword(payload.password),
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStore.users.push(user);

    if (role === "VENDOR") {
      memoryStore.vendorProfiles.push({
        id: `vendor-profile-${memoryStore.vendorProfiles.length + 1}`,
        userId: user.id,
        businessName: payload.businessName.trim(),
        phone: payload.phone?.trim() || null,
        status: "PENDING",
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (role === "CUSTOMER") {
      memoryStore.customerProfiles.push({
        id: `customer-profile-${memoryStore.customerProfiles.length + 1}`,
        userId: user.id,
        phone: payload.phone?.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return buildAuthPayload(user);
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name.trim(),
      email,
      passwordHash: hashPassword(payload.password),
      role,
      ...(role === "VENDOR"
        ? {
            vendorProfile: {
              create: {
                businessName: payload.businessName.trim(),
                phone: payload.phone?.trim() || null,
                status: "PENDING"
              }
            }
          }
        : {}),
      ...(role === "CUSTOMER"
        ? {
            customerProfile: {
              create: {
                phone: payload.phone?.trim() || null
              }
            }
          }
        : {})
    }
  });

  return buildAuthPayload(user);
}

async function loginUser(email, password) {
  const user = await getUserForAuth(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  if (!user.isActive) {
    throw new Error("This account is not active.");
  }

  return buildAuthPayload(user);
}

async function getAuthUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }
  const authPayload = await buildAuthPayload(user);
  return authPayload.user;
}

async function createContactMessage(payload, authUser = null) {
  const entry = {
    userId: authUser?.id || null,
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

async function getVendorProfileByUser(userId) {
  if (!hasDatabase) {
    const profile = memoryStore.vendorProfiles.find((item) => item.userId === userId);
    if (!profile) {
      return null;
    }
    return {
      ...profile,
      store: memoryStore.stores.find((store) => store.vendorProfileId === profile.id) || null
    };
  }

  return prisma.vendorProfile.findUnique({
    where: { userId },
    include: {
      store: true
    }
  });
}

async function createVendorStore(userId, payload) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile) {
    throw new Error("Vendor profile not found.");
  }

  if (vendorProfile.status !== "APPROVED") {
    throw new Error("Vendor account must be approved before creating a store.");
  }

  if (vendorProfile.store) {
    throw new Error("This vendor already has a store.");
  }

  const slug = slugify(payload.name);
  if (!slug) {
    throw new Error("Store name must produce a valid slug.");
  }

  if (!hasDatabase) {
    if (memoryStore.stores.some((store) => store.slug === slug)) {
      throw new Error("A store with this name already exists.");
    }

    const store = {
      id: `store-${memoryStore.stores.length + 1}`,
      vendorProfileId: vendorProfile.id,
      name: payload.name.trim(),
      slug,
      description: payload.description.trim(),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStore.stores.push(store);
    return store;
  }

  return prisma.store.create({
    data: {
      vendorProfileId: vendorProfile.id,
      name: payload.name.trim(),
      slug,
      description: payload.description.trim(),
      status: "ACTIVE"
    }
  });
}

async function listVendorProducts(userId) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile?.store) {
    return [];
  }

  return listProducts({
    storeId: vendorProfile.store.id,
    includeDrafts: true
  });
}

async function createVendorProduct(userId, payload) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile?.store) {
    throw new Error("Vendor store not found.");
  }

  const slug = slugify(payload.name);
  const categoryRecord = CATEGORIES.find((category) => category.slug === payload.categorySlug);
  if (!slug || !categoryRecord) {
    throw new Error("Valid product name and category are required.");
  }

  if (!hasDatabase) {
    if (memoryStore.products.some((product) => product.slug === slug || product.sku === payload.sku)) {
      throw new Error("Product slug or SKU already exists.");
    }

    const product = {
      id: `product-${memoryStore.products.length + 1}`,
      name: payload.name.trim(),
      slug,
      sku: payload.sku.trim(),
      description: payload.description.trim(),
      price: Number(payload.price),
      stockQuantity: Number(payload.stockQuantity),
      featured: Boolean(payload.featured),
      active: true,
      status: payload.status || "DRAFT",
      visualCode: payload.visualCode?.trim() || categoryRecord.name.slice(0, 2).toUpperCase(),
      categoryId: categoryRecord.slug,
      categoryName: categoryRecord.name,
      categorySlug: categoryRecord.slug,
      storeId: vendorProfile.store.id,
      storeName: vendorProfile.store.name,
      storeSlug: vendorProfile.store.slug,
      createdById: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStore.products.push(product);
    return serializeProduct(product);
  }

  const category = await prisma.category.findUnique({
    where: { slug: payload.categorySlug }
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  const product = await prisma.product.create({
    data: {
      name: payload.name.trim(),
      slug,
      sku: payload.sku.trim(),
      description: payload.description.trim(),
      price: Number(payload.price),
      stockQuantity: Number(payload.stockQuantity),
      featured: Boolean(payload.featured),
      active: true,
      status: payload.status || "DRAFT",
      visualCode: payload.visualCode?.trim() || category.name.slice(0, 2).toUpperCase(),
      categoryId: category.id,
      storeId: vendorProfile.store.id,
      createdById: userId
    },
    include: {
      category: true,
      store: true
    }
  });

  return serializeProduct(product);
}

async function updateVendorProduct(userId, productId, payload) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile?.store) {
    throw new Error("Vendor store not found.");
  }

  if (!hasDatabase) {
    const product = memoryStore.products.find((item) => item.id === productId && item.storeId === vendorProfile.store.id);
    if (!product) {
      throw new Error("Product not found in vendor store.");
    }

    Object.assign(product, {
      ...(payload.name ? { name: payload.name.trim(), slug: slugify(payload.name) || product.slug } : {}),
      ...(payload.description ? { description: payload.description.trim() } : {}),
      ...(payload.sku ? { sku: payload.sku.trim() } : {}),
      ...(payload.price !== undefined ? { price: Number(payload.price) } : {}),
      ...(payload.stockQuantity !== undefined ? { stockQuantity: Number(payload.stockQuantity) } : {}),
      ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      updatedAt: new Date().toISOString()
    });
    return serializeProduct(product);
  }

  const existing = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: vendorProfile.store.id
    },
    include: {
      category: true,
      store: true
    }
  });

  if (!existing) {
    throw new Error("Product not found in vendor store.");
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(payload.name ? { name: payload.name.trim(), slug: slugify(payload.name) || existing.slug } : {}),
      ...(payload.description ? { description: payload.description.trim() } : {}),
      ...(payload.sku ? { sku: payload.sku.trim() } : {}),
      ...(payload.price !== undefined ? { price: Number(payload.price) } : {}),
      ...(payload.stockQuantity !== undefined ? { stockQuantity: Number(payload.stockQuantity) } : {}),
      ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
      ...(payload.status ? { status: payload.status } : {})
    },
    include: {
      category: true,
      store: true
    }
  });

  return serializeProduct(updated);
}

async function addCustomerAddress(userId, payload) {
  const user = await findUserById(userId);
  if (!user?.customerProfile) {
    throw new Error("Customer profile not found.");
  }

  if (!hasDatabase) {
    if (payload.isDefault) {
      memoryStore.addresses.forEach((address) => {
        if (address.customerProfileId === user.customerProfile.id) {
          address.isDefault = false;
        }
      });
    }

    const address = {
      id: `address-${memoryStore.addresses.length + 1}`,
      customerProfileId: user.customerProfile.id,
      label: payload.label.trim(),
      city: payload.city.trim(),
      addressLine: payload.addressLine.trim(),
      isDefault: Boolean(payload.isDefault),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStore.addresses.push(address);
    return address;
  }

  if (payload.isDefault) {
    await prisma.address.updateMany({
      where: { customerProfileId: user.customerProfile.id },
      data: { isDefault: false }
    });
  }

  return prisma.address.create({
    data: {
      customerProfileId: user.customerProfile.id,
      label: payload.label.trim(),
      city: payload.city.trim(),
      addressLine: payload.addressLine.trim(),
      isDefault: Boolean(payload.isDefault)
    }
  });
}

async function createOrder(payload, authUser = null) {
  const catalog = await listProducts({ includeDrafts: false });
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
      storeId: product.storeId,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity
    };
  });

  const storeIds = [...new Set(orderItems.map((item) => item.storeId))];
  if (storeIds.length !== 1) {
    throw new Error("This checkout supports one store per order.");
  }

  const totals = calculateCartTotals(orderItems);
  const orderNumber = createOrderNumber();
  const customerProfileId = authUser?.role === "CUSTOMER" && authUser.customerProfile ? authUser.customerProfile.id : null;
  const orderData = {
    orderNumber,
    customerProfileId,
    storeId: storeIds[0],
    customerName: payload.fullName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
    deliveryOption: payload.deliveryOption.trim(),
    paymentMethod: payload.paymentMethod.trim(),
    serviceFee: totals.serviceFee,
    total: totals.total,
    status: "PAID",
    items: orderItems
  };

  if (!hasDatabase) {
    const record = {
      id: `order-${memoryStore.orders.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...orderData
    };
    memoryStore.orders.push(record);
    memoryStore.orderStatusHistory.push({
      id: `order-status-${memoryStore.orderStatusHistory.length + 1}`,
      orderId: record.id,
      status: "PAID",
      note: "Order created and paid.",
      createdAt: new Date().toISOString()
    });
    return record;
  }

  return prisma.order.create({
    data: {
      orderNumber: orderData.orderNumber,
      customerProfileId: orderData.customerProfileId,
      storeId: orderData.storeId,
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
      },
      statusHistory: {
        create: {
          status: "PAID",
          note: "Order created and paid."
        }
      }
    },
    include: {
      items: true,
      statusHistory: true
    }
  });
}

async function getOrderByNumber(orderNumber) {
  if (!hasDatabase) {
    const order = memoryStore.orders.find((item) => item.orderNumber === orderNumber) || null;
    if (!order) {
      return null;
    }
    return {
      ...order,
      statusHistory: memoryStore.orderStatusHistory.filter((entry) => entry.orderId === order.id)
    };
  }

  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      statusHistory: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

async function listCustomerOrders(userId) {
  const user = await findUserById(userId);
  if (!user?.customerProfile) {
    throw new Error("Customer profile not found.");
  }

  if (!hasDatabase) {
    return memoryStore.orders
      .filter((order) => order.customerProfileId === user.customerProfile.id)
      .map((order) => ({
        ...order,
        statusHistory: memoryStore.orderStatusHistory.filter((entry) => entry.orderId === order.id)
      }));
  }

  return prisma.order.findMany({
    where: {
      customerProfileId: user.customerProfile.id
    },
    include: {
      items: true,
      store: true,
      statusHistory: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function getCustomerOrder(userId, orderNumber) {
  const orders = await listCustomerOrders(userId);
  return orders.find((order) => order.orderNumber === orderNumber) || null;
}

async function listPendingVendors() {
  if (!hasDatabase) {
    return memoryStore.vendorProfiles
      .filter((profile) => profile.status === "PENDING")
      .map((profile) => {
        const user = memoryStore.users.find((item) => item.id === profile.userId);
        return {
          ...profile,
          user: sanitizeUser(user)
        };
      });
  }

  const vendors = await prisma.vendorProfile.findMany({
    where: {
      status: "PENDING"
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return vendors.map((vendor) => ({
    ...vendor,
    user: sanitizeUser(vendor.user)
  }));
}

async function approveVendor(vendorProfileId) {
  if (!hasDatabase) {
    const profile = memoryStore.vendorProfiles.find((item) => item.id === vendorProfileId);
    if (!profile) {
      throw new Error("Vendor profile not found.");
    }
    profile.status = "APPROVED";
    profile.approvedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorProfileId },
    data: {
      status: "APPROVED",
      approvedAt: new Date()
    }
  });
}

async function rejectVendor(vendorProfileId) {
  if (!hasDatabase) {
    const profile = memoryStore.vendorProfiles.find((item) => item.id === vendorProfileId);
    if (!profile) {
      throw new Error("Vendor profile not found.");
    }
    profile.status = "REJECTED";
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorProfileId },
    data: { status: "REJECTED" }
  });
}

async function listAllVendors() {
  if (!hasDatabase) {
    return memoryStore.vendorProfiles.map((profile) => {
      const user = memoryStore.users.find((item) => item.id === profile.userId);
      const store = memoryStore.stores.find((s) => s.vendorProfileId === profile.id) || null;
      return { ...profile, user: sanitizeUser(user), store };
    });
  }

  const vendors = await prisma.vendorProfile.findMany({
    include: { user: true, store: true },
    orderBy: { createdAt: "desc" }
  });

  return vendors.map((v) => ({ ...v, user: sanitizeUser(v.user) }));
}

async function toggleUserActive(userId, isActive) {
  if (!hasDatabase) {
    const user = memoryStore.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }
    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
    return sanitizeUser(user);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive }
  });
  return sanitizeUser(updated);
}

async function updateUserProfile(userId, payload) {
  if (!hasDatabase) {
    const user = memoryStore.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (payload.name) user.name = payload.name.trim();
    if (payload.phone !== undefined) {
      const profile = memoryStore.customerProfiles.find((p) => p.userId === userId)
        || memoryStore.vendorProfiles.find((p) => p.userId === userId);
      if (profile) profile.phone = payload.phone.trim() || null;
    }
    user.updatedAt = new Date().toISOString();
    return await buildAuthPayload(user);
  }

  const data = {};
  if (payload.name) data.name = payload.name.trim();
  const updated = await prisma.user.update({ where: { id: userId }, data });

  if (payload.phone !== undefined) {
    const role = updated.role;
    if (role === "CUSTOMER") {
      await prisma.customerProfile.updateMany({ where: { userId }, data: { phone: payload.phone.trim() || null } });
    } else if (role === "VENDOR") {
      await prisma.vendorProfile.updateMany({ where: { userId }, data: { phone: payload.phone.trim() || null } });
    }
  }

  return await buildAuthPayload(updated);
}

async function changeUserPassword(userId, currentPassword, newPassword) {
  let user;
  if (!hasDatabase) {
    user = memoryStore.users.find((item) => item.id === userId);
  } else {
    user = await prisma.user.findUnique({ where: { id: userId } });
  }
  if (!user) {
    throw new Error("User not found.");
  }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }
  const newHash = hashPassword(newPassword);
  if (!hasDatabase) {
    user.passwordHash = newHash;
    user.updatedAt = new Date().toISOString();
  } else {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }
  return { message: "Password changed successfully." };
}

async function updateOrderStatus(orderId, status, note) {
  const validStatuses = ["PENDING", "PAID", "PROCESSING", "READY_FOR_PICKUP", "ASSIGNED_TO_AGENT", "IN_TRANSIT", "DELIVERED", "CANCELLED", "RETURN_REQUESTED"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid order status.");
  }

  if (!hasDatabase) {
    const order = memoryStore.orders.find((item) => item.id === orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    memoryStore.orderStatusHistory.push({
      id: `order-status-${memoryStore.orderStatusHistory.length + 1}`,
      orderId: order.id,
      status,
      note: note || `Status changed to ${status}.`,
      createdAt: new Date().toISOString()
    });
    return {
      ...order,
      statusHistory: memoryStore.orderStatusHistory.filter((e) => e.orderId === order.id)
    };
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      statusHistory: {
        create: { status, note: note || `Status changed to ${status}.` }
      }
    },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } }
  });
  return order;
}

async function deleteCustomerAddress(userId, addressId) {
  const user = await findUserById(userId);
  if (!user?.customerProfile) {
    throw new Error("Customer profile not found.");
  }

  if (!hasDatabase) {
    const index = memoryStore.addresses.findIndex(
      (a) => a.id === addressId && a.customerProfileId === user.customerProfile.id
    );
    if (index === -1) {
      throw new Error("Address not found.");
    }
    memoryStore.addresses.splice(index, 1);
    return { message: "Address deleted." };
  }

  const address = await prisma.address.findFirst({
    where: { id: addressId, customerProfileId: user.customerProfile.id }
  });
  if (!address) {
    throw new Error("Address not found.");
  }
  await prisma.address.delete({ where: { id: addressId } });
  return { message: "Address deleted." };
}

async function listVendorOrders(userId) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile?.store) {
    return [];
  }

  if (!hasDatabase) {
    return memoryStore.orders
      .filter((order) => order.storeId === vendorProfile.store.id)
      .map((order) => ({
        ...order,
        statusHistory: memoryStore.orderStatusHistory.filter((e) => e.orderId === order.id)
      }));
  }

  return prisma.order.findMany({
    where: { storeId: vendorProfile.store.id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
}

async function updateVendorOrderStatus(userId, orderId, status, note) {
  const vendorProfile = await getVendorProfileByUser(userId);
  if (!vendorProfile?.store) {
    throw new Error("Vendor store not found.");
  }

  const validStatuses = ["PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status for vendor.");
  }

  if (!hasDatabase) {
    const order = memoryStore.orders.find((o) => o.id === orderId && o.storeId === vendorProfile.store.id);
    if (!order) {
      throw new Error("Order not found in your store.");
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    memoryStore.orderStatusHistory.push({
      id: `order-status-${memoryStore.orderStatusHistory.length + 1}`,
      orderId: order.id,
      status,
      note: note || `Vendor updated status to ${status}.`,
      createdAt: new Date().toISOString()
    });
    return {
      ...order,
      statusHistory: memoryStore.orderStatusHistory.filter((e) => e.orderId === order.id)
    };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: vendorProfile.store.id }
  });
  if (!order) {
    throw new Error("Order not found in your store.");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      statusHistory: {
        create: { status, note: note || `Vendor updated status to ${status}.` }
      }
    },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } }
  });
}

module.exports = {
  listCategories,
  listProducts,
  getProductByIdOrSlug,
  registerUser,
  loginUser,
  getAuthUser,
  createContactMessage,
  createPollVote,
  createVendorStore,
  listVendorProducts,
  createVendorProduct,
  updateVendorProduct,
  addCustomerAddress,
  createOrder,
  getOrderByNumber,
  listCustomerOrders,
  getCustomerOrder,
  listPendingVendors,
  approveVendor,
  rejectVendor,
  listAllVendors,
  toggleUserActive,
  updateUserProfile,
  changeUserPassword,
  updateOrderStatus,
  deleteCustomerAddress,
  listVendorOrders,
  updateVendorOrderStatus,
  POLL_CHOICES
};
