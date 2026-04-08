# Pesapal Iframe Payment — How to Keep Payments On-Page

Load the Pesapal checkout form **inside your page** instead of navigating away or opening a new tab.

---

## The Two Requirements

### 1. Backend: Set `redirect_mode` to `"TOP_WINDOW"`

When submitting the order to Pesapal's API, include this field:

```json
{
  "id": "ORD-001",
  "currency": "UGX",
  "amount": 50000,
  "description": "Order ORD-001",
  "callback_url": "https://yoursite.com/payment.html",
  "redirect_mode": "TOP_WINDOW",
  "notification_id": "your-ipn-id",
  "billing_address": { ... }
}
```

| `redirect_mode` | Behaviour |
|---|---|
| `"TOP_WINDOW"` | Pesapal returns a URL you can load in an iframe or redirect to. After payment, Pesapal redirects to your `callback_url`. |
| `"PARENT_WINDOW"` | Pesapal posts a `window.postMessage()` to the parent frame instead of redirecting. Requires a message listener. |

**Use `TOP_WINDOW`** — it's simpler and works for both iframe and full-page redirect.

### 2. Frontend: Load the URL in an `<iframe>`, Not `window.location`

The Pesapal API returns a `redirect_url` like:
```
https://pay.pesapal.com/iframe/PesapalIframe3/Index?OrderTrackingId=abc123...
```

**What you do with this URL determines where the checkout appears:**

| Code | Result |
|---|---|
| `iframe.src = url` | Checkout loads **inside your page** (iframe) |
| `window.location.href = url` | Navigates the **entire tab** to Pesapal |
| `window.open(url)` | Opens a **new tab/popup** |

---

## Complete Implementation

### HTML — Payment Page

```html
<section class="payment-section">
  <h2>Pay Securely via Pesapal</h2>

  <!-- Order summary (populated by JS) -->
  <div id="payment-summary"></div>

  <!-- Pay button — hidden once iframe loads -->
  <button id="complete-payment" type="button">Pay with Pesapal</button>

  <!-- Pesapal iframe container — hidden until payment initiated -->
  <div id="pesapal-container" style="display: none;">
    <iframe
      id="pesapal-iframe"
      title="Pesapal Secure Payment"
      style="width: 100%; height: 600px; border: none; border-radius: 12px;"
      allowfullscreen>
    </iframe>
  </div>

  <p id="payment-message"></p>
</section>
```

### CSS

```css
#pesapal-container {
  margin-top: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
}

#pesapal-iframe {
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 600px) {
  #pesapal-iframe {
    height: 500px;
  }
}
```

### JavaScript

```js
async function initiatePayment(orderData) {
  const payButton  = document.getElementById('complete-payment');
  const container  = document.getElementById('pesapal-container');
  const iframe     = document.getElementById('pesapal-iframe');
  const message    = document.getElementById('payment-message');

  payButton.disabled = true;
  payButton.textContent = 'Processing...';
  message.textContent = '';

  try {
    // 1. Call YOUR backend (which calls Pesapal's SubmitOrderRequest)
    const resp = await fetch('/api/pesapal/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await resp.json();

    if (!resp.ok) throw new Error(data.error || 'Payment failed');

    // 2. KEY STEP: Set iframe src instead of navigating away
    iframe.src = data.redirectUrl;

    // 3. Show iframe, hide button
    container.style.display = 'block';
    payButton.style.display = 'none';

    // 4. Poll for payment completion
    pollPaymentStatus(data.orderTrackingId || data.orderNumber);

  } catch (err) {
    message.textContent = err.message;
    payButton.disabled = false;
    payButton.textContent = 'Pay with Pesapal';
  }
}


function pollPaymentStatus(trackingId) {
  const message = document.getElementById('payment-message');

  const interval = setInterval(async () => {
    try {
      const resp = await fetch(`/api/pesapal/status/${trackingId}`);
      const status = await resp.json();

      if (status.status_code === 1) {
        // PAID
        clearInterval(interval);
        message.textContent = '✓ Payment successful!';
        message.style.color = 'green';
        // Redirect to order confirmation after a brief delay
        setTimeout(() => {
          window.location.href = `/order-confirmation?ref=${trackingId}`;
        }, 2000);

      } else if (status.status_code === 2) {
        // FAILED
        clearInterval(interval);
        message.textContent = 'Payment failed. Please try again.';
        message.style.color = 'red';
        document.getElementById('complete-payment').style.display = 'block';
        document.getElementById('complete-payment').disabled = false;
      }
      // status_code 0 = still pending, keep polling
    } catch {
      // Network error — keep polling
    }
  }, 5000); // Check every 5 seconds
}


// Wire up the button
document.getElementById('complete-payment').addEventListener('click', () => {
  initiatePayment({
    fullName: '...', // from your checkout form
    email: '...',
    phone: '...',
    items: [/* cart items */],
  });
});
```

### Backend Route (Node.js / Express)

```js
// The important part: redirect_mode in the Pesapal request
router.post('/api/pesapal/initiate', async (req, res) => {
  const order = await createOrder(req.body);
  const ipnId = await pesapalService.getIpnId(`${BASE_URL}/api/pesapal/ipn`);

  const result = await pesapalService.submitOrder({
    merchantReference: order.orderNumber,
    amount: order.total,
    description: `Order ${order.orderNumber}`,
    callbackUrl: `${BASE_URL}/payment.html`,
    ipnId,
    customer: { /* ... */ },
    // ↓↓↓ THIS is what enables iframe embedding ↓↓↓
    redirectMode: 'TOP_WINDOW',
  });

  res.json({
    orderNumber: order.orderNumber,
    orderTrackingId: result.order_tracking_id,
    redirectUrl: result.redirect_url,  // ← Frontend puts this in iframe.src
  });
});
```

---

## Why Not `PARENT_WINDOW`?

`PARENT_WINDOW` mode makes Pesapal call `window.parent.postMessage(...)` after payment instead of redirecting. You'd need a message listener:

```js
window.addEventListener('message', (event) => {
  // Verify origin
  if (!event.origin.includes('pesapal.com')) return;
  const { orderTrackingId, status } = event.data;
  // Handle completion...
});
```

This is more complex and less reliable across browsers. **`TOP_WINDOW` + iframe src is the recommended approach.**

---

## Common Pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Iframe is blank/white | `redirect_url` not set or expired | Check API response; tokens expire in ~5 min |
| Checkout opens in new tab | Using `window.open(url)` | Use `iframe.src = url` instead |
| Whole page navigates to Pesapal | Using `window.location.href = url` | Use `iframe.src = url` instead |
| "Refused to display in frame" error | Pesapal blocking embedding (rare) | Ensure `redirect_mode: "TOP_WINDOW"` is set |
| Iframe too short, content cut off | Fixed CSS height too small | Use `min-height: 600px` or auto-resize |
| Mobile iframe hard to scroll | iOS iframe scrolling quirk | Add `-webkit-overflow-scrolling: touch` and wrap in a scrollable div |

---

## Fallback: Full-Page Redirect

If your environment can't use iframes (e.g., some mobile WebViews), fall back to a redirect:

```js
// Instead of iframe:
window.location.href = data.redirectUrl;

// Pesapal will redirect back to your callback_url after payment
// with ?OrderTrackingId=xxx&OrderMerchantReference=yyy in the URL
```

Then on your callback page, read the query params and check status:

```js
const params = new URLSearchParams(window.location.search);
const trackingId = params.get('OrderTrackingId');
if (trackingId) {
  const resp = await fetch(`/api/pesapal/status/${trackingId}`);
  const status = await resp.json();
  // Show result...
}
```
