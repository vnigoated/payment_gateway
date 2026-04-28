# API Integration Guide

> This guide is for developers who want to connect this payment gateway to their own app or website.

---

## Why use the API?

The dashboard is for you to manually create and manage invoices.
The API is for your **software to do it automatically**.

### Real example

Say you built an online coaching platform. When a student enrolls:

**Without API** — you get a notification, manually log in to the dashboard, create an invoice, send it, wait for payment, confirm it yourself. For every single student.

**With API** — the moment a student clicks Enroll, your app calls the API. Invoice is created, email is sent to student, you get notified when they pay. You never touch the dashboard. Works for 1 student or 10,000.

---

## Before you start

1. Sign up at the dashboard
2. Go to **Payment Methods** — add your UPI ID or bank account (clients need somewhere to pay)
3. Go to **API Keys** — click Create Key, copy the key starting with `inv_`

That key is your password for the API. Keep it secret. It is shown only once.

---

## How authentication works

Every API request needs your key in the header:

```
Authorization: Bearer inv_your_key_here
```

That's it. No OAuth, no tokens to refresh.

---

## The core integration — 4 steps

---

### Step 1 — Create an invoice

Call this from your backend the moment a customer needs to pay.

**Request:**
```http
POST /invoices
Authorization: Bearer inv_your_key_here
Content-Type: application/json
```

```json
{
  "customer_name": "Rahul Sharma",
  "customer_email": "rahul@example.com",
  "customer_phone": "9876543210",
  "line_items": [
    {
      "name": "Monthly Subscription",
      "quantity": 1,
      "rate": 999
    }
  ],
  "gst_rate": 18,
  "discount": 0,
  "currency": "INR",
  "due_date": "2025-06-01",
  "notes": "Thank you for your business!"
}
```

**Response:**
```json
{
  "id": "a1b2c3d4-...",
  "invoice_number": "INV-2025-0001",
  "status": "draft",
  "subtotal": 999.0,
  "gst_amount": 179.82,
  "total": 1178.82,
  ...
}
```

Save the `id` — you will need it for the next steps.

---

### Step 2 — Send the invoice to your customer

This changes the status to **sent** and emails the customer a payment link automatically.

**Request:**
```http
POST /invoices/{invoice_id}/send
Authorization: Bearer inv_your_key_here
```

**Response:**
```json
{
  "invoice_id": "a1b2c3d4-...",
  "invoice_number": "INV-2025-0001",
  "payment_url": "https://yourapp.com/pay/a1b2c3d4-...",
  "amount": 1178.82,
  "currency": "INR",
  "status": "sent"
}
```

The `payment_url` is what your customer visits to pay. You can also put this link on your own website or app.

---

### Step 3 — Customer pays

Your customer opens the payment link. They see:
- A UPI QR code — they scan it with any UPI app (GPay, PhonePe, Paytm)
- Your bank account details — for NEFT/IMPS transfer
- A form to enter their transaction ID (UTR) after paying

Your customer submits their UTR. The invoice status changes to **pending**.

You do not need to build this page — it is already built and hosted.

---

### Step 4 — Get notified when payment arrives (webhooks)

Instead of manually checking the dashboard, set up a webhook — a URL on your server that we call the moment something happens.

#### Register your webhook URL (do this once):

```http
POST /webhooks/config
Authorization: Bearer inv_your_key_here
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/payment"
}
```

**Response:**
```json
{
  "webhook_url": "https://your-app.com/webhooks/payment",
  "webhook_secret": "whsec_abc123...",
  "note": "Store the webhook_secret securely — it will not be shown again in full."
}
```

Save the `webhook_secret`. You will use it to verify that incoming webhook calls are genuinely from this system and not from someone else.

#### What your webhook endpoint receives:

When a payment is confirmed:
```json
{
  "event": "payment.confirmed",
  "timestamp": "2025-05-01T10:30:00Z",
  "invoice_id": "a1b2c3d4-...",
  "invoice_number": "INV-2025-0001",
  "amount": 1178.82,
  "currency": "INR",
  "customer_name": "Rahul Sharma",
  "utr": "SBIN0023456789"
}
```

When a payment is rejected:
```json
{
  "event": "payment.rejected",
  "timestamp": "2025-05-01T10:35:00Z",
  "invoice_id": "a1b2c3d4-...",
  "invoice_number": "INV-2025-0001",
  "amount": 1178.82,
  "currency": "INR",
  "customer_name": "Rahul Sharma",
  "utr": "SBIN0023456789",
  "reason": "Wrong amount transferred"
}
```

#### Verify the webhook is genuine:

Every webhook call includes an `X-Invoice-Signature` header. Always check it before trusting the payload.

