# Pesapal API 3.0 — Integration Guide

A practical, copy-paste-ready guide for integrating Pesapal payments into **any** application. Includes examples in Node.js, Python, PHP, Java, C#, and frontend frameworks (React, Next.js, Flutter). Based on a working production implementation.

---

## Table of Contents

1. [Overview & Flow](#1-overview--flow)
2. [Environment Variables](#2-environment-variables)
3. [Database Schema](#3-database-schema)
4. [Backend: Pesapal Service](#4-backend-pesapal-service)
   - [Node.js / Express](#nodejs--express)
   - [Python / Flask / Django](#python--flask--django)
   - [PHP / Laravel](#php--laravel)
   - [Java / Spring Boot](#java--spring-boot)
   - [C# / ASP.NET](#c--aspnet)
5. [Backend: Routes / Controllers](#5-backend-routes--controllers)
6. [Frontend: Payment Page](#6-frontend-payment-page)
7. [Frontend: JavaScript](#7-frontend-javascript)
   - [Vanilla JS](#vanilla-js-works-with-any-html-page)
   - [React / Next.js](#react--nextjs)
   - [Flutter / Dart](#flutter--dart)
8. [IPN (Instant Payment Notification)](#8-ipn-instant-payment-notification)
9. [Refunds & Cancellations](#9-refunds--cancellations)
10. [Sandbox vs Production](#10-sandbox-vs-production)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview & Flow

```
Customer clicks "Pay"
       │
       ▼
 ┌─────────────────────┐
 │ POST /api/pesapal/   │  ← Your server creates order, calls Pesapal API
 │      initiate        │
 └────────┬────────────┘
          │  returns { redirectUrl, orderTrackingId }
          ▼
 ┌─────────────────────┐
 │  Load Pesapal form   │  ← Iframe on your page (or full redirect)
 │  (Mobile Money/Card) │
 └────────┬────────────┘
          │  Customer completes payment
          ▼
 ┌─────────────────────┐
 │ Pesapal redirects    │  ← Back to your payment.html with URL params:
 │ back to callback_url │     ?OrderTrackingId=xxx&OrderMerchantReference=yyy
 └────────┬────────────┘
          │
          ▼
 ┌─────────────────────┐
 │ GET /api/pesapal/    │  ← Your frontend verifies the payment
 │    status/:trackingId│
 └────────┬────────────┘
          │  statusCode === 1 → PAID
          ▼
 ┌─────────────────────┐
 │  Show success page   │
 └─────────────────────┘

Meanwhile, Pesapal also sends a server-to-server IPN:
  GET /api/pesapal/ipn?OrderTrackingId=xxx&OrderMerchantReference=yyy
  → Your server updates the order status independently
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Consumer Key/Secret** | API credentials from your Pesapal dashboard |
| **Access Token** | Short-lived JWT (~5 min) obtained from Pesapal auth endpoint |
| **IPN (Instant Payment Notification)** | Server-to-server callback Pesapal sends when payment status changes |
| **IPN ID** | Registered webhook ID — you register your IPN URL once, then reuse the ID |
| **Order Tracking ID** | Pesapal's unique ID for the transaction |
| **Merchant Reference** | Your order number — links Pesapal transaction to your order |
| **Redirect URL** | Pesapal's hosted payment page URL (load in iframe or redirect to) |
| **Callback URL** | Where Pesapal sends the customer after payment (your payment page) |

### Pesapal REST API Endpoints (Language-Agnostic)

All Pesapal interaction is standard REST. Any language that can make HTTP requests works:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/Auth/RequestToken` | Get access token (5 min TTL) |
| `POST` | `/api/URLSetup/RegisterIPN` | Register your webhook URL |
| `GET` | `/api/URLSetup/GetIpnList` | List registered IPN URLs |
| `POST` | `/api/Transactions/SubmitOrderRequest` | Create a payment |
| `GET` | `/api/Transactions/GetTransactionStatus?orderTrackingId=xxx` | Check payment status |
| `POST` | `/api/Transactions/RefundRequest` | Request a refund |
| `POST` | `/api/Transactions/CancelOrder` | Cancel an unpaid order |

**Base URL:** `https://cybqa.pesapal.com/pesapalv3` (sandbox) or `https://pay.pesapal.com/v3` (production)

All requests (except auth) need: `Authorization: Bearer <token>`

### Supported Currencies

`KES` (Kenya), `UGX` (Uganda), `TZS` (Tanzania), `USD`, `GBP`, `EUR`, `RWF` (Rwanda), `ZMW` (Zambia), `MWK` (Malawi), `BWP` (Botswana)

---

## 2. Environment Variables

```env
# Pesapal API 3.0
PESAPAL_CONSUMER_KEY="your-consumer-key"
PESAPAL_CONSUMER_SECRET="your-consumer-secret"
PESAPAL_API_URL="https://cybqa.pesapal.com/pesapalv3"
```

| Variable | Sandbox Value | Production Value |
|----------|--------------|-----------------|
| `PESAPAL_API_URL` | `https://cybqa.pesapal.com/pesapalv3` | `https://pay.pesapal.com/v3` |
| `PESAPAL_CONSUMER_KEY` | From sandbox dashboard | From production dashboard |
| `PESAPAL_CONSUMER_SECRET` | From sandbox dashboard | From production dashboard |

Get credentials at:
- **Sandbox:** https://cybqa.pesapal.com/PesapalIframe/PesapalIframe3/GetMerchantTokens
- **Production:** https://www.pesapal.com/ → Business Dashboard → API Keys

---

## 3. Database Schema

Add these fields to your Order model. Example using Prisma:

```prisma
model Order {
  id                      String      @id @default(cuid())
  orderNumber             String      @unique    // Your reference — sent as merchantReference
  // ... your other order fields ...
  total                   Int                    // Amount in smallest currency unit or whole
  status                  OrderStatus @default(PENDING)
  pesapalTrackingId       String?                // Pesapal's transaction ID
  pesapalConfirmationCode String?                // Pesapal's confirmation code (needed for refunds)
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
}
```

**Minimum fields needed:**
- `orderNumber` — your unique reference (becomes `merchantReference` in Pesapal)
- `pesapalTrackingId` — store after initiating payment (for status checks)
- `pesapalConfirmationCode` — store after successful payment (needed for refunds)

---

## 4. Backend: Pesapal Service

The Pesapal service handles all API communication. Below are implementations in multiple languages. **Pick your stack** — the logic is identical.

### Node.js / Express

```js
/**
 * Pesapal API 3.0 Integration Service
 *
 * Endpoints used:
 *   POST /api/Auth/RequestToken           — Get access token
 *   POST /api/URLSetup/RegisterIPN        — Register IPN webhook
 *   GET  /api/URLSetup/GetIpnList         — List registered IPNs
 *   POST /api/Transactions/SubmitOrderRequest — Create payment
 *   GET  /api/Transactions/GetTransactionStatus — Check payment status
 *   POST /api/Transactions/RefundRequest   — Request refund
 *   POST /api/Transactions/CancelOrder     — Cancel unpaid order
 */

const PESAPAL_API_URL = process.env.PESAPAL_API_URL || "https://cybqa.pesapal.com/pesapalv3";
const CONSUMER_KEY    = process.env.PESAPAL_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";

let cachedToken = null;
let tokenExpiry = 0;
let cachedIpnId = null;

/* ── 1. Authentication ────────────────────────────────────── */

async function getAccessToken() {
  // Return cached token if still valid
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
  tokenExpiry = Date.now() + 4.5 * 60 * 1000; // ~5 min validity, refresh 30s early
  return cachedToken;
}

/* ── 2. IPN Registration ──────────────────────────────────── */

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
      ipn_notification_type: "GET"   // Pesapal will GET your IPN URL
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

/* ── 3. Submit Order (Create Payment) ─────────────────────── */

async function submitOrderRequest({
  merchantReference,  // Your order number
  amount,             // Payment amount
  description,        // Order description (max 100 chars)
  callbackUrl,        // Where to redirect customer after payment
  ipnId,              // Registered IPN ID
  customer            // Customer billing details
}) {
  const token = await getAccessToken();

  const body = {
    id: merchantReference,
    currency: "UGX",           // ← Change to your currency (KES, TZS, USD, etc.)
    amount,
    description: (description || "Order Payment").slice(0, 100),
    callback_url: callbackUrl,
    redirect_mode: "TOP_WINDOW",  // or "PARENT_WINDOW" for iframe
    notification_id: ipnId,
    branch: "Main Branch",        // Your business branch name
    billing_address: {
      email_address: customer.email || "",
      phone_number: customer.phone || "",
      country_code: "UG",         // ← Change to your country code
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
    orderTrackingId: data.order_tracking_id,    // Save this!
    merchantReference: data.merchant_reference,
    redirectUrl: data.redirect_url               // Load this in iframe or redirect
  };
}

/* ── 4. Check Transaction Status ──────────────────────────── */

async function getTransactionStatus(orderTrackingId) {
  const token = await getAccessToken();

  const res = await fetch(
    `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await res.json();
  return {
    paymentMethod: data.payment_method,          // "Visa", "MobileMoney", etc.
    amount: data.amount,
    createdDate: data.created_date,
    confirmationCode: data.confirmation_code,    // Save for refunds!
    statusDescription: data.payment_status_description,
    description: data.description,
    statusCode: data.status_code,                // 0=Invalid, 1=Completed, 2=Failed, 3=Reversed
    merchantReference: data.merchant_reference,
    currency: data.currency,
    paymentAccount: data.payment_account,        // Phone number or card last 4
    error: data.error
  };
}

/* ── 5. Get Registered IPNs ───────────────────────────────── */

async function getRegisteredIPNs() {
  const token = await getAccessToken();
  const res = await fetch(`${PESAPAL_API_URL}/api/URLSetup/GetIpnList`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  return res.json();
}

/* ── 6. Refund ────────────────────────────────────────────── */

async function refundRequest({ confirmationCode, amount, username, remarks }) {
  const token = await getAccessToken();
  const res = await fetch(`${PESAPAL_API_URL}/api/Transactions/RefundRequest`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      confirmation_code: confirmationCode,
      amount: String(amount),
      username,
      remarks
    })
  });
  const data = await res.json();
  if (data.status !== "200") throw new Error(data.message || "Refund request failed.");
  return data;
}

/* ── 7. Cancel Order ──────────────────────────────────────── */

async function cancelOrder(orderTrackingId) {
  const token = await getAccessToken();
  const res = await fetch(`${PESAPAL_API_URL}/api/Transactions/CancelOrder`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ order_tracking_id: orderTrackingId })
  });
  const data = await res.json();
  if (data.status !== "200") throw new Error(data.message || "Cancel failed.");
  return data;
}

module.exports = {
  getAccessToken,
  registerIPN,
  getIpnId,
  getRegisteredIPNs,
  submitOrderRequest,
  getTransactionStatus,
  refundRequest,
  cancelOrder
};
```

### Status Codes Reference

| `status_code` | Meaning |
|---------------|---------|
| `0` | Invalid / Pending |
| `1` | Completed (PAID) |
| `2` | Failed |
| `3` | Reversed |

---

### Python / Flask / Django

```python
"""
pesapal_service.py — Pesapal API 3.0 for Python
Works with Flask, Django, FastAPI, or any Python framework.
Install: pip install requests
"""
import os, time, requests

PESAPAL_API_URL    = os.getenv("PESAPAL_API_URL", "https://cybqa.pesapal.com/pesapalv3")
CONSUMER_KEY       = os.getenv("PESAPAL_CONSUMER_KEY", "")
CONSUMER_SECRET    = os.getenv("PESAPAL_CONSUMER_SECRET", "")

_cached_token = None
_token_expiry = 0
_cached_ipn_id = None


# ── 1. Authentication ──────────────────────────────────────
def get_access_token():
    global _cached_token, _token_expiry
    if _cached_token and time.time() < _token_expiry:
        return _cached_token

    resp = requests.post(f"{PESAPAL_API_URL}/api/Auth/RequestToken", json={
        "consumer_key": CONSUMER_KEY,
        "consumer_secret": CONSUMER_SECRET,
    })
    data = resp.json()
    if data.get("error") or data.get("status") != "200":
        raise Exception(data.get("message", "Pesapal auth failed"))

    _cached_token = data["token"]
    _token_expiry = time.time() + 270  # ~4.5 min
    return _cached_token


def _headers():
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {get_access_token()}",
    }


# ── 2. IPN Registration ───────────────────────────────────
def register_ipn(ipn_url):
    global _cached_ipn_id
    resp = requests.post(f"{PESAPAL_API_URL}/api/URLSetup/RegisterIPN",
        headers=_headers(),
        json={"url": ipn_url, "ipn_notification_type": "GET"},
    )
    data = resp.json()
    if data.get("error") or data.get("status") != "200":
        raise Exception(data.get("message", "IPN registration failed"))
    _cached_ipn_id = data["ipn_id"]
    return data


def get_ipn_id(ipn_url):
    global _cached_ipn_id
    if _cached_ipn_id:
        return _cached_ipn_id
    register_ipn(ipn_url)
    return _cached_ipn_id


# ── 3. Submit Order ────────────────────────────────────────
def submit_order(*, merchant_reference, amount, description, callback_url, ipn_id, customer):
    body = {
        "id": merchant_reference,
        "currency": "UGX",                # ← Change to your currency
        "amount": amount,
        "description": description[:100],
        "callback_url": callback_url,
        "redirect_mode": "TOP_WINDOW",
        "notification_id": ipn_id,
        "branch": "Main Branch",
        "billing_address": {
            "email_address": customer.get("email", ""),
            "phone_number": customer.get("phone", ""),
            "country_code": "UG",          # ← Change to your country
            "first_name": customer.get("first_name", ""),
            "last_name": customer.get("last_name", ""),
            "line_1": customer.get("address", ""),
            "city": customer.get("city", ""),
            "state": "", "postal_code": "", "zip_code": "",
        },
    }
    resp = requests.post(f"{PESAPAL_API_URL}/api/Transactions/SubmitOrderRequest",
        headers=_headers(), json=body)
    data = resp.json()
    if data.get("error") or data.get("status") != "200":
        raise Exception(data.get("message", "Order submission failed"))
    return {
        "order_tracking_id": data["order_tracking_id"],
        "merchant_reference": data["merchant_reference"],
        "redirect_url": data["redirect_url"],
    }


# ── 4. Transaction Status ─────────────────────────────────
def get_transaction_status(order_tracking_id):
    resp = requests.get(
        f"{PESAPAL_API_URL}/api/Transactions/GetTransactionStatus",
        headers=_headers(),
        params={"orderTrackingId": order_tracking_id},
    )
    data = resp.json()
    return {
        "status_code": data.get("status_code"),       # 0=Pending, 1=Paid, 2=Failed, 3=Reversed
        "status_description": data.get("payment_status_description"),
        "payment_method": data.get("payment_method"),
        "confirmation_code": data.get("confirmation_code"),
        "merchant_reference": data.get("merchant_reference"),
        "amount": data.get("amount"),
        "currency": data.get("currency"),
        "payment_account": data.get("payment_account"),
    }


# ── 5. Refund ──────────────────────────────────────────────
def refund(confirmation_code, amount, username, remarks="Refund"):
    resp = requests.post(f"{PESAPAL_API_URL}/api/Transactions/RefundRequest",
        headers=_headers(),
        json={
            "confirmation_code": confirmation_code,
            "amount": str(amount),
            "username": username,
            "remarks": remarks,
        })
    data = resp.json()
    if data.get("status") != "200":
        raise Exception(data.get("message", "Refund failed"))
    return data
```

#### Flask Route Example

```python
from flask import Flask, request, jsonify, redirect
from pesapal_service import get_ipn_id, submit_order, get_transaction_status

app = Flask(__name__)

@app.route("/api/pesapal/initiate", methods=["POST"])
def initiate_payment():
    data = request.json
    # 1. Create order in your DB (status=PENDING)
    order = create_your_order(data)

    # 2. Get IPN ID
    base_url = request.host_url.rstrip("/")
    ipn_id = get_ipn_id(f"{base_url}/api/pesapal/ipn")

    # 3. Submit to Pesapal
    names = data["fullName"].split()
    result = submit_order(
        merchant_reference=order["order_number"],
        amount=order["total"],
        description=f"Order {order['order_number']}",
        callback_url=f"{base_url}/payment.html",
        ipn_id=ipn_id,
        customer={
            "email": data["email"],
            "phone": data["phone"],
            "first_name": names[0],
            "last_name": " ".join(names[1:]),
            "city": data.get("city", ""),
            "address": data.get("address", ""),
        },
    )
    return jsonify({"orderNumber": order["order_number"], "redirectUrl": result["redirect_url"]})


@app.route("/api/pesapal/ipn")
def pesapal_ipn():
    tracking_id = request.args.get("OrderTrackingId")
    merchant_ref = request.args.get("OrderMerchantReference")
    if tracking_id:
        status = get_transaction_status(tracking_id)
        if status["status_code"] == 1:
            update_order_status(merchant_ref, "PAID")
    return jsonify({"orderNotificationType": "IPNCHANGE", "orderTrackingId": tracking_id or "",
                     "orderMerchantReference": merchant_ref or "", "status": 200})


@app.route("/api/pesapal/status/<tracking_id>")
def payment_status(tracking_id):
    return jsonify(get_transaction_status(tracking_id))
```

#### Django View Example

```python
# views.py
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .pesapal_service import get_ipn_id, submit_order, get_transaction_status

@csrf_exempt
def initiate_payment(request):
    data = json.loads(request.body)
    order = create_your_order(data)
    base_url = f"{request.scheme}://{request.get_host()}"
    ipn_id = get_ipn_id(f"{base_url}/api/pesapal/ipn")
    names = data["fullName"].split()
    result = submit_order(
        merchant_reference=order.order_number,
        amount=order.total,
        description=f"Order {order.order_number}",
        callback_url=f"{base_url}/payment/",
        ipn_id=ipn_id,
        customer={"email": data["email"], "phone": data["phone"],
                  "first_name": names[0], "last_name": " ".join(names[1:])},
    )
    return JsonResponse({"orderNumber": order.order_number, "redirectUrl": result["redirect_url"]})

def pesapal_ipn(request):
    tracking_id = request.GET.get("OrderTrackingId", "")
    merchant_ref = request.GET.get("OrderMerchantReference", "")
    if tracking_id:
        status = get_transaction_status(tracking_id)
        if status["status_code"] == 1:
            Order.objects.filter(order_number=merchant_ref).update(status="PAID")
    return JsonResponse({"orderNotificationType": "IPNCHANGE", "orderTrackingId": tracking_id,
                         "orderMerchantReference": merchant_ref, "status": 200})

def payment_status(request, tracking_id):
    return JsonResponse(get_transaction_status(tracking_id))
```

---

### PHP / Laravel

```php
<?php
/**
 * PesapalService.php — Pesapal API 3.0 for PHP
 * Works with Laravel, Symfony, plain PHP.
 * No external packages needed (uses cURL).
 */

class PesapalService
{
    private string $apiUrl;
    private string $consumerKey;
    private string $consumerSecret;
    private static ?string $cachedToken = null;
    private static int $tokenExpiry = 0;
    private static ?string $cachedIpnId = null;

    public function __construct()
    {
        $this->apiUrl         = env('PESAPAL_API_URL', 'https://cybqa.pesapal.com/pesapalv3');
        $this->consumerKey    = env('PESAPAL_CONSUMER_KEY', '');
        $this->consumerSecret = env('PESAPAL_CONSUMER_SECRET', '');
    }

    // ── Auth ──────────────────────────────────────────────
    public function getAccessToken(): string
    {
        if (self::$cachedToken && time() < self::$tokenExpiry) {
            return self::$cachedToken;
        }

        $data = $this->post('/api/Auth/RequestToken', [
            'consumer_key'    => $this->consumerKey,
            'consumer_secret' => $this->consumerSecret,
        ], false);

        if (($data['status'] ?? '') !== '200') {
            throw new \Exception($data['message'] ?? 'Pesapal auth failed');
        }

        self::$cachedToken  = $data['token'];
        self::$tokenExpiry  = time() + 270;
        return self::$cachedToken;
    }

    // ── IPN Registration ──────────────────────────────────
    public function getIpnId(string $ipnUrl): string
    {
        if (self::$cachedIpnId) return self::$cachedIpnId;

        $data = $this->post('/api/URLSetup/RegisterIPN', [
            'url'                   => $ipnUrl,
            'ipn_notification_type' => 'GET',
        ]);

        self::$cachedIpnId = $data['ipn_id'];
        return self::$cachedIpnId;
    }

    // ── Submit Order ──────────────────────────────────────
    public function submitOrder(array $params): array
    {
        $data = $this->post('/api/Transactions/SubmitOrderRequest', [
            'id'              => $params['merchant_reference'],
            'currency'        => $params['currency'] ?? 'UGX',
            'amount'          => $params['amount'],
            'description'     => substr($params['description'] ?? 'Order', 0, 100),
            'callback_url'    => $params['callback_url'],
            'redirect_mode'   => 'TOP_WINDOW',
            'notification_id' => $params['ipn_id'],
            'branch'          => 'Main Branch',
            'billing_address' => $params['billing_address'] ?? [],
        ]);

        if (($data['status'] ?? '') !== '200') {
            throw new \Exception($data['message'] ?? 'Order submission failed');
        }

        return [
            'order_tracking_id'  => $data['order_tracking_id'],
            'merchant_reference' => $data['merchant_reference'],
            'redirect_url'       => $data['redirect_url'],
        ];
    }

    // ── Transaction Status ────────────────────────────────
    public function getTransactionStatus(string $trackingId): array
    {
        $data = $this->get("/api/Transactions/GetTransactionStatus?orderTrackingId={$trackingId}");
        return [
            'status_code'        => $data['status_code'] ?? 0,
            'status_description' => $data['payment_status_description'] ?? '',
            'confirmation_code'  => $data['confirmation_code'] ?? '',
            'payment_method'     => $data['payment_method'] ?? '',
            'merchant_reference' => $data['merchant_reference'] ?? '',
            'amount'             => $data['amount'] ?? 0,
        ];
    }

    // ── HTTP helpers ──────────────────────────────────────
    private function post(string $path, array $body, bool $auth = true): array
    {
        $headers = ['Accept: application/json', 'Content-Type: application/json'];
        if ($auth) $headers[] = 'Authorization: Bearer ' . $this->getAccessToken();

        $ch = curl_init($this->apiUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true) ?? [];
    }

    private function get(string $path): array
    {
        $ch = curl_init($this->apiUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'Authorization: Bearer ' . $this->getAccessToken(),
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true) ?? [];
    }
}
```

#### Laravel Controller Example

```php
<?php
// app/Http/Controllers/PesapalController.php

namespace App\Http\Controllers;

use App\Services\PesapalService;
use Illuminate\Http\Request;

class PesapalController extends Controller
{
    public function initiate(Request $request, PesapalService $pesapal)
    {
        $validated = $request->validate([
            'fullName' => 'required|string',
            'email'    => 'required|email',
            'phone'    => 'required|string',
            'items'    => 'required|array|min:1',
        ]);

        // 1. Create order in your DB
        $order = Order::createFromCart($validated);

        // 2. Get IPN ID
        $baseUrl = $request->getSchemeAndHttpHost();
        $ipnId   = $pesapal->getIpnId("{$baseUrl}/api/pesapal/ipn");

        // 3. Submit to Pesapal
        $names  = explode(' ', $validated['fullName'], 2);
        $result = $pesapal->submitOrder([
            'merchant_reference' => $order->order_number,
            'amount'             => $order->total,
            'description'        => "Order {$order->order_number}",
            'callback_url'       => "{$baseUrl}/payment",
            'ipn_id'             => $ipnId,
            'billing_address'    => [
                'email_address' => $validated['email'],
                'phone_number'  => $validated['phone'],
                'country_code'  => 'UG',
                'first_name'    => $names[0] ?? '',
                'last_name'     => $names[1] ?? '',
            ],
        ]);

        $order->update(['pesapal_tracking_id' => $result['order_tracking_id']]);

        return response()->json([
            'orderNumber' => $order->order_number,
            'redirectUrl' => $result['redirect_url'],
        ]);
    }

    public function ipn(Request $request, PesapalService $pesapal)
    {
        $trackingId  = $request->query('OrderTrackingId', '');
        $merchantRef = $request->query('OrderMerchantReference', '');

        if ($trackingId) {
            $status = $pesapal->getTransactionStatus($trackingId);
            if (($status['status_code'] ?? 0) === 1) {
                Order::where('order_number', $merchantRef)->update(['status' => 'PAID']);
            }
        }

        return response()->json([
            'orderNotificationType' => 'IPNCHANGE',
            'orderTrackingId'       => $trackingId,
            'orderMerchantReference'=> $merchantRef,
            'status'                => 200,
        ]);
    }

    public function status(string $trackingId, PesapalService $pesapal)
    {
        return response()->json($pesapal->getTransactionStatus($trackingId));
    }
}
```

```php
// routes/api.php
Route::post('pesapal/initiate', [PesapalController::class, 'initiate']);
Route::get('pesapal/ipn', [PesapalController::class, 'ipn']);
Route::get('pesapal/status/{trackingId}', [PesapalController::class, 'status']);
```

---

### Java / Spring Boot

```java
/**
 * PesapalService.java — Pesapal API 3.0 for Java
 * Uses Spring's RestTemplate. Works with Spring Boot 2.x/3.x.
 */
package com.yourapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class PesapalService {

    @Value("${pesapal.api-url:https://cybqa.pesapal.com/pesapalv3}")
    private String apiUrl;

    @Value("${pesapal.consumer-key:}")
    private String consumerKey;

    @Value("${pesapal.consumer-secret:}")
    private String consumerSecret;

    private String cachedToken;
    private long tokenExpiry;
    private String cachedIpnId;

    private final RestTemplate rest = new RestTemplate();

    // ── Auth ──────────────────────────────────────────────
    public String getAccessToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiry) {
            return cachedToken;
        }

        Map<String, String> body = Map.of(
            "consumer_key", consumerKey,
            "consumer_secret", consumerSecret
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        @SuppressWarnings("unchecked")
        Map<String, Object> data = rest.postForObject(
            apiUrl + "/api/Auth/RequestToken", request, Map.class);

        if (!"200".equals(data.get("status"))) {
            throw new RuntimeException((String) data.getOrDefault("message", "Auth failed"));
        }

        cachedToken = (String) data.get("token");
        tokenExpiry = System.currentTimeMillis() + 270_000; // 4.5 min
        return cachedToken;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(getAccessToken());
        return h;
    }

    // ── IPN ───────────────────────────────────────────────
    public String getIpnId(String ipnUrl) {
        if (cachedIpnId != null) return cachedIpnId;

        Map<String, String> body = Map.of("url", ipnUrl, "ipn_notification_type", "GET");
        HttpEntity<Map<String, String>> req = new HttpEntity<>(body, authHeaders());

        @SuppressWarnings("unchecked")
        Map<String, Object> data = rest.postForObject(
            apiUrl + "/api/URLSetup/RegisterIPN", req, Map.class);

        cachedIpnId = (String) data.get("ipn_id");
        return cachedIpnId;
    }

    // ── Submit Order ──────────────────────────────────────
    public Map<String, String> submitOrder(String merchantRef, int amount, String description,
                                            String callbackUrl, String ipnId,
                                            Map<String, String> customer) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", merchantRef);
        body.put("currency", "UGX");
        body.put("amount", amount);
        body.put("description", description.substring(0, Math.min(description.length(), 100)));
        body.put("callback_url", callbackUrl);
        body.put("redirect_mode", "TOP_WINDOW");
        body.put("notification_id", ipnId);
        body.put("branch", "Main Branch");
        body.put("billing_address", Map.of(
            "email_address", customer.getOrDefault("email", ""),
            "phone_number", customer.getOrDefault("phone", ""),
            "country_code", "UG",
            "first_name", customer.getOrDefault("firstName", ""),
            "last_name", customer.getOrDefault("lastName", "")
        ));

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, authHeaders());

        @SuppressWarnings("unchecked")
        Map<String, Object> data = rest.postForObject(
            apiUrl + "/api/Transactions/SubmitOrderRequest", req, Map.class);

        return Map.of(
            "orderTrackingId", (String) data.get("order_tracking_id"),
            "redirectUrl", (String) data.get("redirect_url")
        );
    }

    // ── Status ────────────────────────────────────────────
    public Map<String, Object> getTransactionStatus(String trackingId) {
        HttpEntity<?> req = new HttpEntity<>(authHeaders());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = rest.exchange(
            apiUrl + "/api/Transactions/GetTransactionStatus?orderTrackingId=" + trackingId,
            HttpMethod.GET, req, Map.class).getBody();

        return Map.of(
            "statusCode", data.getOrDefault("status_code", 0),
            "statusDescription", data.getOrDefault("payment_status_description", ""),
            "confirmationCode", data.getOrDefault("confirmation_code", ""),
            "merchantReference", data.getOrDefault("merchant_reference", "")
        );
    }
}
```

```yaml
# application.yml
pesapal:
  api-url: https://cybqa.pesapal.com/pesapalv3
  consumer-key: ${PESAPAL_CONSUMER_KEY}
  consumer-secret: ${PESAPAL_CONSUMER_SECRET}
```

---

### C# / ASP.NET

```csharp
// Services/PesapalService.cs — Pesapal API 3.0 for .NET
using System.Net.Http.Headers;
using System.Text.Json;

public class PesapalService
{
    private readonly HttpClient _http;
    private readonly string _apiUrl;
    private readonly string _consumerKey;
    private readonly string _consumerSecret;
    private string? _cachedToken;
    private DateTime _tokenExpiry;
    private string? _cachedIpnId;

    public PesapalService(IConfiguration config, HttpClient http)
    {
        _http           = http;
        _apiUrl         = config["Pesapal:ApiUrl"] ?? "https://cybqa.pesapal.com/pesapalv3";
        _consumerKey    = config["Pesapal:ConsumerKey"] ?? "";
        _consumerSecret = config["Pesapal:ConsumerSecret"] ?? "";
    }

    // ── Auth ──────────────────────────────────────────────
    public async Task<string> GetAccessTokenAsync()
    {
        if (_cachedToken != null && DateTime.UtcNow < _tokenExpiry)
            return _cachedToken;

        var resp = await _http.PostAsJsonAsync($"{_apiUrl}/api/Auth/RequestToken", new
        {
            consumer_key = _consumerKey,
            consumer_secret = _consumerSecret
        });
        var data = await resp.Content.ReadFromJsonAsync<JsonElement>();

        if (data.GetProperty("status").GetString() != "200")
            throw new Exception(data.GetProperty("message").GetString() ?? "Auth failed");

        _cachedToken = data.GetProperty("token").GetString()!;
        _tokenExpiry = DateTime.UtcNow.AddMinutes(4.5);
        return _cachedToken;
    }

    private async Task SetAuthHeaderAsync()
    {
        var token = await GetAccessTokenAsync();
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    // ── IPN ───────────────────────────────────────────────
    public async Task<string> GetIpnIdAsync(string ipnUrl)
    {
        if (_cachedIpnId != null) return _cachedIpnId;
        await SetAuthHeaderAsync();

        var resp = await _http.PostAsJsonAsync($"{_apiUrl}/api/URLSetup/RegisterIPN",
            new { url = ipnUrl, ipn_notification_type = "GET" });
        var data = await resp.Content.ReadFromJsonAsync<JsonElement>();

        _cachedIpnId = data.GetProperty("ipn_id").GetString()!;
        return _cachedIpnId;
    }

    // ── Submit Order ──────────────────────────────────────
    public async Task<(string TrackingId, string RedirectUrl)> SubmitOrderAsync(
        string merchantRef, int amount, string description,
        string callbackUrl, string ipnId, Dictionary<string, string> customer)
    {
        await SetAuthHeaderAsync();
        var resp = await _http.PostAsJsonAsync($"{_apiUrl}/api/Transactions/SubmitOrderRequest", new
        {
            id = merchantRef,
            currency = "UGX",
            amount,
            description = description[..Math.Min(description.Length, 100)],
            callback_url = callbackUrl,
            redirect_mode = "TOP_WINDOW",
            notification_id = ipnId,
            branch = "Main Branch",
            billing_address = new
            {
                email_address = customer.GetValueOrDefault("email", ""),
                phone_number = customer.GetValueOrDefault("phone", ""),
                country_code = "UG",
                first_name = customer.GetValueOrDefault("firstName", ""),
                last_name = customer.GetValueOrDefault("lastName", ""),
            }
        });
        var data = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return (
            data.GetProperty("order_tracking_id").GetString()!,
            data.GetProperty("redirect_url").GetString()!
        );
    }

    // ── Status ────────────────────────────────────────────
    public async Task<PesapalStatus> GetStatusAsync(string trackingId)
    {
        await SetAuthHeaderAsync();
        var resp = await _http.GetFromJsonAsync<JsonElement>(
            $"{_apiUrl}/api/Transactions/GetTransactionStatus?orderTrackingId={trackingId}");
        return new PesapalStatus
        {
            StatusCode        = resp.GetProperty("status_code").GetInt32(),
            StatusDescription = resp.GetProperty("payment_status_description").GetString() ?? "",
            ConfirmationCode  = resp.GetProperty("confirmation_code").GetString() ?? "",
            MerchantReference = resp.GetProperty("merchant_reference").GetString() ?? "",
        };
    }
}

public record PesapalStatus
{
    public int StatusCode { get; init; }
    public string StatusDescription { get; init; } = "";
    public string ConfirmationCode { get; init; } = "";
    public string MerchantReference { get; init; } = "";
}
```

```json
// appsettings.json
{
  "Pesapal": {
    "ApiUrl": "https://cybqa.pesapal.com/pesapalv3",
    "ConsumerKey": "your-key",
    "ConsumerSecret": "your-secret"
  }
}
```

```csharp
// Program.cs — register the service
builder.Services.AddHttpClient<PesapalService>();
```

---

## 5. Backend: Routes / Controllers

### Node.js / Express

Create `routes/pesapal.js`:

```js
const express = require("express");
const {
  getIpnId,
  submitOrderRequest,
  getTransactionStatus
} = require("../services/pesapal");

const router = express.Router();

/**
 * Helper: build the base URL from the request
 * (handles Railway/Heroku proxies with x-forwarded-* headers)
 */
function buildBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host  = req.headers["x-forwarded-host"]  || req.get("host");
  return `${proto}://${host}`;
}

/* ─── POST /initiate ──────────────────────────────────────── */
// Called when customer clicks "Pay" — creates order + returns Pesapal URL
router.post("/initiate", async (req, res, next) => {
  try {
    const { fullName, email, phone, city, address, items } = req.body;

    // 1. Validate input
    if (!items || !items.length) return res.status(400).json({ error: "Cart is empty." });
    if (!fullName || !email || !phone) return res.status(400).json({ error: "Customer details required." });

    // 2. Create your order in your database (status = PENDING)
    //    Replace this with YOUR order creation logic:
    const order = await createOrder({ fullName, email, phone, city, address, items });

    // 3. Build URLs
    const baseUrl     = buildBaseUrl(req);
    const ipnUrl      = `${baseUrl}/api/pesapal/ipn`;       // Your IPN endpoint
    const callbackUrl = `${baseUrl}/payment.html`;           // Where customer returns

    // 4. Register IPN (cached — only calls Pesapal on first request)
    const ipnId = await getIpnId(ipnUrl);

    // 5. Submit to Pesapal
    const nameParts = fullName.trim().split(/\s+/);
    const result = await submitOrderRequest({
      merchantReference: order.orderNumber,      // YOUR order ID
      amount: order.total,                       // Payment amount
      description: `Order ${order.orderNumber}`,
      callbackUrl,
      ipnId,
      customer: {
        email,
        phone,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        address: address || "",
        city: city || ""
      }
    });

    // 6. Save Pesapal tracking ID on your order
    await saveTrackingId(order.orderNumber, result.orderTrackingId);

    // 7. Return the redirect URL to the frontend
    res.json({
      orderNumber: order.orderNumber,
      orderTrackingId: result.orderTrackingId,
      redirectUrl: result.redirectUrl              // ← Frontend loads this
    });
  } catch (err) {
    next(err);
  }
});

/* ─── GET /ipn ────────────────────────────────────────────── */
// Pesapal calls this URL server-to-server when payment status changes
// MUST ALWAYS respond 200 — even on errors!
router.get("/ipn", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

  try {
    if (OrderTrackingId) {
      const status = await getTransactionStatus(OrderTrackingId);

      // Map Pesapal status to your order status
      let orderStatus = "PENDING";
      if (status.statusCode === 1) orderStatus = "PAID";
      if (status.statusCode === 2 || status.statusCode === 3) orderStatus = "CANCELLED";

      // Update your order
      if (OrderMerchantReference) {
        await updateOrderStatus(OrderMerchantReference, orderStatus);
        if (status.confirmationCode) {
          await saveConfirmationCode(OrderMerchantReference, status.confirmationCode);
        }
      }
    }
  } catch (_) {
    // Silently handle errors — must always respond 200
  }

  // REQUIRED: Acknowledge to Pesapal
  res.json({
    orderNotificationType: OrderNotificationType || "IPNCHANGE",
    orderTrackingId: OrderTrackingId || "",
    orderMerchantReference: OrderMerchantReference || "",
    status: 200
  });
});

/* ─── GET /status/:trackingId ─────────────────────────────── */
// Frontend calls this after Pesapal redirects back, to verify payment
router.get("/status/:trackingId", async (req, res, next) => {
  try {
    const status = await getTransactionStatus(req.params.trackingId);

    // Also update your order with the latest status
    if (status.merchantReference) {
      let orderStatus = "PENDING";
      if (status.statusCode === 1) orderStatus = "PAID";
      if (status.statusCode === 2 || status.statusCode === 3) orderStatus = "CANCELLED";
      await updateOrderStatus(status.merchantReference, orderStatus);
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

### Mount the routes in your app:

```js
// app.js
const pesapalRouter = require("./routes/pesapal");
app.use("/api/pesapal", pesapalRouter);
```

---

## 6. Frontend: Payment Page

### Plain HTML + CSS

Minimal payment page with an iframe container:

```html
<section>
  <h2>Pay Securely via Pesapal</h2>

  <!-- Customer info + order summary rendered by JS -->
  <p id="payment-customer"></p>
  <div id="payment-summary"></div>

  <!-- Pesapal iframe: hidden until payment initiated -->
  <div id="pesapal-container" style="display:none;">
    <iframe
      id="pesapal-iframe"
      title="Pesapal Secure Payment"
      style="width:100%; height:600px; border:none; border-radius:12px;"
      allowfullscreen>
    </iframe>
  </div>

  <button id="complete-payment" type="button">Pay with Pesapal</button>
  <p id="payment-message"></p>
</section>
```

### CSS for the iframe:

```css
.pesapal-embed {
  margin: 1.5rem 0;
}
.pesapal-embed iframe {
  width: 100%;
  min-height: 600px;
  border: none;
  border-radius: 12px;
  background: #f9fafb;
}
```

---

## 7. Frontend: JavaScript

### Vanilla JS (works with any HTML page)

Two functions handle the entire client-side flow:

### 7a. `renderPaymentPage()` — Handle Pesapal callback

When Pesapal redirects back, the URL contains `?OrderTrackingId=xxx&OrderMerchantReference=yyy`. Detect and verify:

```js
function renderPaymentPage() {
  const payButton         = document.getElementById("complete-payment");
  const message           = document.getElementById("payment-message");
  const pesapalContainer  = document.getElementById("pesapal-container");

  // Check if Pesapal redirected back with tracking params
  const params     = new URLSearchParams(window.location.search);
  const trackingId = params.get("OrderTrackingId");
  const merchantRef = params.get("OrderMerchantReference");

  if (trackingId && merchantRef) {
    // Pesapal sent the customer back — verify payment
    message.textContent = "Verifying your payment...";
    payButton.style.display = "none";
    if (pesapalContainer) pesapalContainer.style.display = "none";

    fetch(`/api/pesapal/status/${encodeURIComponent(trackingId)}`)
      .then(res => res.json())
      .then(status => {
        if (status.statusCode === 1) {
          // PAID — redirect to success page
          window.location.href = `/success.html?ref=${encodeURIComponent(merchantRef)}`;
        } else {
          // Not paid — let them retry
          message.textContent = `Payment ${status.statusDescription || "not completed"}. Try again.`;
          payButton.style.display = "";
          payButton.textContent = "Retry Payment";
        }
      })
      .catch(() => {
        // If status check fails, still redirect (IPN will confirm later)
        window.location.href = `/success.html?ref=${encodeURIComponent(merchantRef)}`;
      });
    return;
  }

  // Normal page load — show order summary + pay button
  // ... render your cart summary here ...
  payButton.addEventListener("click", submitOrder);
}
```

### 7b. `submitOrder()` — Initiate payment

```js
async function submitOrder() {
  const payButton        = document.getElementById("complete-payment");
  const message          = document.getElementById("payment-message");
  const pesapalContainer = document.getElementById("pesapal-container");
  const pesapalIframe    = document.getElementById("pesapal-iframe");

  payButton.disabled = true;
  message.textContent = "Connecting to Pesapal...";

  try {
    // Call your backend to create order + get Pesapal redirect URL
    const res = await fetch("/api/pesapal/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+256700000000",
        city: "Kampala",
        address: "Plot 1, Main St",
        items: [{ id: "product-1", quantity: 2 }]
      })
    });
    const payload = await res.json();

    if (payload.redirectUrl) {
      // OPTION A: Load in iframe (seamless — customer stays on your page)
      if (pesapalContainer && pesapalIframe) {
        pesapalIframe.src = payload.redirectUrl;
        pesapalContainer.style.display = "block";
        payButton.style.display = "none";
        message.textContent = "Complete your payment below.";
      }
      // OPTION B: Full redirect (simpler)
      else {
        window.location.href = payload.redirectUrl;
      }
    }
  } catch (error) {
    message.textContent = "Payment service unavailable. Please try again.";
    payButton.disabled = false;
  }
}
```

---

### React / Next.js

```tsx
// components/PesapalPayment.tsx
"use client"; // Next.js App Router

import { useState, useRef } from "react";

interface PesapalPaymentProps {
  orderData: {
    fullName: string;
    email: string;
    phone: string;
    items: { id: string; name: string; price: number; quantity: number }[];
    total: number;
  };
  onSuccess?: (trackingId: string) => void;
  onError?: (error: string) => void;
}

export default function PesapalPayment({ orderData, onSuccess, onError }: PesapalPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [message, setMessage] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const initiatePayment = async () => {
    setLoading(true);
    setMessage("");
    try {
      const resp = await fetch("/api/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || "Payment initiation failed");

      setIframeSrc(data.redirectUrl);
      setShowIframe(true);

      // Poll for status
      pollingRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(
            `/api/pesapal/status/${data.orderTrackingId || data.orderNumber}`
          );
          const status = await statusResp.json();
          if (status.status_code === 1) {
            clearInterval(pollingRef.current!);
            setShowIframe(false);
            setMessage("Payment successful!");
            onSuccess?.(data.orderTrackingId);
          } else if (status.status_code === 2) {
            clearInterval(pollingRef.current!);
            setShowIframe(false);
            setMessage("Payment failed. Please try again.");
            onError?.("Payment failed");
          }
        } catch { /* keep polling */ }
      }, 5000);
    } catch (err: any) {
      setMessage(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clean up polling on unmount
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    });
  }

  return (
    <div className="pesapal-payment">
      {!showIframe && (
        <button onClick={initiatePayment} disabled={loading}>
          {loading ? "Processing..." : "Pay with Pesapal"}
        </button>
      )}

      {showIframe && (
        <iframe
          src={iframeSrc}
          title="Pesapal Secure Payment"
          style={{ width: "100%", height: "600px", border: "none", borderRadius: "12px" }}
          allowFullScreen
        />
      )}

      {message && <p className={message.includes("successful") ? "success" : "error"}>{message}</p>}
    </div>
  );
}
```

```tsx
// Usage in a page:
import PesapalPayment from "@/components/PesapalPayment";

export default function CheckoutPage() {
  return (
    <PesapalPayment
      orderData={{
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+256700000000",
        items: [{ id: "1", name: "Widget", price: 50000, quantity: 2 }],
        total: 100000,
      }}
      onSuccess={(trackingId) => console.log("Paid!", trackingId)}
      onError={(err) => console.error(err)}
    />
  );
}
```

---

### Flutter / Dart

```dart
// lib/services/pesapal_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class PesapalService {
  static const String _apiUrl = 'https://cybqa.pesapal.com/pesapalv3';
  // ⚠ SECURITY: Never store secrets in the client app!
  // Call YOUR backend API, which then calls Pesapal.
  // This example shows direct calls for learning only.

  final String _backendUrl;  // e.g. https://yoursite.com/api
  PesapalService(this._backendUrl);

  /// Call your backend to initiate payment
  Future<Map<String, dynamic>> initiatePayment({
    required String fullName,
    required String email,
    required String phone,
    required List<Map<String, dynamic>> items,
    required int total,
  }) async {
    final resp = await http.post(
      Uri.parse('$_backendUrl/pesapal/initiate'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'items': items,
        'total': total,
      }),
    );
    if (resp.statusCode != 200) {
      throw Exception('Payment initiation failed: ${resp.body}');
    }
    return jsonDecode(resp.body);
  }

  /// Poll payment status from your backend
  Future<Map<String, dynamic>> checkStatus(String trackingId) async {
    final resp = await http.get(
      Uri.parse('$_backendUrl/pesapal/status/$trackingId'),
    );
    return jsonDecode(resp.body);
  }
}
```

```dart
// lib/screens/payment_screen.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/pesapal_service.dart';

class PaymentScreen extends StatefulWidget {
  final Map<String, dynamic> orderData;
  const PaymentScreen({super.key, required this.orderData});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _pesapal = PesapalService('https://yoursite.com/api');
  bool _loading = true;
  String? _redirectUrl;
  String? _trackingId;
  String _message = '';

  @override
  void initState() {
    super.initState();
    _initPayment();
  }

  Future<void> _initPayment() async {
    try {
      final result = await _pesapal.initiatePayment(
        fullName: widget.orderData['fullName'],
        email: widget.orderData['email'],
        phone: widget.orderData['phone'],
        items: List<Map<String, dynamic>>.from(widget.orderData['items']),
        total: widget.orderData['total'],
      );
      setState(() {
        _redirectUrl = result['redirectUrl'];
        _trackingId = result['orderTrackingId'] ?? result['orderNumber'];
        _loading = false;
      });
      _pollStatus();
    } catch (e) {
      setState(() { _message = e.toString(); _loading = false; });
    }
  }

  Future<void> _pollStatus() async {
    if (_trackingId == null) return;
    while (mounted) {
      await Future.delayed(const Duration(seconds: 5));
      try {
        final status = await _pesapal.checkStatus(_trackingId!);
        if (status['status_code'] == 1) {
          if (mounted) {
            setState(() => _message = 'Payment successful!');
            // Navigate to success screen
            Navigator.pushReplacementNamed(context, '/order-success');
          }
          return;
        } else if (status['status_code'] == 2) {
          if (mounted) setState(() => _message = 'Payment failed.');
          return;
        }
      } catch (_) { /* keep polling */ }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pay with Pesapal')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _redirectUrl != null
              ? WebViewWidget(
                  controller: WebViewController()
                    ..setJavaScriptMode(JavaScriptMode.unrestricted)
                    ..loadRequest(Uri.parse(_redirectUrl!)),
                )
              : Center(child: Text(_message, style: const TextStyle(fontSize: 18))),
    );
  }
}
```

```yaml
# pubspec.yaml — add these dependencies:
dependencies:
  http: ^1.2.0
  webview_flutter: ^4.10.0
```

---

## 8. IPN (Instant Payment Notification)

### How it works:
1. You register your IPN URL with Pesapal: `https://yoursite.com/api/pesapal/ipn`
2. When payment status changes, Pesapal sends a **GET** request to your IPN URL
3. You must **always respond with status 200** — even if you have errors
4. The IPN contains `OrderTrackingId` and `OrderMerchantReference` as query params
5. Use those to call `getTransactionStatus()` and update your order

### IPN Response Format (required):

```json
{
  "orderNotificationType": "IPNCHANGE",
  "orderTrackingId": "xxx",
  "orderMerchantReference": "yyy",
  "status": 200
}
```

### Why IPN matters:
- The customer might close the browser before the redirect completes
- The iframe might fail to redirect properly
- IPN is the **reliable** server-to-server confirmation
- Always trust IPN over frontend status checks

---

## 9. Refunds & Cancellations

### Refund (requires `confirmationCode` from a completed payment):

```js
// Backend route
router.post("/refund", requireAuth, requireAdmin, async (req, res) => {
  const { orderNumber, amount, remarks } = req.body;
  const order = await getOrder(orderNumber);

  const result = await refundRequest({
    confirmationCode: order.pesapalConfirmationCode,
    amount: amount || order.total,
    username: req.user.email,
    remarks: remarks || `Refund for ${orderNumber}`
  });

  res.json(result);
});
```

### Cancel (only works for unpaid orders):

```js
router.post("/cancel", requireAuth, async (req, res) => {
  const order = await getOrder(req.body.orderNumber);
  if (order.status === "PAID") return res.status(400).json({ error: "Cannot cancel paid order." });

  const result = await cancelOrder(order.pesapalTrackingId);
  res.json(result);
});
```

---

## 10. Sandbox vs Production

| | Sandbox | Production |
|---|---------|-----------|
| **API URL** | `https://cybqa.pesapal.com/pesapalv3` | `https://pay.pesapal.com/v3` |
| **Dashboard** | cybqa.pesapal.com | pesapal.com |
| **Test cards** | Visa: `4111111111111111` (any expiry/CVV) | Real cards |
| **Mobile Money** | Use test phone numbers from sandbox docs | Real numbers |
| **IPN** | Works with public URLs (use ngrok for local dev) | Must be HTTPS |

### Switching to production:
1. Get production credentials from pesapal.com business dashboard
2. Change `PESAPAL_API_URL` to `https://pay.pesapal.com/v3`
3. Update `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET`
4. That's it — the code is identical

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Pesapal authentication failed" | Check `CONSUMER_KEY` and `CONSUMER_SECRET` are correct |
| "IPN registration failed" | Your IPN URL must be publicly accessible (not localhost) |
| IPN not received | Use ngrok for local testing; ensure your server responds 200 |
| iframe blocked | Some browsers block third-party iframes; the redirect fallback handles this |
| Token expired mid-request | The service auto-refreshes tokens; if issues persist, clear `cachedToken` |
| "Order submission failed" | Check amount > 0, currency is valid, and billing_address has email |
| Callback not redirecting | Ensure `callback_url` is the full URL including protocol |
| Status always 0 (pending) | Payment may still be processing; check again after a few seconds |

### Quick checklist for new projects:
- [ ] Set three env vars (`PESAPAL_API_URL`, `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`)
- [ ] Copy `services/pesapal.js` into your project
- [ ] Create `/api/pesapal/initiate` route (creates order + calls Pesapal)
- [ ] Create `/api/pesapal/ipn` route (receives payment confirmations)
- [ ] Create `/api/pesapal/status/:trackingId` route (frontend verification)
- [ ] Add iframe container to your payment page
- [ ] Store `pesapalTrackingId` and `pesapalConfirmationCode` on your orders
- [ ] Test with sandbox, then swap URLs + credentials for production
