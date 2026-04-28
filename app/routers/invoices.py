from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate
from app.services.invoice_service import InvoiceService
from app.utils.cache import get_cached_invoices, invalidate_invoice_cache, set_cached_invoices
from app.utils.security import get_user_jwt_or_key

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def _get_user_and_key(
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    user, api_key = auth
    return user, api_key, db


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    deps=Depends(_get_user_and_key),
):
    user, api_key, db = deps
    invoice = InvoiceService.create(db, user, api_key, payload)
    invalidate_invoice_cache(str(user.id))
    return invoice


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    deps=Depends(_get_user_and_key),
):
    """List your invoices. Filter by status: draft | sent | pending | paid | cancelled."""
    user, api_key, db = deps

    params_key = f"{status_filter or 'all'}:{page}:{limit}"
    cached = get_cached_invoices(str(user.id), params_key)
    if cached is not None:
        return JSONResponse(content=cached)

    query = db.query(Invoice).filter(Invoice.user_id == user.id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    invoices = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = [InvoiceOut.model_validate(inv).model_dump(mode="json") for inv in invoices]
    set_cached_invoices(str(user.id), params_key, result)
    return JSONResponse(content=result)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: UUID, deps=Depends(_get_user_and_key)):
    user, api_key, db = deps
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == user.id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: UUID, payload: InvoiceUpdate, deps=Depends(_get_user_and_key)):
    user, api_key, db = deps
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == user.id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status not in ("draft",):
        raise HTTPException(status_code=400, detail="Only draft invoices can be edited")
    updated = InvoiceService.update(db, invoice, payload)
    invalidate_invoice_cache(str(user.id))
    return updated


@router.get("/{invoice_id}/pdf")
def download_pdf(invoice_id: UUID, deps=Depends(_get_user_and_key)):
    """Download the invoice as a GST-compliant PDF."""
    user, api_key, db = deps
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not invoice:
        raise HTTPException(404, detail="Invoice not found")
    from app.utils.pdf import generate_invoice_pdf
    pdf_bytes = generate_invoice_pdf(invoice, user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'},
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_invoice(invoice_id: UUID, deps=Depends(_get_user_and_key)):
    user, api_key, db = deps
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == user.id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Cannot cancel a paid invoice")
    invoice.status = "cancelled"
    db.commit()
    invalidate_invoice_cache(str(user.id))