**Python:**
```python
import hmac
import hashlib

def is_valid_webhook(body: str, secret: str, signature: str) -> bool:
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

# In your Flask / FastAPI / Django view:
@app.post("/webhooks/payment")
async def handle_payment(request: Request):
    body = await request.body()
    sig  = request.headers.get("X-Invoice-Signature")

    if not is_valid_webhook(body.decode(), WEBHOOK_SECRET, sig):
        return {"error": "Invalid signature"}, 400

    data = await request.json()

    if data["event"] == "payment.confirmed":
        # unlock the user's account, send thank you email, etc.
        activate_subscription(data["invoice_id"])

    return {"ok": True}
```

**Node.js:**
```javascript
const crypto = require('crypto')

function isValidWebhook(body, secret, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}

// Express example
app.post('/webhooks/payment', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-invoice-signature']

  if (!isValidWebhook(req.body.toString(), WEBHOOK_SECRET, sig)) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const data = JSON.parse(req.body)

  if (data.event === 'payment.confirmed') {
    // activate subscription, send email, etc.
    activateSubscription(data.invoice_id)
  }

  res.json({ ok: true })
})
```

---

## Optional — Confirm or reject payment from your app

By default, payment confirmation is done manually from the dashboard.
If you want your backend to do it automatically (e.g. after verifying the UTR yourself):

**Confirm:**
```http
POST /invoices/{invoice_id}/confirm-payment
Authorization: Bearer inv_your_key_here
```

**Reject:**
```http
POST /invoices/{invoice_id}/reject-payment
Authorization: Bearer inv_your_key_here
Content-Type: application/json

{
  "reason": "Amount transferred was incorrect"
}
```

---

## Other useful API calls

### Download invoice as PDF
```http
GET /invoices/{invoice_id}/pdf
Authorization: Bearer inv_your_key_here
```
Returns a PDF file. Use this to store or email the PDF from your own system.

### Get a single invoice
```http
GET /invoices/{invoice_id}
Authorization: Bearer inv_your_key_here
```

### List all invoices
```http
GET /invoices
Authorization: Bearer inv_your_key_here
```

Filter by status:
```http
GET /invoices?status=pending
GET /invoices?status=paid
GET /invoices?status=sent
```

### List payments for an invoice
```http
GET /invoices/{invoice_id}/payments
Authorization: Bearer inv_your_key_here
```

### Cancel an invoice
```http
DELETE /invoices/{invoice_id}
Authorization: Bearer inv_your_key_here
```

---

## Rate limits

Your API key has a request limit based on your plan.

| Plan | Per minute | Per day |
|---|---|---|
| Free | 30 requests | 500 requests |
| Starter | 60 requests | 5,000 requests |
| Pro | 120 requests | 100,000 requests |

When you exceed the limit the API returns `HTTP 429`. Your code should handle this:

```python
import time
import requests

def create_invoice_with_retry(data, api_key, retries=3):
    for attempt in range(retries):
        res = requests.post(
            "https://yourapp.com/invoices",
            json=data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        if res.status_code == 429:
            time.sleep(2 ** attempt)  # wait 1s, 2s, 4s
            continue
        res.raise_for_status()
        return res.json()
    raise Exception("Rate limit exceeded after retries")
```

---

## Error responses

All errors follow the same format:

```json
{
  "detail": "Explanation of what went wrong"
}
```

| Status code | Meaning |
|---|---|
| 400 | Bad request — check your input |
| 401 | Missing or invalid API key |
| 402 | Free plan invoice limit reached — upgrade your plan |
| 404 | Invoice or resource not found |
| 429 | Too many requests — slow down |
| 500 | Server error — try again |

---

## Complete working example

Here is a full Python script that creates an invoice, sends it, and prints the payment link:

```python
import requests

API_KEY = "inv_your_key_here"
BASE    = "https://yourapp.com"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 1. Create invoice
invoice = requests.post(f"{BASE}/invoices", json={
    "customer_name": "Priya Mehta",
    "customer_email": "priya@example.com",
    "line_items": [
        {"name": "Logo Design", "quantity": 1, "rate": 5000},
        {"name": "Brand Guidelines", "quantity": 1, "rate": 3000},
    ],
    "gst_rate": 18,
    "discount": 500,
    "currency": "INR",
    "due_date": "2025-06-15"
}, headers=HEADERS).json()

print(f"Invoice created: {invoice['invoice_number']}")
print(f"Total: Rs. {invoice['total']}")

# 2. Send it
sent = requests.post(
    f"{BASE}/invoices/{invoice['id']}/send",
    headers=HEADERS
).json()

print(f"Payment link: {sent['payment_url']}")
# Share this link with your customer
```

Output:
```
Invoice created: INV-2025-0042
Total: Rs. 9204.00
Payment link: https://yourapp.com/pay/a1b2c3d4-...
```

---

## Summary

| Step | What happens | Your code does |
|---|---|---|
| 1 | Customer wants to pay | Call `POST /invoices` |
| 2 | Send invoice | Call `POST /invoices/{id}/send` |
| 3 | Customer pays | Nothing — payment page handles it |
| 4 | Payment confirmed | Webhook fires → your code activates account / ships order |

The full API reference with live request testing is at `http://localhost:8000/docs`
