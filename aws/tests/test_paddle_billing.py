"""Unit tests for aws/src/paddle_billing.py.

Run from the aws/ folder:  python -m unittest discover -s tests
"""

import hashlib
import hmac
import json
import os
import sys
import time
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import paddle_billing as pb  # noqa: E402

SECRET = "pdl_ntfset_test_secret"
INSTALL = "0123456789abcdef0123456789abcdef"


def sign(raw: bytes, ts: int, secret: str = SECRET) -> str:
    h1 = hmac.new(secret.encode(), f"{ts}:".encode() + raw, hashlib.sha256).hexdigest()
    return f"ts={ts};h1={h1}"


class FakeStore:
    def __init__(self):
        self.events = set()
        self.installs = {}

    def is_event_processed(self, event_id):
        return event_id in self.events

    def mark_event_processed(self, event_id):
        self.events.add(event_id)

    def get_install(self, install_id):
        return self.installs.get(install_id)

    def put_install(self, install_id, record):
        self.installs[install_id] = dict(record)


def sub_event(event_id, occurred_at, status, ends_at="2026-10-23T00:00:00Z", install=INSTALL, sub="sub_01"):
    return {
        "event_id": event_id,
        "event_type": "subscription.updated",
        "occurred_at": occurred_at,
        "data": {
            "id": sub,
            "status": status,
            "customer_id": "ctm_01",
            "custom_data": {"installId": install},
            "current_billing_period": {"starts_at": "2026-09-23T00:00:00Z", "ends_at": ends_at},
        },
    }


class SignatureTests(unittest.TestCase):
    def test_valid_signature(self):
        raw = b'{"event_id":"evt_1"}'
        now = time.time()
        self.assertTrue(pb.verify_signature(raw, sign(raw, int(now)), SECRET, now))

    def test_tampered_body_rejected(self):
        raw = b'{"event_id":"evt_1"}'
        now = time.time()
        self.assertFalse(pb.verify_signature(b'{"event_id":"evt_2"}', sign(raw, int(now)), SECRET, now))

    def test_wrong_secret_and_missing_header_rejected(self):
        raw = b"{}"
        now = time.time()
        self.assertFalse(pb.verify_signature(raw, sign(raw, int(now), "other"), SECRET, now))
        self.assertFalse(pb.verify_signature(raw, None, SECRET, now))
        self.assertFalse(pb.verify_signature(raw, "ts=abc;h1=", SECRET, now))
        self.assertFalse(pb.verify_signature(raw, sign(raw, int(now)), "", now))

    def test_replay_outside_tolerance_rejected(self):
        raw = b"{}"
        old = int(time.time()) - 3600
        self.assertFalse(pb.verify_signature(raw, sign(raw, old), SECRET, time.time()))

    def test_secret_rotation_multiple_h1(self):
        raw = b"{}"
        now = int(time.time())
        good = sign(raw, now).split(";")[1]
        header = f"ts={now};h1=deadbeef;{good}"
        self.assertTrue(pb.verify_signature(raw, header, SECRET, now))


