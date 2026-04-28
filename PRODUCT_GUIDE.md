# Invoice & Payment Gateway — Simple Guide

> Send professional GST invoices. Collect UPI and bank transfer payments. Track everything in one place. No Razorpay or Stripe needed.

---

## What is this?

This is a **billing and payment tool** built for Indian freelancers, consultants, and small businesses.

You create invoices, share a payment link with your client, your client pays via UPI or bank transfer, and you confirm it. That's it. Everything is tracked, emails are sent automatically, and you get a proper GST-compliant PDF for every invoice.

If you are a developer, your app can do all of this automatically using the API — no manual work needed.

---

## What problem does it solve?

Most small business owners in India do this today:

1. Make a bill in Word or Excel
2. Send it over WhatsApp or email
3. Tell the client "pay on this UPI ID"
4. Manually check their phone for the payment
5. Note it down in a register or spreadsheet

This is slow, unprofessional, and easy to lose track of.

**This tool replaces that entire workflow:**

- Generates a clean, GST-compliant invoice PDF automatically
- Sends it to your client via email with a payment link
- Shows your client a UPI QR code — they scan and pay
- Lets the client submit their transaction ID as proof
- Notifies you so you can confirm the payment
- Sends the client a payment receipt automatically

---

## Who is this for?

| Type | Example |
|---|---|
| Freelancers | Designers, developers, writers, photographers |
| Consultants | CA, lawyers, business advisors |
| Small businesses | Agencies, shops, service providers |
| Developers / SaaS builders | Anyone who wants to automate billing inside their own app |

---

## How it works — in plain English

```
You create an invoice
    → Client receives an email with a payment link
    → Client opens the link, scans the UPI QR code, and pays
    → Client enters their transaction ID (UTR) on the page
    → You see it on your dashboard and click Confirm
    → Client receives a payment receipt email
    → Invoice is marked as Paid
```

---

## Features

### For Business Owners
- Create GST invoices in seconds
- Auto-calculates subtotal, CGST, SGST, and total
- Download invoices as professional PDF files
- Share a payment link with any client — no app needed on their side
- UPI QR code on the payment page — client just scans and pays
- Bank transfer details shown if you prefer NEFT/IMPS
- Email sent to client automatically when you send the invoice
- Payment receipt emailed to client when you confirm payment
- Dashboard to track all invoices — Draft, Sent, Pending, Paid, Cancelled
- Manage multiple UPI IDs and bank accounts

### For Developers
- Full REST API — create invoices, send them, confirm payments programmatically
- API keys for secure access from your own app
- Webhooks — your app gets notified instantly when a payment is confirmed or rejected
- Rate limiting built in so the API stays stable under load
- Interactive API docs at `/docs`

---

## Plans

| Plan | Price | Invoices per month | API rate limit |
|---|---|---|---|
| Free | ₹0 | 5 | 30 requests/min |
| Starter | ₹499/month | 100 | 60 requests/min |
| Pro | ₹1499/month | Unlimited | 120 requests/min |

To upgrade, go to **Billing** in the dashboard, pick a plan, make the payment, and submit your transaction ID. Your account will be upgraded within 24 hours.

---

## Using the Dashboard (for business owners)

### Step 1 — Sign up
Go to the app, create an account with your name, email, and business name.

### Step 2 — Add your payment details
Go to **Payment Methods** and add:
- Your UPI ID (e.g. `yourname@okaxis`) — clients will see a QR code to scan
- Or your bank account details (account number, IFSC) for bank transfers

### Step 3 — Create an invoice
Go to **Invoices → New Invoice** and fill in:
- Your client's name and email
- What you did (line items) with quantity and rate
- GST rate (default 18%)
- Due date (optional)

The total is calculated automatically.

### Step 4 — Send it
Click **Send Invoice**. Your client receives an email with a payment link. The invoice status changes to **Sent**.

### Step 5 — Client pays
Your client opens the link, sees your UPI QR code, scans it, and pays. They enter their transaction ID on the page and submit. The invoice status changes to **Pending**.

### Step 6 — Confirm the payment
You get notified. Go to the invoice, check the transaction ID, and click **Confirm Payment**. The invoice is marked **Paid** and your client receives a receipt email automatically.

---

