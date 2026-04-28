# Invoice API — Quick Start

## 1. Install dependencies
```bash
pip install -r requirements.txt
```

## 2. Set up environment
```bash
cp .env.example .env
# Edit .env and fill in DATABASE_URL and SECRET_KEY at minimum
```
Generate a strong SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## 3. Create the database
Make sure PostgreSQL is running, then:
```bash
# Option A — auto-create tables (dev only)
python run.py   # tables are created on first start via Base.metadata.create_all

# Option B — Alembic migrations (recommended)
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## 4. Run the server
```bash
python run.py
```
Open http://localhost:8000/docs to see the interactive API docs.

---

## Phase 1 API — what's working right now

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Register a new account |
| POST | /auth/login | Login, get JWT token |
| GET  | /auth/me | Get your profile |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /keys | Create an API key (raw key shown ONCE) |
| GET  | /keys | List your active keys |
| DELETE | /keys/{id} | Revoke a key |

### Invoices (needs API key in Authorization header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /invoices | Create a draft invoice |
| GET  | /invoices | List invoices (filter by ?status=paid) |
| GET  | /invoices/{id} | Get one invoice |
| PATCH | /invoices/{id} | Update a draft invoice |
| DELETE | /invoices/{id} | Cancel an invoice |

---

## Example: create an invoice

```bash
# 1. Sign up
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret123","name":"Your Name"}'

# 2. Create an API key (save the raw_key — shown once!)
curl -X POST http://localhost:8000/keys \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Production"}'

# 3. Create an invoice
curl -X POST http://localhost:8000/invoices \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Acme Corp",
    "customer_email": "billing@acme.com",
    "gst_rate": 18,
    "line_items": [
      {"name": "Web Design", "quantity": 1, "rate": 25000},
      {"name": "Hosting (annual)", "quantity": 1, "rate": 5000}
    ]
  }'
```

---

## Coming next
- **Phase 2** — PDF generation (GST invoice with ReportLab)
- **Phase 3** — Razorpay payment links
- **Phase 4** — Webhooks + email delivery
- **Phase 5** — Dashboard
