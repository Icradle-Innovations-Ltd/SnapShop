const DEFAULT_PRODUCTS = [
  {
    id: "snap-pod-mini-tripod",
    name: "SnapPod Mini Tripod",
    slug: "snap-pod-mini-tripod",
    category: "Creator Gear",
    categorySlug: "creator-gear",
    price: 65000,
    description: "Compact phone tripod for content recording, online classes, and hands-free viewing.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    id: "lumi-ring-creator-light",
    name: "LumiRing Creator Light",
    slug: "lumi-ring-creator-light",
    category: "Creator Gear",
    categorySlug: "creator-gear",
    price: 110000,
    description: "USB-powered ring light with warm and cool tones for brighter, cleaner video calls.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    id: "air-view-webcam-1080p",
    name: "AirView Webcam 1080p",
    slug: "air-view-webcam-1080p",
    category: "Creator Gear",
    categorySlug: "creator-gear",
    price: 145000,
    description: "Sharp webcam for remote meetings, online teaching, and streaming.",
    featured: true,
    active: true,
    visualCode: "CG"
  },
  {
    id: "vibe-buds-pro",
    name: "VibeBuds Pro",
    slug: "vibe-buds-pro",
    category: "Audio",
    categorySlug: "audio",
    price: 95000,
    description: "Wireless earbuds with clear calls, noise reduction, and a pocket-friendly case.",
    featured: true,
    active: true,
    visualCode: "AU"
  },
  {
    id: "pulse-bluetooth-speaker",
    name: "Pulse Bluetooth Speaker",
    slug: "pulse-bluetooth-speaker",
    category: "Audio",
    categorySlug: "audio",
    price: 135000,
    description: "Portable speaker with rich sound for small events, home use, and outdoor sessions.",
    featured: false,
    active: true,
    visualCode: "AU"
  },
  {
    id: "charge-core-20000",
    name: "ChargeCore 20000",
    slug: "charge-core-20000",
    category: "Power",
    categorySlug: "power",
    price: 120000,
    description: "High-capacity power bank built for phones, earbuds, and light travel use.",
    featured: true,
    active: true,
    visualCode: "PW"
  },
  {
    id: "smart-nest-plug",
    name: "SmartNest Plug",
    slug: "smart-nest-plug",
    category: "Smart Home",
    categorySlug: "smart-home",
    price: 85000,
    description: "Control lamps and appliances with a smart plug designed for easy home automation.",
    featured: false,
    active: true,
    visualCode: "SH"
  },
  {
    id: "note-flow-tablet-stand",
    name: "NoteFlow Tablet Stand",
    slug: "note-flow-tablet-stand",
    category: "Workspace",
    categorySlug: "workspace",
    price: 70000,
    description: "Adjustable aluminium stand for tablets and phones during study and work.",
    featured: false,
    active: true,
    visualCode: "WS"
  }
];

const CART_KEY = "snapshopCart";
const CHECKOUT_KEY = "snapshopCheckout";
const ORDERS_KEY = "snapshopOrders";
const POLL_KEY = "snapshopPollChoice";
const API_BASE = "/api";

let productsCache = [...DEFAULT_PRODUCTS];

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartIndicators();
}

function getCheckoutDraft() {
  try {
    return JSON.parse(localStorage.getItem(CHECKOUT_KEY));
  } catch (error) {
    return null;
  }
}

function getProducts() {
  return productsCache;
}

function findProduct(productId) {
  const normalized = String(productId || "").trim().toLowerCase();
  return getProducts().find((product) => {
    return product.id.toLowerCase() === normalized || product.slug.toLowerCase() === normalized;
  });
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) {
      throw new Error("Unable to load products from API.");
    }

    const payload = await response.json();
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      productsCache = payload.products;
    }
  } catch (error) {
    productsCache = [...DEFAULT_PRODUCTS];
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed.");
  }

  return payload;
}

function cartDetailed() {
  return getCart()
    .map((item) => {
      const product = findProduct(item.id);
      return product ? { ...product, quantity: item.quantity, lineTotal: product.price * item.quantity } : null;
    })
    .filter(Boolean);
}

function cartTotals() {
  const items = cartDetailed();
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const serviceFee = items.length > 0 ? 5000 : 0;
  const total = subtotal + serviceFee;

  return { items, subtotal, serviceFee, total };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0
  }).format(value);
}

