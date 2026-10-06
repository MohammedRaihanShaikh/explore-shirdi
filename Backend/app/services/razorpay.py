"""
Razorpay payment service.

Two modes, selected automatically from settings:

* LIVE  — razorpay_key_id + razorpay_key_secret are set. Real orders are
  created through the Razorpay API and payment signatures are verified
  with HMAC-SHA256 against the key secret.
* MOCK  — keys are empty (local development). Orders are generated locally
  and every verification is accepted, so the entire book → pay → confirm
  flow can be exercised end-to-end without a Razorpay account.

The security-critical rule for both modes: a booking is only ever marked
CONFIRMED after `verify_signature` returns True. The frontend's word is
never enough.
"""
import hashlib
import hmac
import secrets
from typing import Any, Dict, Optional

import httpx

from app.config import settings

RAZORPAY_API = "https://api.razorpay.com/v1"


class RazorpayError(RuntimeError):
    """Raised when the Razorpay API rejects a request."""


def _auth() -> tuple[str, str]:
    return settings.razorpay_key_id, settings.razorpay_key_secret


async def create_order(
    amount: float,
    receipt: str,
    notes: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Create a Razorpay order for `amount` INR.

    Returns a dict with at least `id`, `amount`, `currency`, `status`.
    Amount is converted to paise (Razorpay's smallest unit).
    """
    amount_paise = max(1, int(round(amount * 100)))

    if not settings.razorpay_enabled:
        # Mock mode — deterministic-looking but locally generated order id.
        return {
            "id": "order_mock_" + secrets.token_hex(12),
            "amount": amount_paise,
            "amount_paid": 0,
            "currency": "INR",
            "status": "created",
            "receipt": receipt,
            "notes": notes or {},
            "mock": True,
        }

    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],
        "notes": notes or {},
        "payment_capture": 1,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{RAZORPAY_API}/orders",
            json=payload,
            auth=_auth(),
        )

    if resp.status_code not in (200, 201):
        raise RazorpayError(
            f"Razorpay order creation failed ({resp.status_code}): {resp.text[:300]}"
        )

    data = resp.json()
    data["mock"] = False
    return data


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify a Razorpay payment signature.

    Razorpay signs `order_id + "|" + payment_id` with the key secret using
    HMAC-SHA256. A match proves the payment really came from Razorpay and
    the order id was not tampered with.

    In mock mode every non-empty signature is accepted so the local
    development flow can be completed.
    """
    if not settings.razorpay_enabled:
        return bool(signature)

    if not (order_id and payment_id and signature):
        return False

    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(
        settings.razorpay_key_secret.encode(), body, hashlib.sha256
    ).hexdigest()

    # Constant-time comparison to avoid timing attacks.
    return hmac.compare_digest(expected, signature)


async def fetch_payment(payment_id: str) -> Dict[str, Any]:
    """Fetch a payment record from Razorpay (live mode only)."""
    if not settings.razorpay_enabled:
        return {"id": payment_id, "status": "captured", "mock": True}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{RAZORPAY_API}/payments/{payment_id}",
            auth=_auth(),
        )

    if resp.status_code != 200:
        raise RazorpayError(
            f"Razorpay payment fetch failed ({resp.status_code}): {resp.text[:300]}"
        )

    return resp.json()
