# Payment Gateway

A decoupled invoice and payment platform built with:
- Frontend: Next.js + React + TypeScript
- Backend: FastAPI + SQLAlchemy

The app lets merchants:
- Create GST invoices
- Add UPI or bank payment methods
- Share a customer payment page
- Collect UTR/payment proof
- Confirm or reject payments
- Send webhook events and emails
- Expose the same workflow through a REST API

## What is included

- Merchant dashboard at `/dashboard`
- Public payment page at `/pay/[invoice_id]`
- API key management for developers
- Invoice PDF generation
- UPI QR code generation
- Webhook signing and delivery logs
- AI invoice scan support for image/PDF uploads
- Basic billing plan controls
- Backend tests for the payment flow

## Authentication model

There are two kinds of auth:
- JWT for the dashboard and merchant login flow
- API keys for server-to-server API usage

Important:
- API keys are shown only once at creation
- The raw key starts with `inv_`
- The dashboard should use JWT for its own actions

## Main user flow

1. Sign up or log in
2. Complete the onboarding screen with your UPI ID and optional bank details
3. Add more UPI and bank payment methods later if needed
4. Create an invoice
5. Send the invoice to the customer
6. Customer opens the payment page, scans the QR code, and pays
7. Customer submits UTR/payment proof
8. Merchant confirms or rejects the payment
9. The invoice moves to `paid` or back to `sent`

## SaaS model

This project is designed to be deployed as a SaaS platform.

Your customers are merchants or product owners who sign up on your site, add their bank name and UPI ID, and get a unique QR-backed checkout identity.

Their own website can then call your API when a user clicks `Proceed to Pay`.

The customer receives:
- a hosted payment page
- an email with the merchant's QR code
- bank transfer details if configured

After payment is confirmed, the merchant's backend can unlock the paid product, course, subscription, file, or service.

## Project structure

- `backend/` FastAPI app, models, services, and API routes
- `frontend/` Next.js app, dashboard pages, and customer payment page
- `backend/tests/` Backend tests for core payment flows

## Local setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL for production
- SQLite works for local development and tests

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

If you want to use migrations:

```bash
alembic upgrade head
```

Backend runs at:
- `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Frontend runs at:
- `http://localhost:3000`

## Required environment variables

Minimum backend values:

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=any-long-random-string
APP_URL=http://localhost:3000
```

Common optional backend values:

```env
SENDGRID_API_KEY=
FROM_EMAIL=invoices@example.com
FROM_NAME=Invoice API
ADMIN_EMAIL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
GROQ_API_KEY=
GEMINI_API_KEY=
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Core API routes

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`

### API keys

- `POST /keys`
- `GET /keys`
- `DELETE /keys/{id}`

### Invoices

- `POST /checkout/create`
- `POST /invoices`
- `GET /invoices`
- `GET /invoices/{id}`
- `PATCH /invoices/{id}`
- `DELETE /invoices/{id}`
- `GET /invoices/{id}/pdf`
- `POST /invoices/{id}/send`
- `POST /invoices/{id}/confirm-payment`
- `POST /invoices/{id}/reject-payment`
- `GET /invoices/{id}/payments`

### Payment methods

- `POST /payment-methods/upi`
- `POST /payment-methods/bank`
- `GET /payment-methods`
- `PATCH /payment-methods/{id}/set-default`
- `DELETE /payment-methods/{id}`

### Webhooks and billing

- `POST /webhooks/config`
- `GET /webhooks/config`
- `DELETE /webhooks/config`
- `GET /webhooks/deliveries`
- `GET /billing/plans`
- `GET /billing/current`
- `POST /billing/upgrade-request`

## Developer integration pattern

When your SaaS customer wants to collect payment:

1. Their product calls your API when a user clicks `Proceed to Pay`
2. You call `POST /checkout/create` with their API key
3. The gateway creates the invoice, links it to the merchant's external order ID, and sends the payment email
4. The customer sees the hosted payment page and QR code generated from the merchant's configured UPI ID
5. The customer pays and submits proof
6. Your webhook receives `payment.confirmed`
7. Your app grants access to the paid content

## Verification

Run the backend payment-flow tests:

```bash
cd backend
python -m pytest -q
```

Run the frontend build:

```bash
cd frontend
npm run build
```

Both should pass before shipping changes.

## Notes

- The dashboard routes live under `/dashboard/...`
- The older root aliases redirect to the dashboard routes
- The public payment page shows UPI QR code and bank details from the merchant's configured payment methods
- Bank transfer fields use `account_holder`, `account_number`, and `ifsc_code`
- SQLite support is now handled more safely in the backend so local tests and dev runs are easier