function showToast(message) {
  const toast = document.getElementById("status-toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function updateCartIndicators() {
  const totalItems = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach((node) => {
    node.textContent = String(totalItems);
  });
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  saveCart(cart);
  showToast("Item added to cart.");
  renderCartPage();
  renderCheckoutPage();
  renderPaymentPage();
}

function updateCartItem(productId, nextQuantity) {
  const cart = getCart();
  const updatedCart = cart
    .map((item) => item.id === productId ? { ...item, quantity: nextQuantity } : item)
    .filter((item) => item.quantity > 0);
  saveCart(updatedCart);
  renderCartPage();
  renderCheckoutPage();
  renderPaymentPage();
}

function clearCart() {
  saveCart([]);
  localStorage.removeItem(CHECKOUT_KEY);
  renderCartPage();
  renderCheckoutPage();
  renderPaymentPage();
}

function createProductCard(product) {
  const visualCode = product.visualCode || product.category
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return `
    <article class="card product-card">
      <div class="product-visual" aria-hidden="true">${visualCode}</div>
      <span class="product-tag">${product.category}</span>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-price">${formatCurrency(product.price)}</div>
      <button class="button button-primary" type="button" data-add-to-cart="${product.id}">Add To Cart</button>
    </article>
  `;
}

function renderFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) {
    return;
  }

  container.innerHTML = getProducts()
    .filter((product) => product.featured)
    .map(createProductCard)
    .join("");
}

function renderCatalog() {
  const results = document.getElementById("catalog-results");
  const searchInput = document.getElementById("product-search");
  const filterContainer = document.getElementById("category-filters");

  if (!results || !searchInput || !filterContainer) {
    return;
  }

  const categoryMap = new Map();
  getProducts().forEach((product) => {
    if (!categoryMap.has(product.categorySlug)) {
      categoryMap.set(product.categorySlug, product.category);
    }
  });

  const categories = [
    { slug: "all", name: "All" },
    ...Array.from(categoryMap.entries()).map(([slug, name]) => ({ slug, name }))
  ];
  let activeCategory = "all";

  filterContainer.innerHTML = categories.map((category) => `
    <button class="chip ${category.slug === "all" ? "is-active" : ""}" type="button" data-category-filter="${category.slug}">${category.name}</button>
  `).join("");

  function paintProducts() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const filteredProducts = getProducts().filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categorySlug === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchValue);
      return product.active && matchesCategory && matchesSearch;
    });

    results.innerHTML = filteredProducts.length > 0
      ? filteredProducts.map(createProductCard).join("")
      : `<article class="card empty-state">No products match your search right now.</article>`;
  }

  filterContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-filter]");
    if (!button) {
      return;
    }
    activeCategory = button.dataset.categoryFilter;
    filterContainer.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("is-active"));
    button.classList.add("is-active");
    paintProducts();
  });

  searchInput.addEventListener("input", paintProducts);
  paintProducts();
}

function summaryMarkup(totals) {
  return `
    <div class="summary-line"><span>Items</span><strong>${totals.items.length}</strong></div>
    <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
    <div class="summary-line"><span>Service fee</span><strong>${formatCurrency(totals.serviceFee)}</strong></div>
    <div class="summary-line total"><span>Total</span><strong>${formatCurrency(totals.total)}</strong></div>
  `;
}

