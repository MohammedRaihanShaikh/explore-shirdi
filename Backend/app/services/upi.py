"""
UPI QR payment helper.

Builds a UPI intent URL that, when encoded as a QR code and scanned with any
UPI app (PhonePe, Google Pay, Paytm, BHIM), opens that app with the payment
details pre-filled. The pilgrim only has to confirm and pay.

URL format (NPCI standard):
    upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>

`pa`  = the merchant's UPI payment address (VPA), e.g. "merchant@okaxis"
`pn`  = payee name shown in the UPI app
`am`  = amount in INR
`cu`  = currency (always INR)
`tn`  = transaction note (booking reference)
"""
from urllib.parse import quote

from app.config import settings


def build_upi_intent(amount: float, receipt: str) -> str:
    """
    Build a UPI intent URL for the given amount and booking reference.

    Returns an empty string when no merchant UPI id is configured, so the
    caller can fall back to another payment method.
    """
    if not settings.upi_enabled:
        return ""

    pa = settings.merchant_upi_id
    pn = settings.merchant_name
    tn = receipt or "Shirdi Booking"

    # NPCI spec: amount with up to 2 decimals, no currency symbol.
    am = f"{float(amount):.2f}"

    return (
        f"upi://pay?pa={quote(pa, safe='@')}"
        f"&pn={quote(pn)}"
        f"&am={am}"
        f"&cu=INR"
        f"&tn={quote(tn)}"
    )


def is_valid_utr(utr: str) -> bool:
    """
    Validate a UTR / UPI transaction reference number.

    UTRs are 12-22 character alphanumeric strings (some banks include a few
    extra characters). We normalise by uppercasing and stripping whitespace.
    """
    cleaned = (utr or "").strip().upper()
    if len(cleaned) < 12 or len(cleaned) > 22:
        return False
    return cleaned.replace("-", "").replace("_", "").isalnum()
