# Invoice & Payment Gateway

> Send professional GST invoices. Collect UPI and bank transfer payments. Unlock paid content from your own app after payment confirmation.

## What this is

This is a billing and payment SaaS for Indian freelancers, consultants, small businesses, and app builders.

You create an account on your platform, add your bank and UPI details, and the system generates a QR-backed checkout flow for you. Customers pay using UPI or bank transfer, and your dashboard marks the invoice paid after you confirm it.

If you are a developer, you can use the API from your own website or app. The customer clicks `Proceed to Pay` on your site, your backend creates or sends the payment request, the customer receives a hosted payment page and email with a unique UPI QR code generated from your configured UPI ID, pays, and then your backend unlocks the paid content after the webhook confirms the payment.

## What problem it solves

Most businesses still do billing like this:

1. Make a bill in Word or Excel
2. Send it by WhatsApp or email
3. Tell the customer to pay on a UPI ID
4. Check the phone manually for payment
5. Update a spreadsheet

This platform replaces that manual workflow with:

- GST invoice generation
- UPI QR and bank transfer payment details
- Email delivery to the customer
- Payment proof submission using UTR
- Merchant confirmation or rejection
- Payment confirmation email
- Webhook-based access unlock for developer apps

## Who it is for

| Type | Example |
|---|---|
| Freelancers | Designers, developers, writers, photographers |
| Consultants | CA, lawyers, business advisors |
| Small businesses | Agencies, shops, service providers |
| Developers / SaaS builders | Anyone who wants to charge for access or services |

## How it works

### Merchant dashboard flow

```text
You sign up on the SaaS platform
    -> Complete a first-run onboarding screen
    -> Add bank details and UPI ID
    -> System generates your QR-backed payment identity
    -> Create an invoice
    -> Customer receives an email with a payment link and QR code
    -> Customer opens the hosted payment page
    -> Customer scans the UPI QR code or uses bank transfer details
    -> Customer submits the UTR / payment reference
    -> You review it in the dashboard
    -> You confirm or reject the payment
    -> Customer receives a confirmation email
    -> Invoice status becomes Paid
```

### Developer checkout flow

```text
Customer clicks "Proceed to Pay" on your website
    -> Your backend calls POST /checkout/create with your API key
    -> The gateway creates the invoice, stores your external order ID, and sends the payment request
    -> Customer gets a payment email and hosted payment page
    -> Customer pays using the QR code or bank transfer details tied to your account
    -> Your webhook receives payment.confirmed
    -> Your app unlocks the paid content
```

## Features

### For business owners

- Create GST invoices in seconds
- Auto-calculate subtotal, GST, and total
- Download professional PDF invoices
- Show UPI QR codes and bank transfer details
- Email the invoice and payment link to your customer
- Track invoices as Draft, Sent, Pending, Paid, and Cancelled
- Confirm or reject submitted payment proof
- Manage multiple payment methods

### For developers

- REST API for invoices, payment methods, keys, and webhooks
- JWT for dashboard access
- API keys for server-to-server integration
- Payment confirmation webhooks
- QR-based checkout flow tied to the merchant's UPI ID
- Access unlock after payment confirmation
- Rate limiting for stability
- Interactive API docs at `/docs`

## Developer integration flow

1. Your app receives `Proceed to Pay`
2. Your backend creates an invoice with the API
3. Your backend sends the invoice to the customer
4. The customer receives:
   - a hosted payment page
   - a UPI QR code based on your configured UPI ID
   - bank transfer details if configured
5. The customer submits their payment proof
6. Your backend confirms the payment
7. Your webhook receives `payment.confirmed`
8. Your app grants access to the paid content

## Plans

| Plan | Price | Invoices per month | API rate limit |
|---|---|---|---|
| Free | Rs. 0 | 5 | 30 requests/min |
| Starter | Rs. 499/month | 100 | 60 requests/min |
| Pro | Rs. 1,499/month | Unlimited | 120 requests/min |

## Dashboard usage

### 1. Sign up

Create an account with your name, email, and business name. This becomes the merchant profile in your SaaS.

Right after signup, the app now sends you to an onboarding screen so you can add your UPI ID and bank details before using the dashboard.

### 2. Add payment methods

Go to Payment Methods and add:

- UPI ID for QR payments
- Bank account details for transfers

### 3. Create an invoice

Go to Invoices -> New Invoice and enter:

- Customer name and email
- Line items
- GST rate
- Optional due date and notes

### 4. Send it

Click Send Invoice. The customer gets:

- An email with a payment link
- A QR code if UPI is configured
- A PDF invoice attachment

### 5. Customer pays

The customer opens the link, scans the QR code tied to your UPI ID, pays, and submits the UTR.

### 6. Confirm payment

You review the proof in the invoice detail page and confirm or reject it.

## API usage for developers

### Get an API key

Log in to the dashboard, open API Keys, and create a key.

- Keys start with `inv_`
- The raw key is shown only once
- Store it securely

### Create an invoice

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

### Create a checkout session

Use this when your own product needs to trigger payment after `Proceed to Pay`.

```http
POST /checkout/create
Authorization: Bearer inv_your_api_key_here
Content-Type: application/json

{
  "customer_name": "Rahul Sharma",
  "customer_email": "rahul@example.com",
  "external_reference_id": "order_12345",
  "gateway_metadata": {
    "product_id": "premium-plan",
    "success_redirect": "https://your-app.com/success"
  },
  "line_items": [
    { "name": "Premium Plan", "quantity": 1, "rate": 4999 }
  ],
  "gst_rate": 18,
  "discount": 0,
  "currency": "INR"
}
```

Response fields include:

- `invoice_id`
- `invoice_number`
- `payment_url`
- `qr_b64`
- `external_reference_id`

### Send the invoice

```http
POST /invoices/{invoice_id}/send
Authorization: Bearer inv_your_api_key_here
```

The customer receives the email and hosted payment page.

### Register a webhook

```http
POST /webhooks/config
Authorization: Bearer inv_your_api_key_here

{ "url": "https://your-app.com/webhooks/payment" }
```

When payment is confirmed, your endpoint receives:

```json
{
  "event": "payment.confirmed",
  "invoice_id": "...",
  "invoice_number": "INV-2025-0001",
  "amount": 29500.0,
  "currency": "INR",
  "customer_name": "Rahul Sharma",
  "utr": "SBIN0023456789"
}
```

### Confirm payment from your app

```http
POST /invoices/{invoice_id}/confirm-payment
Authorization: Bearer inv_your_api_key_here
```

After confirmation, your app can unlock the paid content, subscription, file, course, or service.

## Local setup

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Backend:

- `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Frontend:

- `http://localhost:3000`

## Minimum environment values

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=any-long-random-string-here
APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API quick reference

| Action | Method | Endpoint |
|---|---|---|
| Sign up | POST | `/auth/signup` |
| Log in | POST | `/auth/login` |
| Create invoice | POST | `/invoices` |
| Create checkout session | POST | `/checkout/create` |
| List invoices | GET | `/invoices` |
| Get one invoice | GET | `/invoices/{id}` |
| Send invoice | POST | `/invoices/{id}/send` |
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

## Verification

Run these before shipping:

```bash
cd backend
python -m pytest -q
```

```bash
cd frontend
npm run build
```

## Notes

- Dashboard routes live under `/dashboard/...`
- Root aliases redirect to the dashboard routes
- The public payment page shows QR code and bank details
- Bank fields use `account_holder`, `account_number`, and `ifsc_code`
- Backend tests use SQLite in-memory support