function renderCartPage() {
  const itemsContainer = document.getElementById("cart-items");
  const summaryContainer = document.getElementById("cart-summary");

  if (!itemsContainer || !summaryContainer) {
    return;
  }

  const totals = cartTotals();

  if (totals.items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-state">
        <h2>Your cart is empty.</h2>
        <p>Add products from the shop page to begin checkout.</p>
        <a class="button button-primary" href="shop.html">Browse Products</a>
      </div>
    `;
    summaryContainer.innerHTML = summaryMarkup(totals);
    return;
  }

  itemsContainer.innerHTML = totals.items.map((item) => `
    <article class="cart-item">
      <div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="cart-item-actions">
          <span class="product-tag">${item.category}</span>
          <span>${formatCurrency(item.price)} each</span>
        </div>
      </div>
      <div class="quantity-control">
        <button class="quantity-button" type="button" data-quantity-change="${item.id}" data-delta="-1" aria-label="Reduce quantity for ${item.name}">-</button>
        <strong>${item.quantity}</strong>
        <button class="quantity-button" type="button" data-quantity-change="${item.id}" data-delta="1" aria-label="Increase quantity for ${item.name}">+</button>
        <strong>${formatCurrency(item.lineTotal)}</strong>
        <button class="button button-secondary" type="button" data-remove-item="${item.id}">Remove</button>
      </div>
    </article>
  `).join("");

  summaryContainer.innerHTML = summaryMarkup(totals);
}

function renderCheckoutPage() {
  const summaryContainer = document.getElementById("checkout-summary");
  const form = document.getElementById("checkout-form");
  const message = document.getElementById("checkout-message");

  if (!summaryContainer || !form) {
    return;
  }

  const totals = cartTotals();
  if (totals.items.length === 0) {
    summaryContainer.innerHTML = `
      <div class="empty-state">
        <p>Your cart has no items yet.</p>
        <a class="button button-primary" href="shop.html">Go To Shop</a>
      </div>
    `;
  } else {
    summaryContainer.innerHTML = `
      ${totals.items.map((item) => `<div class="summary-line"><span>${item.name} x ${item.quantity}</span><strong>${formatCurrency(item.lineTotal)}</strong></div>`).join("")}
      ${summaryMarkup(totals)}
    `;
  }

  const existingDraft = getCheckoutDraft();
  if (existingDraft) {
    Object.keys(existingDraft).forEach((key) => {
      if (form.elements[key]) {
        form.elements[key].value = existingDraft[key];
      }
    });
  }

  if (form.dataset.bound === "true") {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (totals.items.length === 0) {
      message.textContent = "Add at least one item to continue.";
      return;
    }

    if (!form.reportValidity()) {
      message.textContent = "Please complete the required delivery details.";
      return;
    }

    const formData = new FormData(form);
    const draft = Object.fromEntries(formData.entries());
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(draft));
    message.textContent = "Delivery details saved. Redirecting to payment.";
    window.location.href = "payment.html";
  });

  form.dataset.bound = "true";
}

function renderPaymentPage() {
  const customerNode = document.getElementById("payment-customer");
  const summaryContainer = document.getElementById("payment-summary");
  const payButton = document.getElementById("complete-payment");

  if (!customerNode || !summaryContainer || !payButton) {
    return;
  }

  const draft = getCheckoutDraft();
  const totals = cartTotals();

  if (!draft || totals.items.length === 0) {
    customerNode.textContent = "Complete checkout details before using the pay link.";
    summaryContainer.innerHTML = `<a class="button button-primary" href="checkout.html">Return To Checkout</a>`;
    payButton.disabled = true;
    return;
  }

  customerNode.textContent = `${draft.fullName} | ${draft.phone} | ${draft.deliveryOption} | ${draft.paymentMethod}`;
  summaryContainer.innerHTML = `
    ${totals.items.map((item) => `<div class="summary-line"><span>${item.name} x ${item.quantity}</span><strong>${formatCurrency(item.lineTotal)}</strong></div>`).join("")}
    ${summaryMarkup(totals)}
  `;

  payButton.disabled = false;
}

function persistFallbackOrder(draft, totals) {
  const orderRef = `SNAP-${Date.now().toString().slice(-6)}`;
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  orders.push({
    orderRef,
    customer: draft,
    items: totals.items,
    total: totals.total,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return orderRef;
}

async function submitOrder() {
  const draft = getCheckoutDraft();
  const totals = cartTotals();
  const payButton = document.getElementById("complete-payment");
  const message = document.getElementById("payment-message");
  const customerNode = document.getElementById("payment-customer");
  const summaryContainer = document.getElementById("payment-summary");

  if (!draft || totals.items.length === 0 || !payButton || !message || !customerNode || !summaryContainer) {
    return;
  }

  payButton.disabled = true;
  message.textContent = "Processing payment...";

  try {
    const payload = await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        ...draft,
        items: totals.items.map((item) => ({
          id: item.id,
          quantity: item.quantity
        }))
      })
    });

    clearCart();
    localStorage.removeItem(CHECKOUT_KEY);
    message.textContent = `Payment completed successfully. Order reference: ${payload.orderNumber}.`;
    customerNode.textContent = "Thank you for shopping with SnapShop.";
    summaryContainer.innerHTML = `<p class="info-panel">Your order has been confirmed and saved on the backend.</p>`;
    showToast("Payment successful.");
  } catch (error) {
    const fallbackOrderRef = persistFallbackOrder(draft, totals);
    clearCart();
    localStorage.removeItem(CHECKOUT_KEY);
    message.textContent = `Payment completed in demo mode. Order reference: ${fallbackOrderRef}.`;
    customerNode.textContent = "Thank you for shopping with SnapShop.";
    summaryContainer.innerHTML = `<p class="info-panel">The backend was unavailable, so the order was saved locally for demo purposes.</p>`;
    showToast("Payment saved in demo mode.");
  } finally {
    payButton.disabled = true;
  }
}

function bindGlobalEvents() {
  document.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    if (addButton) {
      addToCart(addButton.dataset.addToCart);
      return;
    }

    const qtyButton = event.target.closest("[data-quantity-change]");
    if (qtyButton) {
      const productId = qtyButton.dataset.quantityChange;
      const delta = Number(qtyButton.dataset.delta);
      const currentItem = getCart().find((item) => item.id === productId);
      if (currentItem) {
        updateCartItem(productId, currentItem.quantity + delta);
      }
      return;
    }

    const removeButton = event.target.closest("[data-remove-item]");
    if (removeButton) {
      updateCartItem(removeButton.dataset.removeItem, 0);
      showToast("Item removed from cart.");
      return;
    }

    const pollButton = event.target.closest("[data-poll-choice]");
    if (pollButton) {
      const choice = pollButton.dataset.pollChoice;
      localStorage.setItem(POLL_KEY, choice);
      const pollStatus = document.getElementById("poll-status");
      if (pollStatus) {
        pollStatus.textContent = `Submitting your vote for ${choice}...`;
      }

      try {
        await apiRequest("/poll-votes", {
          method: "POST",
          body: JSON.stringify({ choice })
        });
        if (pollStatus) {
          pollStatus.textContent = `Thanks for voting for ${choice}. Your vote was saved.`;
        }
      } catch (error) {
        if (pollStatus) {
          pollStatus.textContent = `Thanks for voting for ${choice}. The vote was saved locally for now.`;
        }
      }
      return;
    }

    const paymentButton = event.target.closest("#complete-payment");
    if (paymentButton) {
      await submitOrder();
    }
  });

  const clearCartButton = document.getElementById("clear-cart");
  if (clearCartButton && clearCartButton.dataset.bound !== "true") {
    clearCartButton.addEventListener("click", () => {
      clearCart();
      showToast("Cart emptied.");
    });
    clearCartButton.dataset.bound = "true";
  }

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (navToggle && nav && navToggle.dataset.bound !== "true") {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navToggle.dataset.bound = "true";
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm && contactForm.dataset.bound !== "true") {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const messageNode = document.getElementById("contact-message");
      if (!contactForm.reportValidity()) {
        messageNode.textContent = "Please fill in all contact form fields.";
        return;
      }

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());
      messageNode.textContent = "Sending your message...";

      try {
        await apiRequest("/contact-messages", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        messageNode.textContent = "Thank you. Your message has been received successfully.";
        contactForm.reset();
      } catch (error) {
        messageNode.textContent = "Your message was saved in demo mode because the backend was unavailable.";
        contactForm.reset();
      }
    });
    contactForm.dataset.bound = "true";
  }
}

function restorePollChoice() {
  const pollStatus = document.getElementById("poll-status");
  const choice = localStorage.getItem(POLL_KEY);
  if (pollStatus && choice) {
    pollStatus.textContent = `Your current vote: ${choice}.`;
  }
}

function setCurrentYear() {
  document.querySelectorAll(".current-year").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

async function bootstrap() {
  await loadProducts();
  setCurrentYear();
  updateCartIndicators();
  bindGlobalEvents();
  restorePollChoice();
  renderFeaturedProducts();
  renderCatalog();
  renderCartPage();
  renderCheckoutPage();
  renderPaymentPage();
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch(() => {
    setCurrentYear();
    updateCartIndicators();
    bindGlobalEvents();
    restorePollChoice();
    renderFeaturedProducts();
    renderCatalog();
    renderCartPage();
    renderCheckoutPage();
    renderPaymentPage();
  });
});
