const PRODUCT_IMAGES = {
  "snap-pod-mini-tripod": "assets/products/tripod.svg",
  "lumi-ring-creator-light": "assets/products/ring-light.svg",
  "air-view-webcam-1080p": "assets/products/webcam.svg",
  "vibe-buds-pro": "assets/products/earbuds.svg",
  "pulse-bluetooth-speaker": "assets/products/speaker.svg",
  "charge-core-20000": "assets/products/powerbank.svg",
  "smart-nest-plug": "assets/products/smart-plug.svg",
  "note-flow-tablet-stand": "assets/products/tablet-stand.svg"
};

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
    visualCode: "CG",
    image: "assets/products/tripod.svg"
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
    visualCode: "CG",
    image: "assets/products/ring-light.svg"
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
    visualCode: "CG",
    image: "assets/products/webcam.svg"
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
    visualCode: "AU",
    image: "assets/products/earbuds.svg"
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
    visualCode: "AU",
    image: "assets/products/speaker.svg"
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
    visualCode: "PW",
    image: "assets/products/powerbank.svg"
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
    visualCode: "SH",
    image: "assets/products/smart-plug.svg"
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
    visualCode: "WS",
    image: "assets/products/tablet-stand.svg"
  }
];

const CART_KEY = "snapshopCart";
const CHECKOUT_KEY = "snapshopCheckout";
const ORDERS_KEY = "snapshopOrders";
const POLL_KEY = "snapshopPollChoice";
const AUTH_TOKEN_KEY = "snapshopAuthToken";
const WISHLIST_KEY = "snapshopWishlist";
const API_BASE = "/api";

let productsCache = [...DEFAULT_PRODUCTS];

/* --- Wishlist --- */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
  catch { return []; }
}
function saveWishlist(list) { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); }
function toggleWishlist(productId) {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  if (idx > -1) { list.splice(idx, 1); showToast("Removed from wishlist."); }
  else { list.push(productId); showToast("Added to wishlist!"); }
  saveWishlist(list);
  document.querySelectorAll(`[data-wishlist-toggle="${productId}"]`).forEach(btn => {
    btn.classList.toggle("is-active", list.includes(productId));
    btn.innerHTML = list.includes(productId) ? "&#10084;" : "&#9825;";
  });
}
function isWishlisted(productId) { return getWishlist().includes(productId); }

/* --- Confirm Dialog --- */
function confirmDialog(title, message) {
  return new Promise(resolve => {
    let overlay = document.getElementById("confirm-dialog");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "confirm-dialog";
      overlay.className = "dialog-overlay";
      overlay.innerHTML = `<div class="dialog-box">
        <h3 class="dialog-title"></h3>
        <p class="dialog-message"></p>
        <div class="dialog-actions">
          <button class="button button-secondary dialog-cancel" type="button">Cancel</button>
          <button class="button button-danger dialog-confirm" type="button">Confirm</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector(".dialog-title").textContent = title;
    overlay.querySelector(".dialog-message").textContent = message;
    overlay.classList.add("is-visible");

    function cleanup(result) {
      overlay.classList.remove("is-visible");
      overlay.querySelector(".dialog-cancel").removeEventListener("click", onCancel);
      overlay.querySelector(".dialog-confirm").removeEventListener("click", onConfirm);
      resolve(result);
    }
    function onCancel() { cleanup(false); }
    function onConfirm() { cleanup(true); }

    overlay.querySelector(".dialog-cancel").addEventListener("click", onCancel);
    overlay.querySelector(".dialog-confirm").addEventListener("click", onConfirm);
  });
}

/* --- Product Image Helper --- */
function getProductImage(product) {
  /* Prefer uploaded images array */
  if (product.images && product.images.length) {
    return `<img src="${product.images[0].url}" alt="${product.images[0].alt || product.name}" loading="lazy" data-fallback>`;
  }
  if (product.imageUrl) return `<img src="${product.imageUrl}" alt="${product.name}" loading="lazy" data-fallback>`;
  const img = product.image || PRODUCT_IMAGES[product.id] || PRODUCT_IMAGES[product.slug];
  if (img) return `<img src="${img}" alt="${product.name}" loading="lazy">`;
  const code = product.visualCode || (product.category || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `<div class="product-visual-code">${code}</div>`;
}

function getProductImages(product) {
  if (product.images && product.images.length) return product.images;
  const single = product.imageUrl || product.image || PRODUCT_IMAGES[product.id] || PRODUCT_IMAGES[product.slug];
  if (single) return [{ url: single, alt: product.name }];
  return [];
}

/* --- Loading Skeletons --- */
function showSkeletons(container, count = 4) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count },
    () => `<div class="skeleton skeleton-card"></div>`
  ).join("");
}

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
  syncCartToServer();
}

/* --- Server-side cart sync (for logged-in customers) --- */
function isCustomerToken() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "CUSTOMER";
  } catch { return false; }
}
let _syncTimer = null;
function syncCartToServer() {
  if (!isCustomerToken()) return;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    const cart = getCart();
    if (cart.length === 0) {
      /* Empty cart = clear server cart */
      fetch(`${API_BASE}/customer/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } else {
      fetch(`${API_BASE}/customer/cart/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart })
      }).catch(() => {});
    }
  }, 500);
}

async function loadCartFromServer() {
  if (!isCustomerToken()) return;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  try {
    const res = await fetch(`${API_BASE}/customer/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.items) && data.items.length > 0) {
      const localCart = getCart();
      const merged = new Map();
      /* Server items first */
      data.items.forEach(i => merged.set(i.id, i.quantity));
      /* Local items merge (add quantities for items not on server) */
      localCart.forEach(i => {
        if (merged.has(i.id)) return; /* server wins */
        merged.set(i.id, i.quantity);
      });
      const finalCart = Array.from(merged, ([id, quantity]) => ({ id, quantity }));
      localStorage.setItem(CART_KEY, JSON.stringify(finalCart));
      updateCartIndicators();
    }
  } catch (e) { /* silent */ }
}