class EventTests(unittest.TestCase):
    def test_activation_grants_premium(self):
        store = FakeStore()
        self.assertEqual(pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active")), "applied")
        ent = pb.entitlement_for(store.get_install(INSTALL), datetime(2026, 9, 24, tzinfo=timezone.utc))
        self.assertTrue(ent["premium"])

    def test_duplicate_event_ignored(self):
        store = FakeStore()
        pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active"))
        self.assertEqual(pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "canceled")), "duplicate")
        self.assertEqual(store.get_install(INSTALL)["status"], "active")

    def test_out_of_order_older_event_does_not_override(self):
        store = FakeStore()
        pb.apply_event(store, sub_event("evt_2", "2026-09-25T10:00:00Z", "canceled"))
        self.assertEqual(pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active")), "stale")
        self.assertFalse(pb.entitlement_for(store.get_install(INSTALL))["premium"])

    def test_cancellation_and_expiry(self):
        store = FakeStore()
        pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active", ends_at="2026-10-23T00:00:00Z"))
        after_period = datetime(2026, 10, 24, tzinfo=timezone.utc)
        self.assertFalse(pb.entitlement_for(store.get_install(INSTALL), after_period)["premium"])
        pb.apply_event(store, sub_event("evt_2", "2026-09-30T10:00:00Z", "canceled"))
        self.assertFalse(pb.entitlement_for(store.get_install(INSTALL), datetime(2026, 10, 1, tzinfo=timezone.utc))["premium"])

    def test_paused_is_not_premium_past_due_is(self):
        store = FakeStore()
        now = datetime(2026, 9, 24, tzinfo=timezone.utc)
        pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "past_due"))
        self.assertTrue(pb.entitlement_for(store.get_install(INSTALL), now)["premium"])
        pb.apply_event(store, sub_event("evt_2", "2026-09-23T11:00:00Z", "paused"))
        self.assertFalse(pb.entitlement_for(store.get_install(INSTALL), now)["premium"])

    def test_unlinked_or_forged_install_id_ignored(self):
        store = FakeStore()
        self.assertEqual(pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active", install="../admin")), "ignored_unlinked")
        self.assertEqual(store.installs, {})

    def test_malformed_and_non_subscription_events(self):
        store = FakeStore()
        self.assertEqual(pb.apply_event(store, {"event_type": "subscription.updated"}), "ignored_malformed")
        tx = {"event_id": "evt_9", "event_type": "transaction.completed", "occurred_at": "2026-09-23T10:00:00Z", "data": {}}
        self.assertEqual(pb.apply_event(store, tx), "ignored_type")

    def test_late_event_for_old_subscription_keeps_new_one(self):
        store = FakeStore()
        pb.apply_event(store, sub_event("evt_new", "2026-09-25T10:00:00Z", "active", sub="sub_new"))
        self.assertEqual(
            pb.apply_event(store, sub_event("evt_old", "2026-09-26T10:00:00Z", "canceled", sub="sub_old")),
            "ignored_other_subscription")
        self.assertEqual(store.get_install(INSTALL)["subscription_id"], "sub_new")

    def test_storage_failure_lets_paddle_retry(self):
        class FailingStore(FakeStore):
            def put_install(self, install_id, record):
                raise RuntimeError("db down")
        store = FailingStore()
        with self.assertRaises(RuntimeError):
            pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active"))
        self.assertFalse(store.is_event_processed("evt_1"))

    def test_no_record_means_no_premium(self):
        self.assertEqual(pb.entitlement_for(None), {"premium": False, "status": "none"})


class HandlerTests(unittest.TestCase):
    def setUp(self):
        os.environ["ALLOWED_ORIGIN"] = "https://icon-xb.github.io"

    def test_webhook_rejects_unsigned_request(self):
        store = FakeStore()
        body = json.dumps(sub_event("evt_1", "2026-09-23T10:00:00Z", "active"))
        res = pb.webhook_handler({"body": body, "headers": {}}, None, store=store, secret=SECRET)
        self.assertEqual(res["statusCode"], 401)
        self.assertEqual(store.installs, {})

    def test_webhook_accepts_signed_request(self):
        store = FakeStore()
        body = json.dumps(sub_event("evt_1", "2026-09-23T10:00:00Z", "active"))
        header = sign(body.encode(), int(time.time()))
        res = pb.webhook_handler({"body": body, "headers": {"Paddle-Signature": header}}, None, store=store, secret=SECRET)
        self.assertEqual(res["statusCode"], 200)
        self.assertIn(INSTALL, store.installs)

    def test_entitlement_validates_input_and_minimises_output(self):
        store = FakeStore()
        bad = pb.entitlement_handler({"queryStringParameters": {"installId": "' OR 1=1"}}, None, store=store)
        self.assertEqual(bad["statusCode"], 400)
        pb.apply_event(store, sub_event("evt_1", "2026-09-23T10:00:00Z", "active", ends_at="2999-01-01T00:00:00Z"))
        ok = pb.entitlement_handler({"queryStringParameters": {"installId": INSTALL}, "headers": {"Origin": "https://icon-xb.github.io"}}, None, store=store)
        body = json.loads(ok["body"])
        self.assertTrue(body["premium"])
        self.assertNotIn("customer_id", body)  # no customer identifiers leave the server
        self.assertEqual(ok["headers"]["Access-Control-Allow-Origin"], "https://icon-xb.github.io")
        other = pb.entitlement_handler({"queryStringParameters": {"installId": INSTALL}, "headers": {"Origin": "https://evil.example"}}, None, store=store)
        self.assertNotIn("Access-Control-Allow-Origin", other["headers"])


if __name__ == "__main__":
    unittest.main()
