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
