from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

_BLUE   = colors.HexColor("#1e3a5f")
_LBLUE  = colors.HexColor("#e8f0fe")
_BORDER = colors.HexColor("#d1d5db")
_TEXT   = colors.HexColor("#111827")
_MUTED  = colors.HexColor("#6b7280")
_GREEN  = colors.HexColor("#059669")
_WHITE  = colors.white
_LGRAY  = colors.HexColor("#f8fafc")


def _p(text, size=9, color=_TEXT, bold=False, align=None, italic=False):
    kw = {"fontSize": size, "textColor": color, "leading": size + 4}
    if bold:   kw["fontName"] = "Helvetica-Bold"
    if italic: kw["fontName"] = "Helvetica-Oblique"
    if align:  kw["alignment"] = align
    return Paragraph(str(text) if text else "", ParagraphStyle("_", **kw))


def _rs(v: float) -> str:
    return f"Rs. {v:,.2f}"


def _amount_in_words(amount: float) -> str:
    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two(n: int) -> str:
        if n < 20: return ones[n]
        return tens[n // 10] + (" " + ones[n % 10] if n % 10 else "")

    def _three(n: int) -> str:
        if n >= 100:
            return ones[n // 100] + " Hundred" + (" " + _two(n % 100) if n % 100 else "")
        return _two(n)

    r = int(amount)
    paise = round((amount - r) * 100)
    words = ""

    crore, r = divmod(r, 10_000_000)
    lakh,  r = divmod(r, 100_000)
    thou,  r = divmod(r, 1_000)

    if crore: words += _three(crore) + " Crore "
    if lakh:  words += _three(lakh)  + " Lakh "
    if thou:  words += _three(thou)  + " Thousand "
    if r:     words += _three(r)

    result = (words.strip() or "Zero") + " Rupees"
    if paise: result += " and " + _two(paise) + " Paise"
    return result + " Only"


def generate_invoice_pdf(invoice, merchant) -> bytes:
    buffer = BytesIO()
    PAGE_W = A4[0] - 30 * mm

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=15 * mm, leftMargin=15 * mm,
        topMargin=12 * mm, bottomMargin=12 * mm,
    )
    story = []

    merchant_name = merchant.business_name or merchant.name
    inv_date = invoice.created_at.strftime("%d %b %Y") if invoice.created_at else ""
    due_str  = str(invoice.due_date) if invoice.due_date else "—"

    # ── Header ────────────────────────────────────────────────────────────────
    left = [_p(merchant_name, size=18, bold=True, color=_BLUE), Spacer(1, 2)]
    if getattr(merchant, "address", None):
        left.append(_p(merchant.address, size=8, color=_MUTED))
    if getattr(merchant, "gstin", None):
        left.append(_p(f"GSTIN: {merchant.gstin}", size=8, color=_MUTED))
    if getattr(merchant, "phone", None):
        left.append(_p(f"Tel: {merchant.phone}", size=8, color=_MUTED))
    left.append(_p(merchant.email, size=8, color=_MUTED))

    right = [
        _p("TAX INVOICE", size=14, bold=True, color=_BLUE, align=TA_RIGHT),
        Spacer(1, 4),
        _p(invoice.invoice_number, size=12, bold=True, align=TA_RIGHT),
        Spacer(1, 6),
        _p(f"Date:    {inv_date}", size=8, color=_MUTED, align=TA_RIGHT),
        _p(f"Due:     {due_str}",  size=8, color=_MUTED, align=TA_RIGHT),
    ]

    hdr = Table([[left, right]], colWidths=[PAGE_W * 0.55, PAGE_W * 0.45])
    hdr.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story += [hdr, Spacer(1, 4 * mm),
              HRFlowable(width="100%", thickness=2, color=_BLUE, spaceAfter=4 * mm)]

    # ── Bill To ───────────────────────────────────────────────────────────────
    bt = [_p("BILL TO", size=7, bold=True, color=_MUTED), Spacer(1, 2),
          _p(invoice.customer_name, size=11, bold=True)]
    if invoice.customer_gstin:
        bt.append(_p(f"GSTIN: {invoice.customer_gstin}", size=8, color=_MUTED))
    if invoice.customer_address:
        bt.append(_p(invoice.customer_address, size=8, color=_MUTED))
    if invoice.customer_email:
        bt.append(_p(invoice.customer_email, size=8, color=_MUTED))
    if invoice.customer_phone:
        bt.append(_p(invoice.customer_phone, size=8, color=_MUTED))

    bt_wrap = Table([[bt]], colWidths=[PAGE_W])
    bt_wrap.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), _LGRAY),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX",           (0, 0), (-1, -1), 0.5, _BORDER),
    ]))
    story += [bt_wrap, Spacer(1, 5 * mm)]

    # ── Line Items ────────────────────────────────────────────────────────────
    col_w = [8 * mm, PAGE_W - 8 * mm - 20 * mm - 30 * mm - 30 * mm, 20 * mm, 30 * mm, 30 * mm]
    rows = [[
        _p("#",           bold=True, color=_WHITE),
        _p("Description", bold=True, color=_WHITE),
        _p("Qty",         bold=True, color=_WHITE, align=TA_RIGHT),
        _p("Rate",        bold=True, color=_WHITE, align=TA_RIGHT),
        _p("Amount",      bold=True, color=_WHITE, align=TA_RIGHT),
    ]]
    for i, item in enumerate(invoice.line_items or [], 1):
        rows.append([
            _p(str(i), size=8, color=_MUTED),
            _p(item.get("name", ""), size=9),
            _p(str(item.get("quantity", "")),  size=9, align=TA_RIGHT),
            _p(_rs(item.get("rate", 0)),        size=9, align=TA_RIGHT),
            _p(_rs(item.get("amount", 0)),      size=9, align=TA_RIGHT),
        ])

    items_tbl = Table(rows, colWidths=col_w, repeatRows=1)
    items_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1,  0), _BLUE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [_WHITE, _LGRAY]),
        ("GRID",          (0, 0), (-1, -1), 0.5, _BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [items_tbl, Spacer(1, 4 * mm)]

    # ── Totals ────────────────────────────────────────────────────────────────
    totals = []
    totals.append([_p("Subtotal", align=TA_RIGHT), _p(_rs(invoice.subtotal), align=TA_RIGHT)])
    if invoice.discount:
        totals.append([
            _p("Discount", color=_MUTED, align=TA_RIGHT),
            _p(f"- {_rs(invoice.discount)}", color=_MUTED, align=TA_RIGHT),
        ])
    # CGST + SGST (intrastate split)
    half_rate = invoice.gst_rate / 2
    half_amt  = invoice.gst_amount / 2
    totals.append([_p(f"CGST ({half_rate}%)", color=_MUTED, align=TA_RIGHT), _p(_rs(half_amt), color=_MUTED, align=TA_RIGHT)])
    totals.append([_p(f"SGST ({half_rate}%)", color=_MUTED, align=TA_RIGHT), _p(_rs(half_amt), color=_MUTED, align=TA_RIGHT)])
    totals.append([
        _p("TOTAL", size=11, bold=True, color=_BLUE, align=TA_RIGHT),
        _p(_rs(invoice.total), size=11, bold=True, color=_BLUE, align=TA_RIGHT),
    ])

    tot_tbl = Table(totals, colWidths=[PAGE_W - 58 * mm, 58 * mm], hAlign="RIGHT")
    tot_tbl.setStyle(TableStyle([
        ("LINEABOVE",     (0, -1), (-1, -1), 1.5, _BLUE),
        ("LINEBELOW",     (0, -1), (-1, -1), 1.5, _BLUE),
        ("LEFTPADDING",   (0,  0), (-1, -1), 4),
        ("RIGHTPADDING",  (0,  0), (-1, -1), 0),
        ("TOPPADDING",    (0,  0), (-1, -1), 3),
        ("BOTTOMPADDING", (0,  0), (-1, -1), 3),
    ]))
    story += [tot_tbl, Spacer(1, 4 * mm)]

    # ── Amount in words ───────────────────────────────────────────────────────
    story.append(_p(f"<i>{_amount_in_words(invoice.total)}</i>", size=9, color=_GREEN))
    story.append(Spacer(1, 4 * mm))

    # ── Notes ─────────────────────────────────────────────────────────────────
    if invoice.notes:
        story += [
            HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=3 * mm),
            _p("NOTES", size=7, bold=True, color=_MUTED),
            Spacer(1, 1 * mm),
            _p(invoice.notes, size=9, color=_MUTED),
            Spacer(1, 4 * mm),
        ]

    # ── Footer ────────────────────────────────────────────────────────────────
    story += [
        HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=3 * mm),
        _p(
            "This is a computer-generated invoice and does not require a physical signature.",
            size=7, color=_MUTED, align=TA_CENTER,
        ),
    ]

    doc.build(story)
    return buffer.getvalue()
