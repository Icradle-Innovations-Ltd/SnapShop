(function () {
  const TOKEN_KEY = "snapshopAuthToken";
  const API_ROOT = "/api";
  const state = {
    token: localStorage.getItem(TOKEN_KEY) || "",
    user: null
  };

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function safe(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function roleLabel(role) {
    return String(role || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getToken() {
    return state.token || "";
  }

  function setSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearSession() {
    state.token = "";
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    };

    if (getToken() && !headers.Authorization) {
      headers.Authorization = `Bearer ${getToken()}`;
    }

    const response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "Request failed.");
    }
    return payload;
  }

  async function refreshUser() {
    if (!getToken()) {
      state.user = null;
      return null;
    }

    try {
      const payload = await request("/auth/me");
      state.user = payload.user;
      return state.user;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function renderNav() {
    document.querySelectorAll(".site-nav").forEach((nav) => {
      const old = nav.querySelector(".nav-auth");
      if (old) {
        old.remove();
      }

      const wrap = document.createElement("div");
      wrap.className = "nav-auth";

      if (state.user) {
        wrap.innerHTML = `
          <span class="nav-auth-name">${safe(state.user.name.split(" ")[0])}</span>
          <a class="button button-secondary" href="dashboard.html">Dashboard</a>
          <button class="button button-primary" type="button" id="auth-ui-logout">Logout</button>
        `;
      } else {
        wrap.innerHTML = `
          <a class="button button-secondary" href="login.html">Login</a>
          <a class="button button-primary" href="register.html">Register</a>
        `;
      }

      nav.appendChild(wrap);
    });
  }

  async function handleLogin() {
    const form = document.getElementById("login-form");
    const message = document.getElementById("login-message");
    if (!form || form.dataset.bound === "true") {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) {
        message.textContent = "Please complete the login form.";
        return;
      }

      message.textContent = "Signing you in...";
      try {
        const payload = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
        });
        setSession(payload.token, payload.user);
        renderNav();
        message.textContent = "Login successful. Redirecting...";
        window.location.href = "dashboard.html";
      } catch (error) {
        message.textContent = error.message;
      }
    });

    document.querySelectorAll(".demo-login").forEach((button) => {
      button.addEventListener("click", () => {
        form.elements.email.value = button.dataset.email || "";
        form.elements.password.value = button.dataset.password || "";
      });
    });

    form.dataset.bound = "true";
  }

  async function handleRegister() {
    const form = document.getElementById("register-form");
    const message = document.getElementById("register-message");
    const roleField = document.getElementById("register-role");
    const businessField = document.getElementById("business-name-field");
    if (!form || form.dataset.bound === "true") {
      return;
    }

    function syncRole() {
      const isVendor = roleField.value === "VENDOR";
      businessField.classList.toggle("is-hidden", !isVendor);
      businessField.querySelector("input").required = isVendor;
    }

    syncRole();
    roleField.addEventListener("change", syncRole);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) {
        message.textContent = "Please complete the registration form.";
        return;
      }

      message.textContent = "Creating account...";
      try {
        const payload = await request("/auth/register", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
        });
        setSession(payload.token, payload.user);
        renderNav();
        window.location.href = "dashboard.html";
      } catch (error) {
        message.textContent = error.message;
      }
    });

    form.dataset.bound = "true";
  }

  function metric(label, value) {
    return `<div class="metric-card"><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`;
  }

  async function renderVendorView(user) {
    const products = user.vendorProfile?.store
      ? await request("/vendor/products").then((data) => data.products).catch(() => [])
      : [];

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">Vendor Workspace</p>
        <div class="metric-strip">
          ${metric("Approval", roleLabel(user.vendorProfile?.status || "PENDING"))}
          ${metric("Store", user.vendorProfile?.store ? "Ready" : "Not Created")}
          ${metric("Listings", String(products.length))}
        </div>
      </section>
      <section class="dashboard-two-column">
        <article class="card dashboard-section">
          <h2>Store Setup</h2>
          ${user.vendorProfile?.store
            ? `
              <div class="dashboard-item">
                <h3>${safe(user.vendorProfile.store.name)}</h3>
                <p>${safe(user.vendorProfile.store.description)}</p>
                <p class="dashboard-meta">Slug: ${safe(user.vendorProfile.store.slug)} | Status: ${safe(user.vendorProfile.store.status)}</p>
              </div>
            `
            : user.vendorProfile?.status !== "APPROVED"
              ? `<p class="dashboard-empty">Your vendor account is waiting for admin approval.</p>`
              : `
                <form id="store-form" class="dashboard-stack">
                  <label><span>Store name</span><input name="name" type="text" required></label>
                  <label><span>Store description</span><textarea name="description" rows="4" required></textarea></label>
                  <button class="button button-primary" type="submit">Create Store</button>
                  <p id="store-message" class="form-message" aria-live="polite"></p>
                </form>
              `}
        </article>
        <article class="card dashboard-section">
          <h2>Create Product Listing</h2>
          ${user.vendorProfile?.store
            ? `
              <form id="vendor-product-form" class="dashboard-stack">
                <label><span>Product name</span><input name="name" type="text" required></label>
                <label>
                  <span>Category</span>
                  <select name="categorySlug">
                    <option value="creator-gear">Creator Gear</option>
                    <option value="audio">Audio</option>
                    <option value="power">Power</option>
                    <option value="workspace">Workspace</option>
                    <option value="smart-home">Smart Home</option>
                  </select>
                </label>
                <label><span>SKU</span><input name="sku" type="text" required></label>
                <label><span>Description</span><textarea name="description" rows="4" required></textarea></label>
                <label><span>Price</span><input name="price" type="number" min="1" required></label>
                <label><span>Stock quantity</span><input name="stockQuantity" type="number" min="0" required></label>
                <label>
                  <span>Status</span>
                  <select name="status">
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </label>
                <button class="button button-primary" type="submit">Save Product</button>
                <p id="vendor-product-message" class="form-message" aria-live="polite"></p>
              </form>
            `
            : `<p class="dashboard-empty">Create and activate your store to start listing products.</p>`}
        </article>
      </section>
      <section class="card dashboard-section">
        <h2>Your Product Listings</h2>
        <div class="dashboard-list">
          ${products.length
            ? products.map((product) => `
              <article class="dashboard-item">
                <h3>${safe(product.name)}</h3>
                <p>${safe(product.description)}</p>
                <p class="dashboard-meta">${safe(product.sku)} | ${formatMoney(product.price)} | Stock ${safe(product.stockQuantity)}</p>
                <div class="auth-inline">
                  <span class="status-pill">${safe(roleLabel(product.status))}</span>
                  <button class="button button-secondary" type="button" data-quick-status="${safe(product.id)}" data-next-status="${product.status === "ACTIVE" ? "DRAFT" : "ACTIVE"}">
                    Mark ${product.status === "ACTIVE" ? "Draft" : "Active"}
                  </button>
                </div>
              </article>
            `).join("")
            : `<p class="dashboard-empty">No vendor products yet.</p>`}
        </div>
      </section>
    `;
  }

  async function renderCustomerView(user) {
    const orders = await request("/customer/orders").then((data) => data.orders).catch(() => []);
    const addresses = user.customerProfile?.addresses || [];

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">Customer Workspace</p>
        <div class="metric-strip">
          ${metric("Orders", String(orders.length))}
          ${metric("Saved Addresses", String(addresses.length))}
          ${metric("Status", "Active")}
        </div>
      </section>
      <section class="dashboard-two-column">
        <article class="card dashboard-section">
          <h2>Saved Addresses</h2>
          <form id="address-form" class="dashboard-stack">
            <label><span>Label</span><input name="label" type="text" required></label>
            <label><span>City</span><input name="city" type="text" required></label>
            <label><span>Address line</span><textarea name="addressLine" rows="4" required></textarea></label>
            <label>
              <span>Set as default</span>
              <select name="isDefault">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <button class="button button-primary" type="submit">Save Address</button>
            <p id="address-message" class="form-message" aria-live="polite"></p>
          </form>
          <div class="dashboard-list">
            ${addresses.length
              ? addresses.map((address) => `
                <div class="dashboard-item">
                  <h3>${safe(address.label)}</h3>
                  <p>${safe(address.addressLine)}</p>
                  <p class="dashboard-meta">${safe(address.city)}${address.isDefault ? " | Default" : ""}</p>
                </div>
              `).join("")
              : `<p class="dashboard-empty">No saved addresses yet.</p>`}
          </div>
        </article>
        <article class="card dashboard-section">
          <h2>Order History</h2>
          <div class="dashboard-list">
            ${orders.length
              ? orders.map((order) => `
                <article class="dashboard-item">
                  <h3>${safe(order.orderNumber)}</h3>
                  <p class="dashboard-meta">${formatMoney(order.total)} | ${safe(order.deliveryOption)}</p>
                  <div class="status-pill">${safe(roleLabel(order.status))}</div>
                  <div class="dashboard-stack">
                    ${(order.statusHistory || []).map((entry) => `<span class="dashboard-meta">${safe(roleLabel(entry.status))}${entry.note ? ` - ${safe(entry.note)}` : ""}</span>`).join("")}
                  </div>
                </article>
              `).join("")
              : `<p class="dashboard-empty">No customer orders yet.</p>`}
          </div>
        </article>
      </section>
    `;
  }

  async function renderAdminView() {
    const vendors = await request("/admin/vendors/pending").then((data) => data.vendors).catch(() => []);

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">Admin Workspace</p>
        <div class="metric-strip">
          ${metric("Pending Vendors", String(vendors.length))}
          ${metric("Role", "Admin")}
        </div>
      </section>
      <section class="card dashboard-section">
        <h2>Pending Vendor Approvals</h2>
        <div class="dashboard-list">
          ${vendors.length
            ? vendors.map((vendor) => `
              <article class="dashboard-item">
                <h3>${safe(vendor.businessName)}</h3>
                <p class="dashboard-meta">${safe(vendor.user?.name || "")} | ${safe(vendor.user?.email || "")}</p>
                <p class="dashboard-meta">${safe(vendor.phone || "No phone provided")}</p>
                <button class="button button-primary" type="button" data-approve-vendor="${safe(vendor.id)}">Approve Vendor</button>
              </article>
            `).join("")
            : `<p class="dashboard-empty">No pending vendor approvals right now.</p>`}
        </div>
      </section>
    `;
  }

  async function renderDashboard() {
    if (document.body.dataset.page !== "dashboard") {
      return;
    }

    if (!state.user) {
      window.location.href = "login.html";
      return;
    }

    const title = document.getElementById("dashboard-title");
    const subtitle = document.getElementById("dashboard-subtitle");
    const summary = document.getElementById("dashboard-summary");
    const actions = document.getElementById("dashboard-actions");
    const content = document.getElementById("dashboard-content");
    if (!title || !subtitle || !summary || !actions || !content) {
      return;
    }

    title.textContent = `${state.user.name}, welcome back.`;
    subtitle.textContent = `You are signed in as ${roleLabel(state.user.role)}.`;
    summary.innerHTML = `
      <div class="status-pill">${safe(roleLabel(state.user.role))}</div>
      <div class="dashboard-item">
        <h3>${safe(state.user.name)}</h3>
        <p class="dashboard-meta">${safe(state.user.email)}</p>
      </div>
    `;
    actions.innerHTML = `
      <a class="button button-primary" href="shop.html">Browse Marketplace</a>
      <a class="button button-secondary" href="contact.html">Need Support?</a>
    `;

    if (state.user.role === "VENDOR") {
      content.innerHTML = await renderVendorView(state.user);
    } else if (state.user.role === "CUSTOMER") {
      content.innerHTML = await renderCustomerView(state.user);
    } else if (state.user.role === "ADMIN") {
      content.innerHTML = await renderAdminView();
    } else {
      content.innerHTML = `<section class="card dashboard-section"><p class="dashboard-empty">This role does not have a dedicated dashboard yet.</p></section>`;
    }

    bindDashboardForms();
  }

  function bindDashboardForms() {
    const storeForm = document.getElementById("store-form");
    if (storeForm && storeForm.dataset.bound !== "true") {
      storeForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("store-message");
        if (!storeForm.reportValidity()) {
          message.textContent = "Please complete the store form.";
          return;
        }
        try {
          await request("/vendor/store", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(new FormData(storeForm).entries()))
          });
          await refreshUser();
          renderNav();
          toast("Store created.");
          await renderDashboard();
        } catch (error) {
          message.textContent = error.message;
        }
      });
      storeForm.dataset.bound = "true";
    }

    const productForm = document.getElementById("vendor-product-form");
    if (productForm && productForm.dataset.bound !== "true") {
      productForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("vendor-product-message");
        if (!productForm.reportValidity()) {
          message.textContent = "Please complete the product form.";
          return;
        }

        const payload = Object.fromEntries(new FormData(productForm).entries());
        payload.price = Number(payload.price);
        payload.stockQuantity = Number(payload.stockQuantity);

        try {
          await request("/vendor/products", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          productForm.reset();
          toast("Product created.");
          await renderDashboard();
        } catch (error) {
          message.textContent = error.message;
        }
      });
      productForm.dataset.bound = "true";
    }

    const addressForm = document.getElementById("address-form");
    if (addressForm && addressForm.dataset.bound !== "true") {
      addressForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("address-message");
        if (!addressForm.reportValidity()) {
          message.textContent = "Please complete the address form.";
          return;
        }

        const payload = Object.fromEntries(new FormData(addressForm).entries());
        payload.isDefault = payload.isDefault === "true";

        try {
          await request("/customer/addresses", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          await refreshUser();
          renderNav();
          toast("Address saved.");
          await renderDashboard();
        } catch (error) {
          message.textContent = error.message;
        }
      });
      addressForm.dataset.bound = "true";
    }
  }

  function bindGlobalClicks() {
    document.addEventListener("click", async (event) => {
      const logout = event.target.closest("#auth-ui-logout");
      if (logout) {
        clearSession();
        renderNav();
        toast("You have been logged out.");
        window.location.href = "login.html";
        return;
      }

      const approve = event.target.closest("[data-approve-vendor]");
      if (approve) {
        try {
          await request(`/admin/vendors/${approve.dataset.approveVendor}/approve`, { method: "PATCH" });
          toast("Vendor approved.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      const quickStatus = event.target.closest("[data-quick-status]");
      if (quickStatus) {
        try {
          await request(`/vendor/products/${quickStatus.dataset.quickStatus}`, {
            method: "PATCH",
            body: JSON.stringify({ status: quickStatus.dataset.nextStatus })
          });
          toast("Product status updated.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
      }
    });
  }

  async function init() {
    await refreshUser();
    renderNav();

    if (document.body.dataset.page === "login" && state.user) {
      window.location.href = "dashboard.html";
      return;
    }

    if (document.body.dataset.page === "register" && state.user) {
      window.location.href = "dashboard.html";
      return;
    }

    await handleLogin();
    await handleRegister();
    bindGlobalClicks();
    await renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => console.error(error));
  });
})();
