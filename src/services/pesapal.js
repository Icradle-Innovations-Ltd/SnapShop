/**
 * Pesapal API 3.0 Integration Service
 * Handles authentication, IPN registration, order submission, and transaction status.
 * Uses sandbox by default; switch PESAPAL_API_URL to production when ready.
 */

const PESAPAL_API_URL = process.env.PESAPAL_API_URL || "https://cybqa.pesapal.com/pesapalv3";
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";

let cachedToken = null;
let tokenExpiry = 0;
let cachedIpnId = null;

/* ── Auth ─────────────────────────────────────────────────── */

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(`${PESAPAL_API_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET
    })
  });

  const data = await res.json();
  if (data.error || data.status !== "200") {
    throw new Error(data.message || "Pesapal authentication failed.");
  }

  cachedToken = data.token;
  // Token valid ~5 min; refresh 30 s early
  tokenExpiry = Date.now() + 4.5 * 60 * 1000;
  return cachedToken;
}

/* ── IPN Registration ─────────────────────────────────────── */

async function registerIPN(ipnUrl) {
  const token = await getAccessToken();

  const res = await fetch(`${PESAPAL_API_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "GET"
    })
  });

  const data = await res.json();
  if (data.error || data.status !== "200") {
    throw new Error(data.message || "IPN registration failed.");
  }

  cachedIpnId = data.ipn_id;
  return data;
}

async function getIpnId(ipnUrl) {
  if (cachedIpnId) return cachedIpnId;
  const result = await registerIPN(ipnUrl);
  return result.ipn_id;
}

/* ── Submit Order Request ─────────────────────────────────── */

async function submitOrderRequest({ merchantReference, amount, description, callbackUrl, ipnId, customer }) {
  const token = await getAccessToken();

  const body = {
    id: merchantReference,
    currency: "UGX",
    amount,
    description: (description || "SnapShop Order").slice(0, 100),
    callback_url: callbackUrl,
    notification_id: ipnId,
    branch: "SnapShop - Kampala",
    billing_address: {
      email_address: customer.email || "",
      phone_number: customer.phone || "",
      country_code: "UG",
      first_name: customer.firstName || "",
      last_name: customer.lastName || "",
      line_1: customer.address || "",
      city: customer.city || "",
      state: "",
      postal_code: "",
      zip_code: ""
    }
  };

  const res = await fetch(`${PESAPAL_API_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.error || data.status !== "200") {
    throw new Error(data.message || "Pesapal order submission failed.");
  }

  return {
    orderTrackingId: data.order_tracking_id,
    merchantReference: data.merchant_reference,
    redirectUrl: data.redirect_url
  };
}

/* ── Transaction Status ───────────────────────────────────── */

async function getTransactionStatus(orderTrackingId) {
  const token = await getAccessToken();

  const res = await fetch(
    `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await res.json();
  return {
    paymentMethod: data.payment_method,
    amount: data.amount,
    createdDate: data.created_date,
    confirmationCode: data.confirmation_code,
    statusDescription: data.payment_status_description,
    description: data.description,
    statusCode: data.status_code,
    merchantReference: data.merchant_reference,
    currency: data.currency,
    error: data.error
  };
}

module.exports = {
  getAccessToken,
  registerIPN,
  getIpnId,
  submitOrderRequest,
  getTransactionStatus
};
