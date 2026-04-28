from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import auth, keys, invoices, payments, payment_methods, webhooks
from app.routers import admin, billing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Generate GST invoices, share UPI / bank-transfer payment pages, "
        "and track payments — all via a single REST API. No third-party payment gateway needed."
    ),
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(invoices.router)
app.include_router(payment_methods.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
app.include_router(admin.router)
app.include_router(billing.router)



@app.get("/health", tags=["Health"], include_in_schema=False)
def health():
    return {"status": "ok"}