## Using the API (for developers)

If you want your own app to create and manage invoices automatically, use the API.

### Step 1 — Get an API key
Log in to the dashboard → go to **API Keys** → click **Create Key**. Copy the key (it starts with `inv_`). It is shown only once — save it securely.

### Step 2 — Create an invoice from your app

```http
POST /invoices
Authorization: Bearer inv_your_api_key_here
Content-Type: application/json

{
  "customer_name": "Rahul Sharma",
  "customer_email": "rahul@example.com",
  "line_items": [
    { "name": "Website Design", "quantity": 1, "rate": 25000 }
  ],
  "gst_rate": 18,
  "discount": 0,
  "currency": "INR"
}
```

### Step 3 — Send the invoice

```http
POST /invoices/{invoice_id}/send
Authorization: Bearer inv_your_api_key_here
```

Your client gets an email with the payment link automatically.

### Step 4 — Get notified when payment arrives (webhooks)

Register your webhook URL once:

```http
POST /webhooks/config
Authorization: Bearer inv_your_api_key_here

{ "url": "https://your-app.com/webhooks/payment" }
```

When a payment is confirmed, your URL receives:

```json
{
  "event": "payment.confirmed",
  "invoice_id": "...",
  "invoice_number": "INV-2025-0001",
  "amount": 29500.00,
  "currency": "INR",
  "customer_name": "Rahul Sharma",
  "utr": "SBIN0023456789"
}
```

Verify the webhook is genuine using the `X-Invoice-Signature` header:

```python
import hmac, hashlib

def is_valid(body: str, secret: str, signature: str) -> bool:
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### Step 5 — Confirm payment from your app (optional)

If you want to auto-confirm instead of doing it manually:

```http
POST /invoices/{invoice_id}/confirm-payment
Authorization: Bearer inv_your_api_key_here
```

---

## Setting Up (for developers running this locally)

### What you need
- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL (or use SQLite for quick local testing)
- A free [SendGrid](https://sendgrid.com) account for emails (optional for local dev)
- A free [Upstash](https://upstash.com) Redis account for caching (optional for local dev)

### Backend setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in DATABASE_URL and SECRET_KEY at minimum

# Run database migrations
alembic upgrade head

# Start the server
python run.py
```

Backend runs at `http://localhost:8000`
API docs (interactive) available at `http://localhost:8000/docs`

### Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Make sure NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Frontend runs at `http://localhost:3000`

### Minimum .env values to get started locally

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=any-long-random-string-here
APP_URL=http://localhost:3000
```

Everything else (SendGrid, Redis, Upstash) is optional — the app works without them, just without emails and caching.

---

## API Quick Reference

| Action | Method | Endpoint |
|---|---|---|
| Sign up | POST | `/auth/signup` |
| Log in | POST | `/auth/login` |
| Create invoice | POST | `/invoices` |
| List invoices | GET | `/invoices` |
| Get one invoice | GET | `/invoices/{id}` |
| Send invoice to client | POST | `/invoices/{id}/send` |
| Download PDF | GET | `/invoices/{id}/pdf` |
| Cancel invoice | DELETE | `/invoices/{id}` |
| Confirm payment | POST | `/invoices/{id}/confirm-payment` |
| Reject payment | POST | `/invoices/{id}/reject-payment` |
| List payments | GET | `/invoices/{id}/payments` |
| Add UPI method | POST | `/payment-methods/upi` |
| Add bank account | POST | `/payment-methods/bank` |
| List payment methods | GET | `/payment-methods` |
| Create API key | POST | `/keys` |
| List API keys | GET | `/keys` |
| Revoke API key | DELETE | `/keys/{id}` |
| Register webhook | POST | `/webhooks/config` |
| View webhook logs | GET | `/webhooks/deliveries` |
| View plans | GET | `/billing/plans` |
| Request plan upgrade | POST | `/billing/upgrade-request` |

Full interactive docs with request/response examples: `http://localhost:8000/docs`

---

## Tech Stack

| Part | Technology |
|---|---|
| Backend API | Python, FastAPI |
| Database | PostgreSQL / SQLite |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| PDF generation | ReportLab |
| Emails | SendGrid |
| Caching | Redis (Upstash) |
| UPI QR codes | qrcode library |