async function mergeAndSyncCart() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;
  const localCart = getCart();
  try {
    const res = await fetch(`${API_BASE}/customer/cart/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: localCart })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.items)) {
      localStorage.setItem(CART_KEY, JSON.stringify(data.items.map(i => ({ id: i.id, quantity: i.quantity }))));
      updateCartIndicators();
    }
  } catch (e) { /* silent */ }
}

/* Expose for auth-ui.js to call after login/register */
window.mergeAndSyncCart = mergeAndSyncCart;
window.loadCartFromServer = loadCartFromServer;

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
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const prev = Number(node.textContent) || 0;
    node.textContent = String(totalItems);
    if (totalItems !== prev) {
      node.classList.remove("is-bumped");
      void node.offsetWidth;
      node.classList.add("is-bumped");
    }
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
  confirmDialog("Clear Cart", "Remove all items from your cart?").then(confirmed => {
    if (!confirmed) return;
    saveCart([]);
    localStorage.removeItem(CHECKOUT_KEY);
    /* Also clear server-side cart */
    if (isCustomerToken()) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      fetch(`${API_BASE}/customer/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    renderCartPage();
    renderCheckoutPage();
    renderPaymentPage();
    showToast("Cart emptied.");
  });
}

function createProductCard(product) {
  const wishActive = isWishlisted(product.id);
  return `
    <article class="card product-card">
      <div class="product-visual" aria-hidden="true">${getProductImage(product)}</div>
      <span class="product-tag">${product.category}</span>
      <h3><a href="product.html?id=${product.slug}">${product.name}</a></h3>
      <p>${product.description}</p>
      <div class="product-price">${formatCurrency(product.price)}</div>
      <div class="product-card-actions">
        <button class="button button-primary" type="button" data-add-to-cart="${product.id}">Add To Cart</button>
        <button class="wishlist-btn${wishActive ? " is-active" : ""}" type="button" data-wishlist-toggle="${product.id}" aria-label="Toggle wishlist">${wishActive ? "&#10084;" : "&#9825;"}</button>
      </div>
    </article>
  `;
}

function renderFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) {
    return;
  }

  const featured = getProducts().filter((product) => product.featured);
  if (featured.length === 0) {
    showSkeletons(container, 4);
    return;
  }

  container.innerHTML = featured.map(createProductCard).join("");
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
  let currentSort = "default";

  /* Build sort control if not present */
  let sortSelect = document.getElementById("product-sort");
  if (!sortSelect) {
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "catalog-controls";
    controlsDiv.innerHTML = `
      <span class="product-count" id="product-count"></span>
      <div class="sort-control">
        <label for="product-sort">Sort by:</label>
        <select id="product-sort">
          <option value="default">Default</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name-az">Name: A-Z</option>
          <option value="name-za">Name: Z-A</option>
        </select>
      </div>
    `;
    results.parentNode.insertBefore(controlsDiv, results);
    sortSelect = document.getElementById("product-sort");
  }

  filterContainer.innerHTML = categories.map((category) => `
    <button class="chip ${category.slug === "all" ? "is-active" : ""}" type="button" data-category-filter="${category.slug}">${category.name}</button>
  `).join("");

  function sortProducts(products) {
    const sorted = [...products];
    switch (currentSort) {
      case "price-low": return sorted.sort((a, b) => a.price - b.price);
      case "price-high": return sorted.sort((a, b) => b.price - a.price);
      case "name-az": return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-za": return sorted.sort((a, b) => b.name.localeCompare(a.name));
      default: return sorted;
    }
  }

  function paintProducts() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const filteredProducts = getProducts().filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categorySlug === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchValue) ||
                            product.description.toLowerCase().includes(searchValue);
      return product.active && matchesCategory && matchesSearch;
    });

    const sorted = sortProducts(filteredProducts);
    const countEl = document.getElementById("product-count");
    if (countEl) countEl.textContent = `${sorted.length} product${sorted.length !== 1 ? "s" : ""}`;

    results.innerHTML = sorted.length > 0
      ? sorted.map(createProductCard).join("")
      : `<article class="card empty-state"><span class="empty-state-icon">🔍</span><h2>No products found</h2><p>Try a different search term or category.</p></article>`;
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
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => { currentSort = e.target.value; paintProducts(); });
  }
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
        <span class="empty-state-icon">🛒</span>
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
      <div class="cart-item-image">${getProductImage(item)}</div>
      <div>
        <h3>${item.name}</h3>
        <div class="cart-item-actions">
          <span class="product-tag">${item.category}</span>
          <span>${formatCurrency(item.price)} each</span>
        </div>
      </div>
      <div class="quantity-control">
        <button class="quantity-button" type="button" data-quantity-change="${item.id}" data-delta="-1" aria-label="Reduce quantity for ${item.name}">−</button>
        <strong>${item.quantity}</strong>
        <button class="quantity-button" type="button" data-quantity-change="${item.id}" data-delta="1" aria-label="Increase quantity for ${item.name}">+</button>
        <strong>${formatCurrency(item.lineTotal)}</strong>
        <button class="button button-secondary button-small" type="button" data-remove-item="${item.id}">Remove</button>
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

  /* ── Require login to checkout ── */
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    summaryContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🔒</span>
        <h2>Login Required</h2>
        <p>You must be logged in to checkout. Your cart will be saved.</p>
        <a class="button button-primary" href="login.html?returnUrl=checkout.html">Login</a>
        <a class="button button-secondary" href="register.html?returnUrl=checkout.html">Register</a>
      </div>
    `;
    form.style.display = "none";
    return;
  }
  form.style.display = "";

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

  /* Load saved addresses for logged-in customers */
  if (token) {
    apiRequest("/auth/me").then((data) => {
      const addresses = data.user?.customerProfile?.addresses || [];
      const section = document.getElementById("saved-addresses-section");
      const select = document.getElementById("saved-address-select");
      if (addresses.length && section && select) {
        addresses.forEach((a) => {
          const opt = document.createElement("option");
          opt.value = JSON.stringify(a);
          opt.textContent = `${a.label} — ${a.addressLine}, ${a.city}${a.isDefault ? " (Default)" : ""}`;
          select.appendChild(opt);
        });
        section.style.display = "";
        select.addEventListener("change", () => {
          if (!select.value) return;
          try {
            const addr = JSON.parse(select.value);
            if (form.elements.fullName && !form.elements.fullName.value) form.elements.fullName.value = data.user.name || "";
            if (form.elements.email && !form.elements.email.value) form.elements.email.value = data.user.email || "";
            if (form.elements.phone) form.elements.phone.value = data.user.customerProfile?.phone || "";
            if (form.elements.city) form.elements.city.value = addr.city;
            if (form.elements.address) form.elements.address.value = addr.addressLine;
          } catch {}
        });

        /* Auto-select default address */
        const defaultAddr = addresses.find((a) => a.isDefault);
        if (defaultAddr && !existingDraft) {
          select.value = JSON.stringify(defaultAddr);
          select.dispatchEvent(new Event("change"));
        }
      }
    }).catch(() => {});
  }
}

function renderPaymentPage() {
  const customerNode = document.getElementById("payment-customer");
  const summaryContainer = document.getElementById("payment-summary");
  const payButton = document.getElementById("complete-payment");
  const pesapalContainer = document.getElementById("pesapal-container");

  if (!customerNode || !summaryContainer || !payButton) {
    return;
  }

  /* Handle Pesapal callback params */
  const params = new URLSearchParams(window.location.search);
  const trackingId = params.get("OrderTrackingId");
  const merchantRef = params.get("OrderMerchantReference");
  const errorParam = params.get("error");
  const statusParam = params.get("status");

  if (trackingId && merchantRef) {
    /* Pesapal redirected back — check status then redirect to success */
    customerNode.textContent = "Verifying your payment with Pesapal...";
    payButton.style.display = "none";
    if (pesapalContainer) pesapalContainer.style.display = "none";

    apiRequest(`/pesapal/status/${encodeURIComponent(trackingId)}`)
      .then(status => {
        if (status.statusCode === 1) {
          /* Payment success */
          saveCart([]);
          localStorage.removeItem(CHECKOUT_KEY);
          window.location.href = `success.html?ref=${encodeURIComponent(merchantRef)}&tracking=${encodeURIComponent(trackingId)}`;
        } else {
          customerNode.textContent = "";
          const message = document.getElementById("payment-message");
          if (message) message.textContent = `Payment ${status.statusDescription || "not completed"}. You may try again.`;
          payButton.style.display = "";
          payButton.textContent = "Retry Payment";
        }
      })
      .catch(() => {
        /* Fallback: still redirect to success since Pesapal did callback */
        saveCart([]);
        localStorage.removeItem(CHECKOUT_KEY);
        window.location.href = `success.html?ref=${encodeURIComponent(merchantRef)}&tracking=${encodeURIComponent(trackingId)}`;
      });
    return;
  }

  if (errorParam || statusParam) {
    const message = document.getElementById("payment-message");
    if (message) message.textContent = `Payment ${statusParam || "issue"}: ${errorParam || "Please try again."}`;
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
  const pesapalContainer = document.getElementById("pesapal-container");
  const pesapalIframe = document.getElementById("pesapal-iframe");

  if (!draft || totals.items.length === 0 || !payButton || !message) {
    return;
  }

  payButton.disabled = true;
  message.textContent = "Connecting to Pesapal...";

  try {
    /* Try Pesapal payment flow */
    const payload = await apiRequest("/pesapal/initiate", {
      method: "POST",
      body: JSON.stringify({
        ...draft,
        items: totals.items.map((item) => ({
          id: item.id,
          quantity: item.quantity
        }))
      })
    });

    if (payload.redirectUrl) {
      message.textContent = "Loading secure payment form...";

      /* Show Pesapal inside iframe for seamless experience */
      if (pesapalContainer && pesapalIframe) {
        pesapalIframe.src = payload.redirectUrl;
        pesapalContainer.style.display = "block";
        payButton.style.display = "none";
        message.textContent = "Complete your payment in the form below. You will be redirected automatically.";

        const refNode = document.getElementById("payment-ref");
        if (refNode) refNode.textContent = `Order: ${payload.orderNumber}`;
      } else {
        /* Fallback: redirect to Pesapal payment page */
        window.location.href = payload.redirectUrl;
      }
    } else {
      throw new Error("No payment URL received.");
    }
  } catch (error) {
    /* Fallback: use the original order-only flow */
    message.textContent = "Pesapal unavailable. Processing order directly...";

    try {
      const fallbackPayload = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          items: totals.items.map((item) => ({
            id: item.id,
            quantity: item.quantity
          }))
        })
      });

      const orderRef = fallbackPayload.orderNumber;
      saveCart([]);
      localStorage.removeItem(CHECKOUT_KEY);
      window.location.href = `success.html?ref=${encodeURIComponent(orderRef)}`;
    } catch (fallbackError) {
      const fallbackOrderRef = persistFallbackOrder(draft, totals);
      saveCart([]);
      localStorage.removeItem(CHECKOUT_KEY);
      window.location.href = `success.html?ref=${encodeURIComponent(fallbackOrderRef)}&demo=1`;
    }
  }
}

function bindGlobalEvents() {
  document.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    if (addButton) {
      addToCart(addButton.dataset.addToCart);
      return;
    }

    const wishButton = event.target.closest("[data-wishlist-toggle]");
    if (wishButton) {
      toggleWishlist(wishButton.dataset.wishlistToggle);
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

    /* Product detail: image thumbnail switching */
    const thumbBtn = event.target.closest("[data-thumb-url]");
    if (thumbBtn) {
      const mainImg = document.getElementById("detail-main-img");
      if (mainImg) {
        mainImg.src = thumbBtn.dataset.thumbUrl;
        mainImg.alt = thumbBtn.dataset.thumbAlt || "";
      }
      document.querySelectorAll(".detail-thumb").forEach(t => t.classList.remove("is-active"));
      thumbBtn.classList.add("is-active");
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
    clearCartButton.addEventListener("click", () => clearCart());
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

  /* Back to top */
  const btt = document.getElementById("back-to-top");
  if (btt) {
    window.addEventListener("scroll", () => {
      btt.classList.toggle("is-visible", window.scrollY > 400);
    }, { passive: true });
    btt.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* Newsletter form */
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm && newsletterForm.dataset.bound !== "true") {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Thank you for subscribing!");
      newsletterForm.reset();
    });
    newsletterForm.dataset.bound = "true";
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

/* --- Product Detail Page --- */
function renderProductDetail() {
  const container = document.getElementById("product-detail");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const product = findProduct(productId);

  if (!product) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🔍</span><h2>Product not found</h2><p>The product you're looking for doesn't exist.</p><a class="button button-primary" href="shop.html">Back to Shop</a></div>`;
    return;
  }

  const wishActive = isWishlisted(product.id);
  const related = getProducts().filter(p => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 3);
  const allImages = getProductImages(product);
  const mainImage = allImages.length ? `<img src="${allImages[0].url}" alt="${allImages[0].alt || product.name}" id="detail-main-img" loading="lazy" data-fallback>` : getProductImage(product);

  container.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-image-wrapper">
        <div class="product-detail-image">${mainImage}</div>
        ${allImages.length > 1 ? `
          <div class="product-detail-thumbnails">
            ${allImages.map((img, i) => `
              <button class="detail-thumb${i === 0 ? " is-active" : ""}" type="button" data-thumb-url="${img.url}" data-thumb-alt="${img.alt || product.name}">
                <img src="${img.url}" alt="${img.alt || product.name}" loading="lazy" data-fallback>
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="product-detail-info">
        <nav class="breadcrumb"><a href="index.html">Home</a> <span>/</span> <a href="shop.html">Shop</a> <span>/</span> <span aria-current="page">${product.name}</span></nav>
        <h1>${product.name}</h1>
        <div class="product-detail-meta">
          <span class="product-tag">${product.category}</span>
          <span class="stock-badge ${product.stockQuantity > 0 ? "in-stock" : "out-of-stock"}">${product.stockQuantity > 0 ? `In Stock (${product.stockQuantity})` : "Out of Stock"}</span>
        </div>
        <div class="product-detail-price">${formatCurrency(product.price)}</div>
        <p>${product.description}</p>
        <ul class="product-features">
          <li>Free delivery above UGX 200,000</li>
          <li>30-day return policy</li>
          <li>Genuine product guarantee</li>
          <li>Kampala same-day delivery</li>
        </ul>
        <div class="product-detail-actions">
          <button class="button button-primary" type="button" data-add-to-cart="${product.id}">Add To Cart</button>
          <button class="wishlist-btn${wishActive ? " is-active" : ""}" type="button" data-wishlist-toggle="${product.id}" aria-label="Toggle wishlist">${wishActive ? "&#10084;" : "&#9825;"}</button>
        </div>
      </div>
    </div>
    ${related.length > 0 ? `
      <section class="section" style="margin-top:2rem;">
        <div class="section-heading"><p class="eyebrow">You might also like</p><h2>Related Products</h2></div>
        <div class="product-grid">${related.map(createProductCard).join("")}</div>
      </section>
    ` : ""}
  `;

  document.title = `${product.name} — SnapShop`;
}

/* --- Success Page --- */
function renderSuccessPage() {
  const container = document.getElementById("success-content");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || "N/A";
  const isDemo = params.get("demo") === "1";
  const trackingId = params.get("tracking") || "";

  /* Show initial confirmation immediately */
  container.innerHTML = `
    <div class="success-container">
      <div class="success-icon">&#10003;</div>
      <h1 style="font-family:Georgia,serif;margin:0 0 0.5rem;">Order Confirmed!</h1>
      <p style="color:var(--muted);margin:0 0 1.5rem;">Thank you for shopping with SnapShop. Your order has been placed successfully.</p>
      <div class="success-details" id="success-details">
        <div class="summary-line"><span>Order Reference</span><strong>${ref}</strong></div>
        ${trackingId ? `<div class="summary-line"><span>Pesapal Tracking</span><strong>${trackingId.slice(0,8)}...</strong></div>` : ""}
        <div class="summary-line"><span>Status</span><strong>${isDemo ? "Demo Order" : "Confirmed"}</strong></div>
        <div class="summary-line"><span>Payment</span><strong>${trackingId ? "Paid via Pesapal" : isDemo ? "Pending" : "Received"}</strong></div>
        <div class="summary-line"><span>Date</span><strong>${new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
      </div>
      ${isDemo ? '<p style="color:var(--muted);font-size:0.9rem;">This order was saved locally because the backend was unavailable.</p>' : ""}
      <div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
        <a class="button button-primary" href="shop.html">Continue Shopping</a>
        <a class="button button-secondary" href="dashboard.html">View Dashboard</a>
      </div>
    </div>
  `;

  /* Fetch full order details from API for richer display */
  if (ref && ref !== "N/A" && !isDemo) {
    apiRequest(`/orders/${encodeURIComponent(ref)}`)
      .then((data) => {
        const order = data.order;
        if (!order) return;
        const details = document.getElementById("success-details");
        if (!details) return;
        details.innerHTML = `
          <div class="summary-line"><span>Order Reference</span><strong>${order.orderNumber}</strong></div>
          ${trackingId ? `<div class="summary-line"><span>Pesapal Tracking</span><strong>${trackingId.slice(0,8)}...</strong></div>` : ""}
          <div class="summary-line"><span>Status</span><strong>${order.status}</strong></div>
          <div class="summary-line"><span>Payment Method</span><strong>${order.paymentMethod || "Pesapal"}</strong></div>
          <div class="summary-line"><span>Customer</span><strong>${order.customerName}</strong></div>
          <div class="summary-line"><span>Delivery</span><strong>${order.deliveryOption} — ${order.city}</strong></div>
          ${(order.items || []).map((item) => `<div class="summary-line"><span>${item.productName} x ${item.quantity}</span><strong>UGX ${Number(item.lineTotal).toLocaleString()}</strong></div>`).join("")}
          <div class="summary-line"><span>Service Fee</span><strong>UGX ${Number(order.serviceFee).toLocaleString()}</strong></div>
          <div class="summary-line" style="font-size:1.1rem;"><span><strong>Total</strong></span><strong>UGX ${Number(order.total).toLocaleString()}</strong></div>
          <div class="summary-line"><span>Date</span><strong>${new Date(order.createdAt).toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
        `;
      })
      .catch(() => {});
  }
}

async function bootstrap() {
  await loadProducts();
  setCurrentYear();

  /* Global fallback for broken product images */
  document.addEventListener("error", function(e) {
    if (e.target.tagName === "IMG" && e.target.hasAttribute("data-fallback")) {
      e.target.removeAttribute("data-fallback");
      e.target.src = "assets/products/placeholder.svg";
    }
  }, true);
  /* Load server cart if logged in */
  await loadCartFromServer();
  updateCartIndicators();
  bindGlobalEvents();
  restorePollChoice();
  renderFeaturedProducts();
  renderCatalog();
  renderCartPage();
  renderCheckoutPage();
  renderPaymentPage();
  renderProductDetail();
  renderSuccessPage();
}

document.addEventListener("DOMContentLoaded", () => {
  /* Scroll-reveal observer */
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  }

  /* Remove page loading bar after animation */
  const loadBar = document.querySelector(".page-loading-bar");
  if (loadBar) setTimeout(() => loadBar.remove(), 900);

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
    renderProductDetail();
    renderSuccessPage();
  });
});
