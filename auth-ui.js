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

  function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" });
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

    // Forgot password
    const forgotLink = document.getElementById("forgot-password-link");
    if (forgotLink) {
      forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        const email = form.elements.email.value.trim();
        if (!email) {
          message.textContent = "Enter your email above, then click 'Forgot your password?'";
          return;
        }
        message.textContent = "A password-reset link has been sent to " + email + ". Please check your inbox.";
      });
    }
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

  function metric(label, value, icon) {
    return `<div class="metric-card"><span>${icon ? icon + " " : ""}${safe(label)}</span><strong>${safe(value)}</strong></div>`;
  }

  function dashTabs(tabs, activeTab) {
    return `<nav class="dash-tabs" role="tablist">${tabs.map((t) =>
      `<button class="dash-tab${t.key === activeTab ? " is-active" : ""}" role="tab" data-tab="${safe(t.key)}" aria-selected="${t.key === activeTab}">${safe(t.label)}</button>`
    ).join("")}</nav>`;
  }

  function statusSelect(currentStatus, id, statuses) {
    return `<select class="dash-status-select" data-order-status="${safe(id)}">${statuses.map((s) =>
      `<option value="${s}"${s === currentStatus ? " selected" : ""}>${roleLabel(s)}</option>`
    ).join("")}</select>`;
  }

  /* ─── ADMIN DASHBOARD ─── */
  async function renderAdminView() {
    let allOrders = [];
    let allUsers = [];
    let allVendors = [];
    let allProducts = [];
    let allMessages = [];
    let allCategories = [];
    try { allOrders = (await request("/admin/orders")).orders || []; } catch {}
    try { allUsers = (await request("/admin/users")).users || []; } catch {}
    try { allVendors = (await request("/admin/vendors")).vendors || []; } catch {}
    try { allProducts = (await request("/admin/products")).products || []; } catch {}
    try { allMessages = (await request("/admin/contact-messages")).messages || []; } catch {}
    try { allCategories = (await request("/admin/categories")).categories || []; } catch {}

    const pendingVendors = allVendors.filter((v) => v.status === "PENDING");
    const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
    const activeUsers = allUsers.filter((u) => u.isActive !== false);
    const recentOrders = allOrders.slice(0, 10);

    const activeTab = state.dashTab || "overview";

    const orderStatuses = ["PENDING", "PAID", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

    const tabs = [
      { key: "overview", label: "Overview" },
      { key: "users", label: "Users" },
      { key: "vendors", label: "Vendors" },
      { key: "orders", label: "Orders" },
      { key: "products", label: "Products" },
      { key: "categories", label: "Categories" },
      { key: "stores", label: "Stores" },
      { key: "messages", label: "Messages" }
    ];

    let tabContent = "";

    if (activeTab === "overview") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Platform Analytics</h2>
          <div class="metric-strip">
            ${metric("Total Users", String(allUsers.length), "👥")}
            ${metric("Active Users", String(activeUsers.length), "✅")}
            ${metric("Total Orders", String(allOrders.length), "📦")}
            ${metric("Revenue", formatMoney(totalRevenue), "💰")}
            ${metric("Total Vendors", String(allVendors.length), "🏪")}
            ${metric("Pending Approvals", String(pendingVendors.length), "⏳")}
          </div>
        </section>
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Recent Orders</h2>
            <div class="dashboard-list">
              ${recentOrders.length ? recentOrders.map((order) => `
                <article class="dashboard-item">
                  <div class="dash-item-header">
                    <h3>${safe(order.orderNumber)}</h3>
                    <span class="status-pill status-${(order.status || "").toLowerCase()}">${safe(roleLabel(order.status))}</span>
                  </div>
                  <p class="dashboard-meta">${formatMoney(order.total)} &middot; ${safe(order.customer?.name || order.customerName || "Guest")}</p>
                  <p class="dashboard-meta">${formatDate(order.createdAt)}</p>
                </article>
              `).join("") : `<p class="dashboard-empty">No orders yet.</p>`}
            </div>
          </article>
          <article class="card dashboard-section">
            <h2>Pending Vendor Approvals</h2>
            <div class="dashboard-list">
              ${pendingVendors.length ? pendingVendors.map((v) => `
                <article class="dashboard-item">
                  <h3>${safe(v.businessName)}</h3>
                  <p class="dashboard-meta">${safe(v.user?.name || "")} &middot; ${safe(v.user?.email || "")}</p>
                  <div class="dash-item-actions">
                    <button class="button button-primary button-sm" data-approve-vendor="${safe(v.id)}">Approve</button>
                    <button class="button button-danger button-sm" data-reject-vendor="${safe(v.id)}">Reject</button>
                  </div>
                </article>
              `).join("") : `<p class="dashboard-empty">No pending vendor approvals.</p>`}
            </div>
          </article>
        </section>`;
    } else if (activeTab === "users") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>User Management</h2>
          <p class="dashboard-meta">${allUsers.length} registered user${allUsers.length !== 1 ? "s" : ""}</p>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${allUsers.map((u) => `
                  <tr>
                    <td data-label="Name">${safe(u.name)}</td>
                    <td data-label="Email">${safe(u.email)}</td>
                    <td data-label="Role"><span class="status-pill">${safe(roleLabel(u.role))}</span></td>
                    <td data-label="Status"><span class="status-pill ${u.isActive !== false ? "status-active" : "status-inactive"}">${u.isActive !== false ? "Active" : "Inactive"}</span></td>
                    <td data-label="Joined">${formatDate(u.createdAt)}</td>
                    <td data-label="Action">
                      <button class="button button-sm ${u.isActive !== false ? "button-danger" : "button-primary"}" data-toggle-user="${safe(u.id)}" data-active="${u.isActive !== false ? "true" : "false"}">
                        ${u.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>`;
    } else if (activeTab === "vendors") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>All Vendors</h2>
          <p class="dashboard-meta">${allVendors.length} vendor${allVendors.length !== 1 ? "s" : ""}</p>
          <div class="dashboard-list">
            ${allVendors.length ? allVendors.map((v) => `
              <article class="dashboard-item">
                <div class="dash-item-header">
                  <h3>${safe(v.businessName)}</h3>
                  <span class="status-pill status-${(v.status || "").toLowerCase()}">${safe(roleLabel(v.status))}</span>
                </div>
                <p class="dashboard-meta">${safe(v.user?.name || "")} &middot; ${safe(v.user?.email || "")}</p>
                <p class="dashboard-meta">Phone: ${safe(v.phone || "N/A")} &middot; Store: ${v.store ? safe(v.store.name) : "No store"}</p>
                <p class="dashboard-meta">Joined: ${formatDate(v.createdAt)}${v.approvedAt ? ` &middot; Approved: ${formatDate(v.approvedAt)}` : ""}</p>
                ${v.status === "PENDING" ? `
                  <div class="dash-item-actions">
                    <button class="button button-primary button-sm" data-approve-vendor="${safe(v.id)}">Approve</button>
                    <button class="button button-danger button-sm" data-reject-vendor="${safe(v.id)}">Reject</button>
                  </div>
                ` : ""}
              </article>
            `).join("") : `<p class="dashboard-empty">No vendors registered yet.</p>`}
          </div>
        </section>`;
    } else if (activeTab === "orders") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Order Management</h2>
          <p class="dashboard-meta">${allOrders.length} total order${allOrders.length !== 1 ? "s" : ""}</p>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                ${allOrders.length ? allOrders.map((o) => `
                  <tr>
                    <td data-label="Order #"><strong>${safe(o.orderNumber)}</strong></td>
                    <td data-label="Customer">${safe(o.customer?.name || o.customerName || "Guest")}</td>
                    <td data-label="Total">${formatMoney(o.total)}</td>
                    <td data-label="Status"><span class="status-pill status-${(o.status || "").toLowerCase()}">${safe(roleLabel(o.status))}</span></td>
                    <td data-label="Date">${formatDate(o.createdAt)}</td>
                    <td data-label="Update Status">
                      ${statusSelect(o.status, o.id, orderStatuses)}
                    </td>
                  </tr>
                `).join("") : `<tr><td colspan="6" class="dashboard-empty">No orders yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>`;
    } else if (activeTab === "products") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>All Products (${allProducts.length})</h2>
          <div class="dashboard-list">
            ${allProducts.length ? allProducts.map((p) => `
              <article class="dashboard-item" id="admin-product-${safe(p.id)}">
                <div class="dash-item-header">
                  <h3>${safe(p.name)}</h3>
                  <span class="status-pill status-${(p.status || "").toLowerCase()}">${safe(roleLabel(p.status))}</span>
                </div>
                <p class="dashboard-meta">${safe(p.storeName || "N/A")} &middot; ${safe(p.category || "")} &middot; ${formatMoney(p.price)} &middot; Stock: ${safe(p.stockQuantity)} &middot; ${p.featured ? "⭐ Featured" : "Not featured"}</p>
                ${(p.images && p.images.length) ? `
                  <div class="product-image-gallery">
                    ${p.images.map((img) => `
                      <div class="product-image-thumb">
                        <img src="${safe(img.url)}" alt="${safe(img.alt || p.name)}" loading="lazy">
                      </div>
                    `).join("")}
                  </div>
                ` : (p.imageUrl ? `<p class="dashboard-meta"><a href="${safe(p.imageUrl)}" target="_blank">View Image</a></p>` : `<p class="dashboard-meta" style="color:var(--color-warning,#e67e22);">No images</p>`)}
                <div class="dash-item-actions" style="margin-top:0.5rem;">
                  <button class="button button-sm button-secondary" data-admin-toggle-featured="${safe(p.id)}" data-featured="${p.featured ? "true" : "false"}">
                    ${p.featured ? "Remove Featured" : "Mark Featured"}
                  </button>
                  <button class="button button-sm button-secondary" data-admin-toggle-product-status="${safe(p.id)}" data-product-status="${p.status === "ACTIVE" ? "DRAFT" : "ACTIVE"}">
                    ${p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                  <button class="button button-sm button-danger" data-admin-delete-product="${safe(p.id)}">Delete</button>
                </div>
              </article>
            `).join("") : `<p class="dashboard-empty">No products yet.</p>`}
          </div>
        </section>`;
    } else if (activeTab === "stores") {
      const stores = allVendors.filter((v) => v.store).map((v) => ({ ...v.store, vendor: v }));
      tabContent = `
        <section class="card dashboard-section">
          <h2>Vendor Stores (${stores.length})</h2>
          <div class="dashboard-list">
            ${stores.length ? stores.map((s) => `
              <article class="dashboard-item">
                <div class="dash-item-header">
                  <h3>${safe(s.name)}</h3>
                  <span class="status-pill status-${(s.status || "active").toLowerCase()}">${safe(roleLabel(s.status || "ACTIVE"))}</span>
                </div>
                <p class="dashboard-meta">Owner: ${safe(s.vendor?.user?.name || s.vendor?.businessName || "Unknown")} &middot; ${safe(s.vendor?.user?.email || "")}</p>
                <p class="dashboard-meta">${safe(s.description || "No description")}</p>
                <div class="dash-item-actions">
                  <button class="button button-sm button-secondary" data-admin-view-store="${safe(s.id)}">View Store Details</button>
                  <button class="button button-sm button-secondary" data-admin-toggle-store="${safe(s.id)}" data-store-status="${(s.status || "ACTIVE") === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}">
                    ${(s.status || "ACTIVE") === "ACTIVE" ? "Suspend Store" : "Activate Store"}
                  </button>
                </div>
                <div class="admin-store-detail" id="admin-store-detail-${safe(s.id)}" style="display:none;margin-top:0.75rem;"></div>
              </article>
            `).join("") : `<p class="dashboard-empty">No vendor stores created yet.</p>`}
          </div>
        </section>`;
    } else if (activeTab === "categories") {
      tabContent = `
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Create Category</h2>
            <form id="admin-category-form" class="dashboard-stack">
              <label><span>Category Name</span><input name="name" type="text" required></label>
              <label><span>Description</span><textarea name="description" rows="3" required></textarea></label>
              <button class="button button-primary" type="submit">Create Category</button>
              <p id="admin-category-message" class="form-message" aria-live="polite"></p>
            </form>
          </article>
          <article class="card dashboard-section">
            <h2>All Categories (${allCategories.length})</h2>
            <div class="dashboard-list">
              ${allCategories.length ? allCategories.map((c) => `
                <article class="dashboard-item" id="admin-cat-${safe(c.id)}">
                  <div class="dash-item-header">
                    <h3>${safe(c.name)}</h3>
                    <span class="status-pill">${safe(c.productCount ?? 0)} product${(c.productCount ?? 0) !== 1 ? "s" : ""}</span>
                  </div>
                  <p class="dashboard-meta">Slug: ${safe(c.slug)} ${c.description ? "&middot; " + safe(c.description) : ""}</p>
                  <div class="dash-item-actions">
                    <button class="button button-sm button-secondary" data-edit-category="${safe(c.id)}">Edit</button>
                    <button class="button button-sm button-danger" data-delete-category="${safe(c.id)}">Delete</button>
                  </div>
                  <form class="dashboard-stack category-edit-form" id="edit-cat-${safe(c.id)}" style="display:none;margin-top:0.75rem;">
                    <label><span>Name</span><input name="name" type="text" value="${safe(c.name)}"></label>
                    <label><span>Description</span><textarea name="description" rows="2">${safe(c.description || "")}</textarea></label>
                    <div class="dash-item-actions">
                      <button class="button button-sm button-primary" type="submit">Save Changes</button>
                      <button class="button button-sm button-secondary" type="button" data-cancel-cat-edit="${safe(c.id)}">Cancel</button>
                    </div>
                    <p class="form-message edit-category-message" aria-live="polite"></p>
                  </form>
                </article>
              `).join("") : `<p class="dashboard-empty">No categories yet. Create your first one!</p>`}
            </div>
          </article>
        </section>`;
    } else if (activeTab === "messages") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Contact Messages (${allMessages.length})</h2>
          <div class="dashboard-list">
            ${allMessages.length ? allMessages.map((m) => `
              <article class="dashboard-item">
                <div class="dash-item-header">
                  <h3>${safe(m.name)}</h3>
                  <span class="dashboard-meta">${formatDate(m.createdAt)}</span>
                </div>
                <p class="dashboard-meta">${safe(m.email)}</p>
                <p>${safe(m.message)}</p>
              </article>
            `).join("") : `<p class="dashboard-empty">No contact messages yet.</p>`}
          </div>
        </section>`;
    }

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">Admin Control Panel</p>
        <div class="metric-strip">
          ${metric("Users", String(allUsers.length))}
          ${metric("Orders", String(allOrders.length))}
          ${metric("Revenue", formatMoney(totalRevenue))}
          ${metric("Vendors", String(allVendors.length))}
        </div>
      </section>
      ${dashTabs(tabs, activeTab)}
      <div class="dash-tab-content">${tabContent}</div>
    `;
  }

  /* ─── VENDOR DASHBOARD ─── */
  async function renderVendorView(user) {
    const products = user.vendorProfile?.store
      ? await request("/vendor/products").then((d) => d.products).catch(() => [])
      : [];
    const orders = user.vendorProfile?.store
      ? await request("/vendor/orders").then((d) => d.orders).catch(() => [])
      : [];
    let vendorCategories = [];
    try { vendorCategories = (await request("/categories")).categories || []; } catch {}

    const activeTab = state.dashTab || "overview";
    const vendorStatuses = ["PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

    const tabs = [
      { key: "overview", label: "Overview" },
      { key: "store", label: "Store" },
      { key: "products", label: "Products" },
      { key: "orders", label: "Orders" }
    ];

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const activeProducts = products.filter((p) => p.status === "ACTIVE");

    let tabContent = "";

    if (activeTab === "overview") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Store Analytics</h2>
          <div class="metric-strip">
            ${metric("Approval", roleLabel(user.vendorProfile?.status || "PENDING"), "📋")}
            ${metric("Store", user.vendorProfile?.store ? safe(user.vendorProfile.store.name) : "Not Created", "🏪")}
            ${metric("Products", String(products.length), "📦")}
            ${metric("Active", String(activeProducts.length), "✅")}
            ${metric("Orders", String(orders.length), "🛒")}
            ${metric("Revenue", formatMoney(totalRevenue), "💰")}
          </div>
        </section>
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Recent Orders</h2>
            <div class="dashboard-list">
              ${orders.length ? orders.slice(0, 5).map((o) => `
                <article class="dashboard-item">
                  <div class="dash-item-header">
                    <h3>${safe(o.orderNumber)}</h3>
                    <span class="status-pill status-${(o.status || "").toLowerCase()}">${safe(roleLabel(o.status))}</span>
                  </div>
                  <p class="dashboard-meta">${formatMoney(o.total)} &middot; ${safe(o.customerName || "Guest")} &middot; ${formatDate(o.createdAt)}</p>
                </article>
              `).join("") : `<p class="dashboard-empty">No orders yet. Products need to be discovered!</p>`}
            </div>
          </article>
          <article class="card dashboard-section">
            <h2>Product Breakdown</h2>
            <div class="dashboard-list">
              ${products.length ? products.slice(0, 5).map((p) => `
                <div class="dashboard-item">
                  <div class="dash-item-header">
                    <h3>${safe(p.name)}</h3>
                    <span class="status-pill">${safe(roleLabel(p.status))}</span>
                  </div>
                  <p class="dashboard-meta">${formatMoney(p.price)} &middot; Stock: ${safe(p.stockQuantity)}</p>
                </div>
              `).join("") : `<p class="dashboard-empty">No products listed yet.</p>`}
            </div>
          </article>
        </section>`;
    } else if (activeTab === "store") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Store Management</h2>
          ${user.vendorProfile?.store ? `
            <div class="dashboard-item" style="margin-bottom:1rem;">
              <div class="dash-item-header">
                <h3>${safe(user.vendorProfile.store.name)}</h3>
                <span class="status-pill status-${(user.vendorProfile.store.status || "").toLowerCase()}">${safe(roleLabel(user.vendorProfile.store.status))}</span>
              </div>
              <p>${safe(user.vendorProfile.store.description)}</p>
              <p class="dashboard-meta">Slug: ${safe(user.vendorProfile.store.slug)}</p>
            </div>
            <form id="store-edit-form" class="dashboard-stack">
              <label><span>Store name</span><input name="name" type="text" value="${safe(user.vendorProfile.store.name)}" required></label>
              <label><span>Store description</span><textarea name="description" rows="4" required>${safe(user.vendorProfile.store.description)}</textarea></label>
              <button class="button button-primary" type="submit">Update Store</button>
              <p id="store-edit-message" class="form-message" aria-live="polite"></p>
            </form>
          ` : user.vendorProfile?.status !== "APPROVED" ? `
            <div class="dashboard-callout dash-callout-warning">
              <strong>Awaiting Approval</strong>
              <p>Your vendor account is pending admin approval. You'll be able to create your store once approved.</p>
            </div>
          ` : `
            <form id="store-form" class="dashboard-stack">
              <label><span>Store name</span><input name="name" type="text" required></label>
              <label><span>Store description</span><textarea name="description" rows="4" required></textarea></label>
              <button class="button button-primary" type="submit">Create Store</button>
              <p id="store-message" class="form-message" aria-live="polite"></p>
            </form>
          `}
        </section>`;
    } else if (activeTab === "products") {
      tabContent = `
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Create Product Listing</h2>
            ${user.vendorProfile?.store ? `
              <form id="vendor-product-form" class="dashboard-stack">
                <label><span>Product name</span><input name="name" type="text" required></label>
                <label>
                  <span>Category</span>
                  <select name="categorySlug" required>
                    ${vendorCategories.length ? vendorCategories.map((c) => `<option value="${safe(c.slug)}">${safe(c.name)}</option>`).join("") : `
                    <option value="creator-gear">Creator Gear</option>
                    <option value="audio">Audio</option>
                    <option value="power">Power</option>
                    <option value="workspace">Workspace</option>
                    <option value="smart-home">Smart Home</option>`}
                  </select>
                </label>
                <label><span>Description</span><textarea name="description" rows="4" required></textarea></label>
                <label><span>Price (UGX)</span><input name="price" type="number" min="1" required></label>
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
              <p class="dashboard-meta" style="margin-top:0.5rem;">After creating the product, you can upload images below.</p>
            ` : `<p class="dashboard-empty">Create and activate your store to start listing products.</p>`}
          </article>
          <article class="card dashboard-section">
            <h2>Your Listings (${products.length})</h2>
            <div class="dashboard-list">
              ${products.length ? products.map((p) => `
                <article class="dashboard-item" id="product-item-${safe(p.id)}">
                  <div class="dash-item-header">
                    <h3>${safe(p.name)}</h3>
                    <span class="status-pill">${safe(roleLabel(p.status))}</span>
                  </div>
                  <p class="dashboard-meta">${safe(p.sku)} &middot; ${formatMoney(p.price)} &middot; Stock: ${safe(p.stockQuantity)}</p>
                  ${(p.images && p.images.length) ? `
                    <div class="product-image-gallery">
                      ${p.images.map((img) => `
                        <div class="product-image-thumb">
                          <img src="${safe(img.url)}" alt="${safe(img.alt || p.name)}" loading="lazy">
                          <button class="image-remove-btn" data-remove-image="${safe(img.id)}" data-product-id="${safe(p.id)}" title="Remove image">&times;</button>
                        </div>
                      `).join("")}
                    </div>
                  ` : `<p class="dashboard-meta" style="color:var(--color-warning, #e67e22);">No images uploaded yet.</p>`}
                  <div class="image-upload-zone" id="upload-zone-${safe(p.id)}">
                    <form class="image-upload-form" data-product-upload="${safe(p.id)}">
                      <label class="image-dropzone">
                        <input type="file" name="images" accept="image/*" multiple class="sr-only">
                        <span class="dropzone-label">📷 Click to upload images (max 5)</span>
                        <span class="dropzone-preview"></span>
                      </label>
                      <button class="button button-sm button-primary" type="submit" style="margin-top:0.5rem;">Upload Images</button>
                      <p class="form-message image-upload-message" aria-live="polite"></p>
                    </form>
                  </div>
                  <div class="dash-item-actions" style="margin-top:0.5rem;">
                    <button class="button button-sm button-secondary" data-quick-status="${safe(p.id)}" data-next-status="${p.status === "ACTIVE" ? "DRAFT" : "ACTIVE"}">
                      Mark ${p.status === "ACTIVE" ? "Draft" : "Active"}
                    </button>
                    <button class="button button-sm button-secondary" data-edit-product="${safe(p.id)}">Edit</button>
                    <button class="button button-sm button-danger" data-delete-product="${safe(p.id)}">Delete</button>
                  </div>
                  <form class="dashboard-stack product-edit-form" id="edit-form-${safe(p.id)}" style="display:none;margin-top:0.75rem;">
                    <label><span>Name</span><input name="name" type="text" value="${safe(p.name)}"></label>
                    <label><span>Description</span><textarea name="description" rows="2">${safe(p.description || "")}</textarea></label>
                    <label><span>Price (UGX)</span><input name="price" type="number" min="1" value="${p.price}"></label>
                    <label><span>Stock</span><input name="stockQuantity" type="number" min="0" value="${p.stockQuantity}"></label>
                    <div class="dash-item-actions">
                      <button class="button button-sm button-primary" type="submit">Save Changes</button>
                      <button class="button button-sm button-secondary" type="button" data-cancel-edit="${safe(p.id)}">Cancel</button>
                    </div>
                    <p class="form-message edit-product-message" aria-live="polite"></p>
                  </form>
                </article>
              `).join("") : `<p class="dashboard-empty">No products yet. Create your first listing!</p>`}
            </div>
          </article>
        </section>`;
    } else if (activeTab === "orders") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Store Orders (${orders.length})</h2>
          ${orders.length ? `
            <div class="dash-table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map((o) => `
                    <tr>
                      <td data-label="Order #"><strong>${safe(o.orderNumber)}</strong></td>
                      <td data-label="Customer">${safe(o.customerName || "Guest")}</td>
                      <td data-label="Total">${formatMoney(o.total)}</td>
                      <td data-label="Status"><span class="status-pill status-${(o.status || "").toLowerCase()}">${safe(roleLabel(o.status))}</span></td>
                      <td data-label="Date">${formatDate(o.createdAt)}</td>
                      <td data-label="Update">
                        ${statusSelect(o.status, o.id, vendorStatuses)}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<p class="dashboard-empty">No orders received yet.</p>`}
        </section>`;
    }

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">Vendor Workspace</p>
        <div class="metric-strip">
          ${metric("Status", roleLabel(user.vendorProfile?.status || "PENDING"))}
          ${metric("Products", String(products.length))}
          ${metric("Orders", String(orders.length))}
          ${metric("Revenue", formatMoney(totalRevenue))}
        </div>
      </section>
      ${dashTabs(tabs, activeTab)}
      <div class="dash-tab-content">${tabContent}</div>
    `;
  }

  /* ─── CUSTOMER DASHBOARD ─── */
  async function renderCustomerView(user) {
    const orders = await request("/customer/orders").then((d) => d.orders).catch(() => []);
    const addresses = user.customerProfile?.addresses || [];

    const activeTab = state.dashTab || "overview";
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
    const wishlistIds = JSON.parse(localStorage.getItem("snapshopWishlist") || "[]");
    let allProducts = [];
    try { allProducts = (await request("/products")).products || []; } catch {}
    const wishlist = wishlistIds.map((id) => allProducts.find((p) => p.id === id || p.slug === id)).filter(Boolean);

    const tabs = [
      { key: "overview", label: "Overview" },
      { key: "orders", label: "Orders" },
      { key: "addresses", label: "Addresses" },
      { key: "wishlist", label: "Wishlist" },
      { key: "profile", label: "Profile" }
    ];

    let tabContent = "";

    if (activeTab === "overview") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Account Summary</h2>
          <div class="metric-strip">
            ${metric("Total Orders", String(orders.length), "📦")}
            ${metric("Total Spent", formatMoney(totalSpent), "💰")}
            ${metric("Addresses", String(addresses.length), "📍")}
            ${metric("Wishlist", String(wishlist.length), "❤️")}
            ${metric("Status", "Active", "✅")}
          </div>
        </section>
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Recent Orders</h2>
            <div class="dashboard-list">
              ${orders.length ? orders.slice(0, 5).map((o) => `
                <article class="dashboard-item">
                  <div class="dash-item-header">
                    <h3>${safe(o.orderNumber)}</h3>
                    <span class="status-pill status-${(o.status || "").toLowerCase()}">${safe(roleLabel(o.status))}</span>
                  </div>
                  <p class="dashboard-meta">${formatMoney(o.total)} &middot; ${safe(o.deliveryOption)} &middot; ${formatDate(o.createdAt)}</p>
                </article>
              `).join("") : `<p class="dashboard-empty">No orders yet. <a href="shop.html">Start shopping!</a></p>`}
            </div>
          </article>
          <article class="card dashboard-section">
            <h2>Quick Info</h2>
            <div class="dashboard-item">
              <h3>${safe(user.name)}</h3>
              <p class="dashboard-meta">${safe(user.email)}</p>
              <p class="dashboard-meta">Phone: ${safe(user.customerProfile?.phone || "Not set")}</p>
            </div>
            ${addresses.length ? `
              <div class="dashboard-item" style="margin-top:0.75rem;">
                <h4>Default Address</h4>
                ${(() => {
                  const def = addresses.find((a) => a.isDefault) || addresses[0];
                  return `<p class="dashboard-meta">${safe(def.label)} &middot; ${safe(def.addressLine)}, ${safe(def.city)}</p>`;
                })()}
              </div>
            ` : ""}
          </article>
        </section>`;
    } else if (activeTab === "orders") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>Order History (${orders.length})</h2>
          <div class="dashboard-list">
            ${orders.length ? orders.map((o) => `
              <article class="dashboard-item">
                <div class="dash-item-header">
                  <h3>${safe(o.orderNumber)}</h3>
                  <span class="status-pill status-${(o.status || "").toLowerCase()}">${safe(roleLabel(o.status))}</span>
                </div>
                <p class="dashboard-meta">${formatMoney(o.total)} &middot; ${safe(o.deliveryOption)} &middot; ${safe(o.paymentMethod)}</p>
                <p class="dashboard-meta">Placed: ${formatDate(o.createdAt)}</p>
                ${(o.items && o.items.length) ? `
                  <div class="dash-order-items">
                    ${o.items.map((it) => `<span class="dash-order-item-tag">${safe(it.productName)} &times; ${it.quantity}</span>`).join("")}
                  </div>
                ` : ""}
                ${["PAID", "PROCESSING"].includes(o.status) ? `
                  <div class="dash-item-actions" style="margin-top:0.5rem;">
                    <button class="button button-sm button-danger" data-cancel-order="${safe(o.orderNumber)}">Cancel Order</button>
                  </div>
                ` : ""}
                <div class="tracking-timeline">
                  ${(o.statusHistory || []).map((entry, idx, arr) => {
                    const isCurrent = idx === arr.length - 1;
                    return `
                      <div class="tracking-step ${isCurrent ? "is-current" : "is-completed"}">
                        <span class="tracking-step-label">${safe(roleLabel(entry.status))}</span>
                        <span class="tracking-step-time">${entry.note ? safe(entry.note) : ""} &middot; ${formatDate(entry.createdAt)}</span>
                      </div>`;
                  }).join("")}
                </div>
              </article>
            `).join("") : `<p class="dashboard-empty">No orders yet. <a href="shop.html">Browse our products!</a></p>`}
          </div>
        </section>`;
    } else if (activeTab === "addresses") {
      tabContent = `
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Add New Address</h2>
            <form id="address-form" class="dashboard-stack">
              <label><span>Label (e.g. Home, Work)</span><input name="label" type="text" required></label>
              <label><span>City</span><input name="city" type="text" required></label>
              <label><span>Address line</span><textarea name="addressLine" rows="3" required></textarea></label>
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
          </article>
          <article class="card dashboard-section">
            <h2>Saved Addresses (${addresses.length})</h2>
            <div class="dashboard-list">
              ${addresses.length ? addresses.map((a) => `
                <div class="dashboard-item">
                  <div class="dash-item-header">
                    <h3>${safe(a.label)}${a.isDefault ? ' <span class="status-pill status-active">Default</span>' : ""}</h3>
                    <button class="button button-danger button-sm" data-delete-address="${safe(a.id)}" title="Delete address">✕</button>
                  </div>
                  <p>${safe(a.addressLine)}</p>
                  <p class="dashboard-meta">${safe(a.city)}</p>
                </div>
              `).join("") : `<p class="dashboard-empty">No saved addresses yet. Add one for faster checkout!</p>`}
            </div>
          </article>
        </section>`;
    } else if (activeTab === "wishlist") {
      tabContent = `
        <section class="card dashboard-section">
          <h2>My Wishlist (${wishlist.length})</h2>
          <div class="dashboard-list">
            ${wishlist.length ? wishlist.map((item) => `
              <article class="dashboard-item">
                <div class="dash-item-header">
                  <h3>${safe(item.name)}</h3>
                  <button class="button button-danger button-sm" data-remove-wishlist="${safe(item.id)}" title="Remove from wishlist">✕</button>
                </div>
                <p class="dashboard-meta">${formatMoney(item.price)} &middot; ${safe(item.category || "")}</p>
                <a class="button button-sm button-secondary" href="product.html?id=${safe(item.id)}">View Product</a>
              </article>
            `).join("") : `<p class="dashboard-empty">Your wishlist is empty. <a href="shop.html">Discover products you love!</a></p>`}
          </div>
        </section>`;
    } else if (activeTab === "profile") {
      tabContent = `
        <section class="dashboard-two-column">
          <article class="card dashboard-section">
            <h2>Update Profile</h2>
            <form id="profile-form" class="dashboard-stack">
              <label><span>Full name</span><input name="name" type="text" value="${safe(user.name)}" required></label>
              <label><span>Phone number</span><input name="phone" type="tel" value="${safe(user.customerProfile?.phone || "")}"></label>
              <button class="button button-primary" type="submit">Save Changes</button>
              <p id="profile-message" class="form-message" aria-live="polite"></p>
            </form>
          </article>
          <article class="card dashboard-section">
            <h2>Change Password</h2>
            <form id="password-form" class="dashboard-stack">
              <label><span>Current password</span><input name="currentPassword" type="password" required minlength="8"></label>
              <label><span>New password</span><input name="newPassword" type="password" required minlength="8"></label>
              <label><span>Confirm new password</span><input name="confirmPassword" type="password" required minlength="8"></label>
              <button class="button button-primary" type="submit">Update Password</button>
              <p id="password-message" class="form-message" aria-live="polite"></p>
            </form>
          </article>
        </section>`;
    }

    return `
      <section class="card dashboard-section">
        <p class="eyebrow">My Account</p>
        <div class="metric-strip">
          ${metric("Orders", String(orders.length))}
          ${metric("Spent", formatMoney(totalSpent))}
          ${metric("Addresses", String(addresses.length))}
          ${metric("Wishlist", String(wishlist.length))}
        </div>
      </section>
      ${dashTabs(tabs, activeTab)}
      <div class="dash-tab-content">${tabContent}</div>
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

    title.textContent = `Welcome back, ${state.user.name}.`;
    subtitle.textContent = `Signed in as ${roleLabel(state.user.role)}.`;
    summary.innerHTML = `
      <div class="dash-profile-card">
        <div class="dash-avatar">${safe(state.user.name.charAt(0).toUpperCase())}</div>
        <div>
          <h3 style="margin:0">${safe(state.user.name)}</h3>
          <p class="dashboard-meta" style="margin:0">${safe(state.user.email)}</p>
          <span class="status-pill" style="margin-top:0.4rem">${safe(roleLabel(state.user.role))}</span>
        </div>
      </div>
    `;
    actions.innerHTML = `
      <a class="button button-primary" href="shop.html">Browse Marketplace</a>
      <a class="button button-secondary" href="contact.html">Need Support?</a>
      ${state.user.role === "CUSTOMER" ? '<a class="button button-secondary" href="cart.html">View Cart</a>' : ""}
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
    setupPasswordToggles();
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

    const storeEditForm = document.getElementById("store-edit-form");
    if (storeEditForm && storeEditForm.dataset.bound !== "true") {
      storeEditForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("store-edit-message");
        if (!storeEditForm.reportValidity()) {
          message.textContent = "Please complete the form.";
          return;
        }
        try {
          await request("/vendor/store", {
            method: "PATCH",
            body: JSON.stringify(Object.fromEntries(new FormData(storeEditForm).entries()))
          });
          await refreshUser();
          renderNav();
          toast("Store updated.");
          await renderDashboard();
        } catch (error) {
          message.textContent = error.message;
        }
      });
      storeEditForm.dataset.bound = "true";
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

    document.querySelectorAll(".product-edit-form").forEach((form) => {
      if (form.dataset.bound === "true") return;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const productId = form.id.replace("edit-form-", "");
        const message = form.querySelector(".edit-product-message");
        const payload = Object.fromEntries(new FormData(form).entries());
        if (payload.price) payload.price = Number(payload.price);
        if (payload.stockQuantity) payload.stockQuantity = Number(payload.stockQuantity);
        try {
          await request(`/vendor/products/${productId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
          toast("Product updated.");
          await renderDashboard();
        } catch (error) {
          if (message) message.textContent = error.message;
        }
      });
      form.dataset.bound = "true";
    });

    /* ── Image upload forms: preview + submit ── */
    document.querySelectorAll(".image-upload-form").forEach((form) => {
      if (form.dataset.bound === "true") return;
      const fileInput = form.querySelector("input[type='file']");
      const previewContainer = form.querySelector(".dropzone-preview");

      fileInput.addEventListener("change", () => {
        previewContainer.innerHTML = "";
        Array.from(fileInput.files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.className = "dropzone-thumb";
            img.alt = file.name;
            previewContainer.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const productId = form.dataset.productUpload;
        const msg = form.querySelector(".image-upload-message");
        if (!fileInput.files.length) {
          msg.textContent = "Please select at least one image.";
          return;
        }
        const formData = new FormData();
        Array.from(fileInput.files).forEach((f) => formData.append("images", f));
        try {
          const token = getToken();
          const res = await fetch(`/api/vendor/products/${productId}/images`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          toast("Images uploaded.");
          await renderDashboard();
        } catch (error) {
          msg.textContent = error.message;
        }
      });
      form.dataset.bound = "true";
    });

    /* ── Admin: Create category form ── */
    const categoryForm = document.getElementById("admin-category-form");
    if (categoryForm && categoryForm.dataset.bound !== "true") {
      categoryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("admin-category-message");
        if (!categoryForm.reportValidity()) { message.textContent = "Please fill in all fields."; return; }
        const payload = Object.fromEntries(new FormData(categoryForm).entries());
        try {
          await request("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
          categoryForm.reset();
          toast("Category created.");
          await renderDashboard();
        } catch (error) {
          message.textContent = error.message;
        }
      });
      categoryForm.dataset.bound = "true";
    }

    /* ── Admin: Edit category forms ── */
    document.querySelectorAll(".category-edit-form").forEach((form) => {
      if (form.dataset.bound === "true") return;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const categoryId = form.id.replace("edit-cat-", "");
        const message = form.querySelector(".edit-category-message");
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          await request(`/admin/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(payload) });
          toast("Category updated.");
          await renderDashboard();
        } catch (error) {
          if (message) message.textContent = error.message;
        }
      });
      form.dataset.bound = "true";
    });

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

    const profileForm = document.getElementById("profile-form");
    if (profileForm && profileForm.dataset.bound !== "true") {
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("profile-message");
        try {
          const payload = Object.fromEntries(new FormData(profileForm).entries());
          const result = await request("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
          setSession(result.token, result.user);
          renderNav();
          toast("Profile updated.");
          message.textContent = "Profile saved successfully.";
          message.className = "form-message is-success";
        } catch (error) {
          message.textContent = error.message;
          message.className = "form-message is-error";
        }
      });
      profileForm.dataset.bound = "true";
    }

    const passwordForm = document.getElementById("password-form");
    if (passwordForm && passwordForm.dataset.bound !== "true") {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("password-message");
        const formData = Object.fromEntries(new FormData(passwordForm).entries());

        if (formData.newPassword !== formData.confirmPassword) {
          message.textContent = "New passwords do not match.";
          message.className = "form-message is-error";
          return;
        }

        try {
          await request("/auth/password", {
            method: "PATCH",
            body: JSON.stringify({
              currentPassword: formData.currentPassword,
              newPassword: formData.newPassword
            })
          });
          passwordForm.reset();
          toast("Password changed.");
          message.textContent = "Password updated successfully.";
          message.className = "form-message is-success";
        } catch (error) {
          message.textContent = error.message;
          message.className = "form-message is-error";
        }
      });
      passwordForm.dataset.bound = "true";
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

      /* Dashboard tab switching */
      const tab = event.target.closest(".dash-tab");
      if (tab) {
        state.dashTab = tab.dataset.tab;
        await renderDashboard();
        return;
      }

      /* Admin: Approve vendor */
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

      /* Admin: Reject vendor */
      const reject = event.target.closest("[data-reject-vendor]");
      if (reject) {
        try {
          await request(`/admin/vendors/${reject.dataset.rejectVendor}/reject`, { method: "PATCH" });
          toast("Vendor rejected.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Toggle user active/inactive */
      const toggleUser = event.target.closest("[data-toggle-user]");
      if (toggleUser) {
        const isActive = toggleUser.dataset.active === "true";
        try {
          await request(`/admin/users/${toggleUser.dataset.toggleUser}/status`, {
            method: "PATCH",
            body: JSON.stringify({ isActive: !isActive })
          });
          toast(isActive ? "User deactivated." : "User activated.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Toggle product featured */
      const toggleFeatured = event.target.closest("[data-admin-toggle-featured]");
      if (toggleFeatured) {
        const isFeatured = toggleFeatured.dataset.featured === "true";
        try {
          await request(`/admin/products/${toggleFeatured.dataset.adminToggleFeatured}`, {
            method: "PATCH",
            body: JSON.stringify({ featured: !isFeatured })
          });
          toast(isFeatured ? "Removed from featured." : "Marked as featured.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Toggle product status */
      const adminToggleProduct = event.target.closest("[data-admin-toggle-product-status]");
      if (adminToggleProduct) {
        try {
          await request(`/admin/products/${adminToggleProduct.dataset.adminToggleProductStatus}`, {
            method: "PATCH",
            body: JSON.stringify({ status: adminToggleProduct.dataset.productStatus })
          });
          toast("Product status updated.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Delete product */
      const adminDeleteProduct = event.target.closest("[data-admin-delete-product]");
      if (adminDeleteProduct) {
        if (!confirm("Delete this product permanently? This cannot be undone.")) return;
        try {
          await request(`/admin/products/${adminDeleteProduct.dataset.adminDeleteProduct}`, { method: "DELETE" });
          toast("Product deleted.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: View store details */
      const viewStore = event.target.closest("[data-admin-view-store]");
      if (viewStore) {
        const storeId = viewStore.dataset.adminViewStore;
        const detailDiv = document.getElementById(`admin-store-detail-${storeId}`);
        if (!detailDiv) return;
        if (detailDiv.style.display !== "none") {
          detailDiv.style.display = "none";
          return;
        }
        try {
          const data = await request(`/admin/stores/${storeId}`);
          const store = data.store;
          detailDiv.innerHTML = `
            <div class="card" style="background:var(--color-bg);padding:1rem;">
              <h4>${safe(store.name)} — Products (${store.products?.length || 0})</h4>
              <p class="dashboard-meta">${safe(store.description || "No description")}</p>
              ${store.products?.length ? store.products.map((p) => `
                <div class="dashboard-item" style="margin-top:0.5rem;">
                  <strong>${safe(p.name)}</strong> &middot; ${formatMoney(p.price)} &middot; Stock: ${p.stockQuantity} &middot; <span class="status-pill status-${(p.status || "").toLowerCase()}">${safe(roleLabel(p.status))}</span>
                  ${(p.images && p.images.length) ? `
                    <div class="product-image-gallery" style="margin-top:0.25rem;">
                      ${p.images.map((img) => `<div class="product-image-thumb"><img src="${safe(img.url)}" alt="${safe(img.alt || p.name)}" loading="lazy"></div>`).join("")}
                    </div>
                  ` : ""}
                </div>
              `).join("") : `<p class="dashboard-empty">No products in this store.</p>`}
            </div>
          `;
          detailDiv.style.display = "block";
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Toggle store status */
      const toggleStore = event.target.closest("[data-admin-toggle-store]");
      if (toggleStore) {
        const storeId = toggleStore.dataset.adminToggleStore;
        const newStatus = toggleStore.dataset.storeStatus;
        if (!confirm(`${newStatus === "SUSPENDED" ? "Suspend" : "Activate"} this store?`)) return;
        try {
          await request(`/admin/stores/${storeId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
          });
          toast(`Store ${newStatus === "SUSPENDED" ? "suspended" : "activated"}.`);
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Admin: Edit category toggle */
      const editCat = event.target.closest("[data-edit-category]");
      if (editCat) {
        const formEl = document.getElementById(`edit-cat-${editCat.dataset.editCategory}`);
        if (formEl) formEl.style.display = formEl.style.display === "none" ? "block" : "none";
        return;
      }

      /* Admin: Cancel category edit */
      const cancelCatEdit = event.target.closest("[data-cancel-cat-edit]");
      if (cancelCatEdit) {
        const formEl = document.getElementById(`edit-cat-${cancelCatEdit.dataset.cancelCatEdit}`);
        if (formEl) formEl.style.display = "none";
        return;
      }

      /* Admin: Delete category */
      const deleteCat = event.target.closest("[data-delete-category]");
      if (deleteCat) {
        if (!confirm("Delete this category? Products must be moved first.")) return;
        try {
          await request(`/admin/categories/${deleteCat.dataset.deleteCategory}`, { method: "DELETE" });
          toast("Category deleted.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Vendor: Toggle product status */
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
        return;
      }

      /* Vendor: Remove product image */
      const removeImage = event.target.closest("[data-remove-image]");
      if (removeImage) {
        if (!confirm("Remove this image?")) return;
        const imageId = removeImage.dataset.removeImage;
        const productId = removeImage.dataset.productId;
        try {
          await request(`/vendor/products/${productId}/images/${imageId}`, { method: "DELETE" });
          toast("Image removed.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Customer: Delete address */
      const deleteAddr = event.target.closest("[data-delete-address]");
      if (deleteAddr) {
        if (!confirm("Delete this address?")) return;
        try {
          await request(`/customer/addresses/${deleteAddr.dataset.deleteAddress}`, { method: "DELETE" });
          await refreshUser();
          toast("Address deleted.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Customer: Remove wishlist item */
      const removeWish = event.target.closest("[data-remove-wishlist]");
      if (removeWish) {
        const wl = JSON.parse(localStorage.getItem("snapshopWishlist") || "[]");
        const updated = wl.filter((id) => id !== removeWish.dataset.removeWishlist);
        localStorage.setItem("snapshopWishlist", JSON.stringify(updated));
        toast("Removed from wishlist.");
        await renderDashboard();
        return;
      }

      /* Vendor: Edit product toggle */
      const editProduct = event.target.closest("[data-edit-product]");
      if (editProduct) {
        const formEl = document.getElementById(`edit-form-${editProduct.dataset.editProduct}`);
        if (formEl) formEl.style.display = formEl.style.display === "none" ? "block" : "none";
        return;
      }

      /* Vendor: Cancel edit */
      const cancelEdit = event.target.closest("[data-cancel-edit]");
      if (cancelEdit) {
        const formEl = document.getElementById(`edit-form-${cancelEdit.dataset.cancelEdit}`);
        if (formEl) formEl.style.display = "none";
        return;
      }

      /* Vendor: Delete product */
      const deleteProduct = event.target.closest("[data-delete-product]");
      if (deleteProduct) {
        if (!confirm("Delete this product permanently?")) return;
        try {
          await request(`/vendor/products/${deleteProduct.dataset.deleteProduct}`, { method: "DELETE" });
          toast("Product deleted.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }

      /* Customer: Cancel order */
      const cancelOrder = event.target.closest("[data-cancel-order]");
      if (cancelOrder) {
        if (!confirm("Cancel this order?")) return;
        try {
          await request(`/customer/orders/${cancelOrder.dataset.cancelOrder}/cancel`, { method: "PATCH" });
          toast("Order cancelled.");
          await renderDashboard();
        } catch (error) {
          toast(error.message);
        }
        return;
      }
    });

    /* Admin/Vendor: Order status change via select */
    document.addEventListener("change", async (event) => {
      const select = event.target.closest("[data-order-status]");
      if (!select) return;

      const orderId = select.dataset.orderStatus;
      const status = select.value;
      const isVendor = state.user?.role === "VENDOR";
      const endpoint = isVendor
        ? `/vendor/orders/${orderId}/status`
        : `/admin/orders/${orderId}/status`;

      try {
        await request(endpoint, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        toast(`Order status updated to ${roleLabel(status)}.`);
        await renderDashboard();
      } catch (error) {
        toast(error.message);
      }
    });
  }

  function setupPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach((input) => {
      if (input.parentElement.querySelector(".password-toggle")) return;
      input.parentElement.classList.add("password-field");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "password-toggle";
      btn.textContent = "Show";
      btn.setAttribute("aria-label", "Toggle password visibility");
      btn.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.textContent = isPassword ? "Hide" : "Show";
      });
      input.parentElement.appendChild(btn);
    });
  }

  async function init() {
    state.dashTab = null;
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
    setupPasswordToggles();
    bindGlobalClicks();
    await renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => console.error(error));
  });
})();
