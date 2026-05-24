import uuid


def _auth_headers(client, email: str = "merchant@example.com"):
    response = client.post(
        "/auth/signup",
        json={
            "name": "Merchant",
            "business_name": "Acme Studio",
            "email": email,
            "password": "Password123",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_invoice(client, headers):
    response = client.post(
        "/invoices",
        json={
            "customer_name": "Rahul Sharma",
            "customer_email": "rahul@example.com",
            "customer_phone": "9876543210",
            "line_items": [
                {"name": "Website Design", "quantity": 1, "rate": 25000},
            ],
            "gst_rate": 18,
            "discount": 0,
            "currency": "INR",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def test_public_payment_page_exposes_bank_fields(client):
    headers = _auth_headers(client)

    upi = client.post(
        "/payment-methods/upi",
        json={
            "label": "Primary UPI",
            "upi_id": "merchant@okaxis",
            "upi_name": "Acme Studio",
            "is_default": True,
        },
        headers=headers,
    )
    assert upi.status_code == 201

    bank = client.post(
        "/payment-methods/bank",
        json={
            "label": "Current Account",
            "bank_name": "HDFC Bank",
            "account_holder": "Acme Studio",
            "account_number": "00001234567890",
            "ifsc_code": "HDFC0001234",
            "account_type": "current",
            "is_default": False,
        },
        headers=headers,
    )
    assert bank.status_code == 201

    invoice = _create_invoice(client, headers)

    response = client.get(f"/pay/{invoice['id']}/public")
    assert response.status_code == 200

    payload = response.json()
    assert payload["qr_b64"]
    assert payload["bank_method"]["account_holder"] == "Acme Studio"
    assert payload["bank_method"]["account_number"] == "00001234567890"
    assert payload["bank_method"]["ifsc_code"] == "HDFC0001234"


def test_full_payment_flow_can_send_submit_and_confirm(client):
    headers = _auth_headers(client, email="merchant2@example.com")

    client.post(
        "/payment-methods/upi",
        json={
            "label": "Primary UPI",
            "upi_id": "merchant2@okaxis",
            "upi_name": "Acme Studio",
            "is_default": True,
        },
        headers=headers,
    )

    invoice = _create_invoice(client, headers)

    send = client.post(f"/invoices/{invoice['id']}/send", headers=headers)
    assert send.status_code == 200
    assert send.json()["status"] == "sent"

    submit = client.post(
        f"/pay/{invoice['id']}/submit",
        json={
            "utr": "UTR1234567",
            "customer_note": "Paid from savings account",
        },
    )
    assert submit.status_code == 200
    assert submit.json()["message"] == "Payment proof submitted successfully"

    invoice_after_submit = client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert invoice_after_submit.status_code == 200
    assert invoice_after_submit.json()["status"] == "pending"

    confirm = client.post(f"/invoices/{invoice['id']}/confirm-payment", headers=headers)
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"

    invoice_after_confirm = client.get(f"/invoices/{invoice['id']}", headers=headers)
    assert invoice_after_confirm.status_code == 200
    assert invoice_after_confirm.json()["status"] == "paid"

    payments = client.get(f"/invoices/{invoice['id']}/payments", headers=headers)
    assert payments.status_code == 200
    assert payments.json()[-1]["status"] == "confirmed"


# ── Negative tests ────────────────────────────────────────────────────────────


def test_public_payment_page_returns_404_for_unknown_invoice(client):
    response = client.get(f"/pay/{uuid.uuid4()}/public")
    assert response.status_code == 404


def test_submit_rejects_short_utr(client):
    headers = _auth_headers(client, email="neg1@example.com")
    invoice = _create_invoice(client, headers)
    client.post(f"/invoices/{invoice['id']}/send", headers=headers)

    response = client.post(
        f"/pay/{invoice['id']}/submit",
        json={"utr": "AB1"},
    )
    assert response.status_code == 400
    assert "UTR" in response.json()["detail"]


def test_submit_rejects_duplicate_utr(client):
    headers = _auth_headers(client, email="neg2@example.com")
    invoice = _create_invoice(client, headers)
    client.post(f"/invoices/{invoice['id']}/send", headers=headers)

    client.post(f"/pay/{invoice['id']}/submit", json={"utr": "UTR9876543"})
    response = client.post(f"/pay/{invoice['id']}/submit", json={"utr": "UTR9876543"})

    assert response.status_code == 400
    assert "already been submitted" in response.json()["detail"]


def test_submit_rejected_for_paid_invoice(client):
    headers = _auth_headers(client, email="neg3@example.com")
    client.post(
        "/payment-methods/upi",
        json={"label": "UPI", "upi_id": "neg3@upi", "upi_name": "Neg3", "is_default": True},
        headers=headers,
    )
    invoice = _create_invoice(client, headers)
    client.post(f"/invoices/{invoice['id']}/send", headers=headers)
    client.post(f"/pay/{invoice['id']}/submit", json={"utr": "UTR1111111"})
    client.post(f"/invoices/{invoice['id']}/confirm-payment", headers=headers)

    response = client.post(f"/pay/{invoice['id']}/submit", json={"utr": "UTR2222222"})
    assert response.status_code == 400
    assert "paid" in response.json()["detail"]


def test_confirm_payment_requires_auth(client):
    headers = _auth_headers(client, email="neg4@example.com")
    invoice = _create_invoice(client, headers)

    response = client.post(f"/invoices/{invoice['id']}/confirm-payment")
    assert response.status_code == 401


def test_confirm_payment_blocked_for_wrong_merchant(client):
    headers_a = _auth_headers(client, email="neg5a@example.com")
    headers_b = _auth_headers(client, email="neg5b@example.com")
    invoice = _create_invoice(client, headers_a)

    response = client.post(f"/invoices/{invoice['id']}/confirm-payment", headers=headers_b)
    assert response.status_code == 404


def test_confirm_payment_fails_with_no_pending_payment(client):
    headers = _auth_headers(client, email="neg6@example.com")
    invoice = _create_invoice(client, headers)

    response = client.post(f"/invoices/{invoice['id']}/confirm-payment", headers=headers)
    assert response.status_code == 404
    assert "No submitted payment" in response.json()["detail"]


def test_checkout_create_rejects_invalid_api_key(client):
    response = client.post(
        "/checkout/create",
        json={
            "customer_name": "Test",
            "customer_email": "test@example.com",
            "customer_phone": "9000000001",
            "line_items": [{"name": "Item", "quantity": 1, "rate": 100}],
            "gst_rate": 18,
            "discount": 0,
            "currency": "INR",
        },
        headers={"Authorization": "Bearer inv_" + "x" * 64},
    )
    assert response.status_code == 401


# ── Original tests ─────────────────────────────────────────────────────────────


def test_checkout_session_uses_api_key_and_preserves_external_reference(client):
    headers = _auth_headers(client, email="merchant3@example.com")

    client.post(
        "/payment-methods/upi",
        json={
            "label": "Primary UPI",
            "upi_id": "merchant3@okaxis",
            "upi_name": "Acme Studio",
            "is_default": True,
        },
        headers=headers,
    )

    api_key = client.post(
        "/keys",
        json={"name": "Storefront Gateway"},
        headers=headers,
    )
    assert api_key.status_code == 201
    raw_key = api_key.json()["raw_key"]

    checkout = client.post(
        "/checkout/create",
        json={
            "customer_name": "Priya Verma",
            "customer_email": "priya@example.com",
            "customer_phone": "9000000000",
            "external_reference_id": "order_12345",
            "gateway_metadata": {
                "product_id": "xyz-annual",
                "success_redirect": "https://merchant.example.com/success",
            },
            "line_items": [
                {"name": "Premium Plan", "quantity": 1, "rate": 4999},
            ],
            "gst_rate": 18,
            "discount": 0,
            "currency": "INR",
        },
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert checkout.status_code == 200

    payload = checkout.json()
    assert payload["invoice_number"]
    assert payload["payment_url"].endswith(f"/pay/{payload['invoice_id']}")
    assert payload["qr_b64"]
    assert payload["external_reference_id"] == "order_12345"

    invoice = client.get(f"/invoices/{payload['invoice_id']}", headers=headers)
    assert invoice.status_code == 200
    stored = invoice.json()
    assert stored["external_reference_id"] == "order_12345"
    assert stored["gateway_metadata"]["product_id"] == "xyz-annual"
    assert stored["status"] == "sent"
