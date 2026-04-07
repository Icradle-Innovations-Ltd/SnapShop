const CATEGORIES = [
  {
    name: "Creator Gear",
    slug: "creator-gear",
    description: "Lighting, tripods, and webcam tools for content, classes, and remote work."
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Earbuds and speakers built for clear everyday listening."
  },
  {
    name: "Power",
    slug: "power",
    description: "Portable charging tools that keep devices ready."
  },
  {
    name: "Workspace",
    slug: "workspace",
    description: "Desk accessories that improve comfort and focus."
  },
  {
    name: "Smart Home",
    slug: "smart-home",
    description: "Simple home control accessories for modern living."
  }
];

const DEFAULT_STORE = {
  name: "SnapShop Main Store",
  slug: "snapshop-main-store",
  description: "The official SnapShop marketplace store for creator gadgets and smart accessories.",
  status: "ACTIVE"
};

const PRODUCTS = [
  {
    name: "SnapPod Mini Tripod",
    slug: "snap-pod-mini-tripod",
    sku: "SNAP-CG-001",
    categorySlug: "creator-gear",
    price: 65000,
    stockQuantity: 14,
    description: "Compact phone tripod for content recording, online classes, and hands-free viewing.",
    featured: true,
    active: true,
    status: "ACTIVE",
    visualCode: "CG"
  },
  {
    name: "LumiRing Creator Light",
    slug: "lumi-ring-creator-light",
    sku: "SNAP-CG-002",
    categorySlug: "creator-gear",
    price: 110000,
    stockQuantity: 10,
    description: "USB-powered ring light with warm and cool tones for brighter, cleaner video calls.",
    featured: true,
    active: true,
    status: "ACTIVE",
    visualCode: "CG"
  },
  {
    name: "AirView Webcam 1080p",
    slug: "air-view-webcam-1080p",
    sku: "SNAP-CG-003",
    categorySlug: "creator-gear",
    price: 145000,
    stockQuantity: 8,
    description: "Sharp webcam for remote meetings, online teaching, and streaming.",
    featured: true,
    active: true,
    status: "ACTIVE",
    visualCode: "CG"
  },
  {
    name: "VibeBuds Pro",
    slug: "vibe-buds-pro",
    sku: "SNAP-AU-001",
    categorySlug: "audio",
    price: 95000,
    stockQuantity: 20,
    description: "Wireless earbuds with clear calls, noise reduction, and a pocket-friendly case.",
    featured: true,
    active: true,
    status: "ACTIVE",
    visualCode: "AU"
  },
  {
    name: "Pulse Bluetooth Speaker",
    slug: "pulse-bluetooth-speaker",
    sku: "SNAP-AU-002",
    categorySlug: "audio",
    price: 135000,
    stockQuantity: 12,
    description: "Portable speaker with rich sound for small events, home use, and outdoor sessions.",
    featured: false,
    active: true,
    status: "ACTIVE",
    visualCode: "AU"
  },
  {
    name: "ChargeCore 20000",
    slug: "charge-core-20000",
    sku: "SNAP-PW-001",
    categorySlug: "power",
    price: 120000,
    stockQuantity: 16,
    description: "High-capacity power bank built for phones, earbuds, and light travel use.",
    featured: true,
    active: true,
    status: "ACTIVE",
    visualCode: "PW"
  },
  {
    name: "SmartNest Plug",
    slug: "smart-nest-plug",
    sku: "SNAP-SH-001",
    categorySlug: "smart-home",
    price: 85000,
    stockQuantity: 18,
    description: "Control lamps and appliances with a smart plug designed for easy home automation.",
    featured: false,
    active: true,
    status: "ACTIVE",
    visualCode: "SH"
  },
  {
    name: "NoteFlow Tablet Stand",
    slug: "note-flow-tablet-stand",
    sku: "SNAP-WS-001",
    categorySlug: "workspace",
    price: 70000,
    stockQuantity: 9,
    description: "Adjustable aluminium stand for tablets and phones during study and work.",
    featured: false,
    active: true,
    status: "ACTIVE",
    visualCode: "WS"
  }
];

const POLL_CHOICES = [
  "Phone Stabilizers",
  "Portable Projectors",
  "Smart Watches"
];

const DEMO_USERS = {
  admin: {
    name: "SnapShop Admin",
    email: "admin@snapshop.ug",
    password: "Admin123!",
    role: "ADMIN"
  },
  vendor: {
    name: "Vendor Demo",
    email: "vendor@snapshop.ug",
    password: "Vendor123!",
    role: "VENDOR",
    businessName: "SnapShop Marketplace Vendor",
    phone: "+256700100200"
  },
  customer: {
    name: "Customer Demo",
    email: "customer@snapshop.ug",
    password: "Customer123!",
    role: "CUSTOMER",
    phone: "+256700300400"
  }
};

module.exports = {
  CATEGORIES,
  DEFAULT_STORE,
  PRODUCTS,
  POLL_CHOICES,
  DEMO_USERS
};
