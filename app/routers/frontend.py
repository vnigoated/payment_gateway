from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

router = APIRouter(include_in_schema=False)


@router.get("/", response_class=HTMLResponse)
def landing(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@router.get("/signup", response_class=HTMLResponse)
def signup_page(request: Request):
    return templates.TemplateResponse("auth/signup.html", {"request": request})


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard_home(request: Request):
    return templates.TemplateResponse("dashboard/home.html", {"request": request})


@router.get("/dashboard/invoices", response_class=HTMLResponse)
def dashboard_invoices(request: Request):
    return templates.TemplateResponse("dashboard/invoices.html", {"request": request})


@router.get("/dashboard/invoices/new", response_class=HTMLResponse)
def dashboard_invoice_new(request: Request):
    return templates.TemplateResponse("dashboard/invoice_new.html", {"request": request})


@router.get("/dashboard/invoices/{invoice_id}", response_class=HTMLResponse)
def dashboard_invoice_detail(request: Request, invoice_id: str):
    return templates.TemplateResponse(
        "dashboard/invoice_detail.html",
        {"request": request, "invoice_id": invoice_id},
    )


@router.get("/dashboard/keys", response_class=HTMLResponse)
def dashboard_keys(request: Request):
    return templates.TemplateResponse("dashboard/keys.html", {"request": request})


@router.get("/dashboard/payment-methods", response_class=HTMLResponse)
def dashboard_payment_methods(request: Request):
    return templates.TemplateResponse("dashboard/payment_methods.html", {"request": request})


@router.get("/dashboard/billing", response_class=HTMLResponse)
def dashboard_billing(request: Request):
    return templates.TemplateResponse("dashboard/billing.html", {"request": request})


@router.get("/dashboard/settings", response_class=HTMLResponse)
def dashboard_settings(request: Request):
    return templates.TemplateResponse("dashboard/settings.html", {"request": request})


@router.get("/dashboard/webhooks", response_class=HTMLResponse)
def dashboard_webhooks(request: Request):
    return templates.TemplateResponse("dashboard/webhooks.html", {"request": request})


@router.get("/forgot-password", response_class=HTMLResponse)
def forgot_password_page(request: Request):
    return templates.TemplateResponse("auth/forgot_password.html", {"request": request})


@router.get("/reset-password", response_class=HTMLResponse)
def reset_password_page(request: Request):
    return templates.TemplateResponse("auth/reset_password.html", {"request": request})


@router.get("/admin", response_class=HTMLResponse)
def admin_index(request: Request):
    return templates.TemplateResponse("admin/index.html", {"request": request})


@router.get("/developer", response_class=HTMLResponse)
def developer_docs(request: Request):
    return templates.TemplateResponse("docs.html", {"request": request})
