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
2. Add payment methods
3. Create an invoice
4. Send the invoice to the customer
5. Customer opens the payment page and submits UTR/payment proof
6. Merchant confirms or rejects the payment
7. The invoice moves to `paid` or back to `sent`

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

