"""Former AI extraction endpoint — intentionally disabled.

The previous version returned a hard-coded "Data Networks - Subnetting"
result with a made-up 0.94 confidence for every image, and the PWA never
called it. It has been removed from template.yaml so it cannot be deployed
by accident. Smart Scan now runs OpenCV on the device and, only if the user
turns it on, sends the cleaned image to Google Gemini with the user's own
API key (see agent.js).

If a server-side extraction service is built later, it must verify the
caller, enforce quotas, validate uploads and model output, and never return
fabricated results.
"""

import json


def lambda_handler(event, context):
    return {
        "statusCode": 501,
        "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"},
        "body": json.dumps({"error": "not_implemented"}),
    }
