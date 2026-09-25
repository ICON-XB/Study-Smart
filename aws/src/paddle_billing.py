"""Study-Smart premium entitlements backed by Paddle Billing webhooks.

Why this exists: a Paddle checkout "completed" event in the browser is not
proof of payment. Premium is granted only after Paddle's server sends a
signed webhook, which this function verifies, deduplicates and applies in
order. The PWA then asks /entitlement whether its install has premium.

Linking a purchase to a device without accounts: the PWA generates a random
128-bit install ID, passes it to Paddle checkout as custom_data.installId,
and shows it to the user as their "purchase ID" so they can restore premium
on another device.

Status: written and unit-tested with an in-memory store (tests/). Not
deployed. See ../../RELEASE_CHECKLIST.md.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger()
logger.setLevel(logging.INFO)

INSTALL_ID_RE = re.compile(r"^[a-f0-9]{32}$")
SIGNATURE_TOLERANCE_SECONDS = 300
PREMIUM_STATUSES = {"active", "trialing", "past_due"}  # past_due = Paddle is retrying payment
EVENT_TTL_SECONDS = 90 * 24 * 3600


# ---------------------------------------------------------------------------
# Signature verification (Paddle Billing: Paddle-Signature: ts=...;h1=...)
# ---------------------------------------------------------------------------

def parse_signature_header(header: Optional[str]):
    if not header:
        return None, []
    ts = None
    h1 = []
    for part in header.split(";"):
        key, _, value = part.strip().partition("=")
        if key == "ts" and value.isdigit():
            ts = int(value)
        elif key == "h1" and value:
            h1.append(value)
    return ts, h1


def verify_signature(raw_body: bytes, header: Optional[str], secret: str, now: Optional[float] = None) -> bool:
    """True only if one of the h1 signatures matches and the timestamp is fresh."""
    if not secret:
        return False
    ts, signatures = parse_signature_header(header)
    if ts is None or not signatures:
        return False
    now = time.time() if now is None else now
    if abs(now - ts) > SIGNATURE_TOLERANCE_SECONDS:
        return False  # replayed or badly delayed
    signed = f"{ts}:".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, sig) for sig in signatures)


# ---------------------------------------------------------------------------
# Event application (idempotent, ordered)
# ---------------------------------------------------------------------------

def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _install_id(data: dict) -> Optional[str]:
    custom = data.get("custom_data") or {}
    value = custom.get("installId") if isinstance(custom, dict) else None
    return value if isinstance(value, str) and INSTALL_ID_RE.match(value) else None


def apply_event(store, event: dict) -> str:
    """Applies one verified webhook event. Returns an outcome string for logs.

    The event ID is recorded only after the event has been handled, so if
    storage fails midway Paddle's retry is processed instead of being
    mistaken for a duplicate. Applying the same event twice is harmless.
    """
    event_id = event.get("event_id")
    event_type = event.get("event_type")
    occurred_at = _parse_time(event.get("occurred_at"))
    data = event.get("data") or {}
    if not isinstance(event_id, str) or not isinstance(event_type, str) or occurred_at is None or not isinstance(data, dict):
        return "ignored_malformed"

    if store.is_event_processed(event_id):
        return "duplicate"

    outcome = _apply_subscription_state(store, event_type, occurred_at, data)
    store.mark_event_processed(event_id)
    return outcome


def _apply_subscription_state(store, event_type: str, occurred_at: datetime, data: dict) -> str:
    if not event_type.startswith("subscription."):
        # transaction.* events are informational here; the subscription events
        # carry the status that decides premium.
        return "ignored_type"

    install_id = _install_id(data)
    subscription_id = data.get("id")
    status = data.get("status")
    if not install_id or not isinstance(subscription_id, str) or not isinstance(status, str):
        return "ignored_unlinked"

    current = store.get_install(install_id)
    if current and current.get("subscription_id") == subscription_id:
        last = _parse_time(current.get("last_event_at"))
        if last and occurred_at <= last:
            return "stale"  # out-of-order delivery: a newer state is already stored
    elif current and current.get("status") in PREMIUM_STATUSES and status not in PREMIUM_STATUSES:
        # A late event about an older, ended subscription must not remove
        # premium granted by the install's current subscription.
        return "ignored_other_subscription"

    period = data.get("current_billing_period") or {}
    ends_at = period.get("ends_at") if isinstance(period, dict) else None
    store.put_install(install_id, {
        "subscription_id": subscription_id,
        "customer_id": data.get("customer_id") if isinstance(data.get("customer_id"), str) else None,
        "status": status,
        "period_ends_at": ends_at if isinstance(ends_at, str) else None,
        "last_event_at": occurred_at.isoformat(),
    })
    return "applied"


def entitlement_for(record: Optional[dict], now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    if not record:
        return {"premium": False, "status": "none"}
    status = record.get("status")
    ends = _parse_time(record.get("period_ends_at"))
    premium = status in PREMIUM_STATUSES and (ends is None or ends > now)
    return {
        "premium": premium,
        "status": status,
        "periodEndsAt": record.get("period_ends_at"),
    }


# ---------------------------------------------------------------------------
# Storage (DynamoDB in production, in-memory fake in tests)
# ---------------------------------------------------------------------------

class DynamoStore:
    def __init__(self, table_name: str):
        import boto3  # imported lazily so unit tests do not need boto3
        self._table = boto3.resource("dynamodb").Table(table_name)

    def is_event_processed(self, event_id: str) -> bool:
        return "Item" in self._table.get_item(Key={"pk": f"EVENT#{event_id}"}, ProjectionExpression="pk")

    def mark_event_processed(self, event_id: str) -> None:
        self._table.put_item(Item={"pk": f"EVENT#{event_id}", "expires": int(time.time()) + EVENT_TTL_SECONDS})

    def get_install(self, install_id: str) -> Optional[dict]:
        item = self._table.get_item(Key={"pk": f"INSTALL#{install_id}"}).get("Item")
        return dict(item) if item else None

    def put_install(self, install_id: str, record: dict) -> None:
        self._table.put_item(Item={"pk": f"INSTALL#{install_id}", **{k: v for k, v in record.items() if v is not None}})


_secret_cache: dict = {}


def _webhook_secret() -> str:
    arn = os.environ.get("PADDLE_SECRET_ARN", "")
    if not arn:
        return ""
    if arn not in _secret_cache:
        import boto3
        value = boto3.client("secretsmanager").get_secret_value(SecretId=arn)["SecretString"]
        try:
            value = json.loads(value).get("webhookSecret", "")
        except (ValueError, AttributeError):
            pass
        _secret_cache[arn] = value
    return _secret_cache[arn]


def _response(status: int, body: Optional[dict] = None, origin: Optional[str] = None) -> dict:
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return {"statusCode": status, "headers": headers, "body": json.dumps(body or {})}


def _raw_body(event: dict) -> bytes:
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64
        return base64.b64decode(body)
    return body.encode("utf-8")


def webhook_handler(event, context, store=None, secret=None):
    """POST /paddle/webhook — called by Paddle, never by the browser."""
    raw = _raw_body(event)
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    if not verify_signature(raw, headers.get("paddle-signature"), secret if secret is not None else _webhook_secret()):
        logger.warning(json.dumps({"route": "webhook", "outcome": "bad_signature"}))
        return _response(401, {"error": "invalid_signature"})
    try:
        payload = json.loads(raw)
    except ValueError:
        return _response(400, {"error": "invalid_json"})
    store = store or DynamoStore(os.environ["TABLE_NAME"])
    outcome = apply_event(store, payload)
    logger.info(json.dumps({"route": "webhook", "outcome": outcome, "type": payload.get("event_type"), "eventId": payload.get("event_id")}))
    # 200 for duplicates/ignored events too, so Paddle stops retrying them.
    return _response(200, {"ok": True})


def entitlement_handler(event, context, store=None):
    """GET /entitlement?installId=... — called by the PWA."""
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    origin = headers.get("origin")
    cors_origin = allowed_origin if origin and origin == allowed_origin else None
    params = event.get("queryStringParameters") or {}
    install_id = params.get("installId", "")
    if not isinstance(install_id, str) or not INSTALL_ID_RE.match(install_id):
        return _response(400, {"error": "invalid_install_id"}, cors_origin)
    store = store or DynamoStore(os.environ["TABLE_NAME"])
    try:
        record = store.get_install(install_id)
    except Exception:  # noqa: BLE001 - never leak internals to the client
        logger.exception("entitlement lookup failed")
        return _response(503, {"error": "unavailable"}, cors_origin)
    return _response(200, entitlement_for(record), cors_origin)
