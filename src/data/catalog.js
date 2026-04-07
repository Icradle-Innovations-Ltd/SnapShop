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

const PRODUCTS = [
  {
    name: "SnapPod Mini Tripod",
    slug: "snap-pod-mini-tripod",
    categorySlug: "creator-gear",
    price: 65000,
    description: "Compact phone tripod for content recording, online classes, and hands-free viewing.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    name: "LumiRing Creator Light",
    slug: "lumi-ring-creator-light",
    categorySlug: "creator-gear",
    price: 110000,
    description: "USB-powered ring light with warm and cool tones for brighter, cleaner video calls.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    name: "AirView Webcam 1080p",
    slug: "air-view-webcam-1080p",
    categorySlug: "creator-gear",
    price: 145000,
    description: "Sharp webcam for remote meetings, online teaching, and streaming.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    name: "VibeBuds Pro",
    slug: "vibe-buds-pro",
    categorySlug: "audio",
    price: 95000,
    description: "Wireless earbuds with clear calls, noise reduction, and a pocket-friendly case.",
    featured: true,
    active: true,
    visualCode: "AU"
  },
  {
    name: "Pulse Bluetooth Speaker",
    slug: "pulse-bluetooth-speaker",
    categorySlug: "audio",
    price: 135000,
    description: "Portable speaker with rich sound for small events, home use, and outdoor sessions.",
    featured: false,
    active: true,
    visualCode: "AU"
  },
  {
    name: "ChargeCore 20000",
    slug: "charge-core-20000",
    categorySlug: "power",
    price: 120000,
    description: "High-capacity power bank built for phones, earbuds, and light travel use.",
    featured: true,
    active: true,
    visualCode: "PW"
  },
  {
    name: "SmartNest Plug",
    slug: "smart-nest-plug",
    categorySlug: "smart-home",
    price: 85000,
    description: "Control lamps and appliances with a smart plug designed for easy home automation.",
    featured: false,
    active: true,
    visualCode: "SH"
  },
  {
    name: "NoteFlow Tablet Stand",
    slug: "note-flow-tablet-stand",
    categorySlug: "workspace",
    price: 70000,
    description: "Adjustable aluminium stand for tablets and phones during study and work.",
    featured: false,
    active: true,
    visualCode: "WS"
  }
];

const POLL_CHOICES = [
  "Phone Stabilizers",
  "Portable Projectors",
  "Smart Watches"
];

module.exports = {
  CATEGORIES,
  PRODUCTS,
  POLL_CHOICES
};
