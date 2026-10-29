#!/usr/bin/env python3
"""Verify ESP32 status and GPIO mapping using GET requests only."""

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

SUPPORTED_GPIOS = {16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33}
CHANNEL_COUNT = 6


def get_json(base_url: str, endpoint: str, timeout: float) -> dict:
    request = Request(
        f"{base_url}{endpoint}",
        headers={"Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise RuntimeError(f"GET {endpoint} returned HTTP {response.status}")
            payload = json.loads(response.read())
    except HTTPError as error:
        raise RuntimeError(f"GET {endpoint} returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"GET {endpoint} failed: {error.reason}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"GET {endpoint} returned invalid JSON") from error

    if not isinstance(payload, dict):
        raise RuntimeError(f"GET {endpoint} returned a non-object JSON payload")
    return payload


def validate_device(base_url: str, timeout: float) -> tuple[dict, dict, dict]:
    status = get_json(base_url, "/api/v1/status", timeout)
    device = get_json(base_url, "/api/v1/device", timeout)
    mapping = get_json(base_url, "/api/v1/config/relays", timeout)

    relays = status.get("relays")
    if (
        not isinstance(relays, list)
        or len(relays) != CHANNEL_COUNT
        or any(
            not isinstance(relay, dict)
            or relay.get("id") != index
            or not isinstance(relay.get("state"), bool)
            for index, relay in enumerate(relays, start=1)
        )
    ):
        raise RuntimeError("Status response must contain six boolean channel states.")

    active = mapping.get("activeGpios")
    channels = mapping.get("channels")
    if (
        not isinstance(active, list)
        or len(active) != CHANNEL_COUNT
        or any(type(gpio) is not int or gpio not in SUPPORTED_GPIOS for gpio in active)
        or len(set(active)) != CHANNEL_COUNT
    ):
        raise RuntimeError("Mapping response contains an invalid activeGpios mapping.")
    if (
        not isinstance(channels, list)
        or len(channels) != CHANNEL_COUNT
        or channels != [{"id": index, "gpio": gpio} for index, gpio in enumerate(active, 1)]
    ):
        raise RuntimeError("Mapping response channels do not match activeGpios.")
    if mapping.get("polarity") != "ACTIVE_HIGH":
        raise RuntimeError("Mapping response has an unexpected relay polarity.")
    if not isinstance(mapping.get("allRelaysOff"), bool) or not isinstance(
        mapping.get("commandPending"), bool
    ):
        raise RuntimeError("Mapping response is missing command-state indicators.")

    return status, device, mapping


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read and validate ESP32 status and relay mapping; sends GET requests only."
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help="Explicit controller origin, for example http://192.168.0.102",
    )
    parser.add_argument("--timeout", type=float, default=5.0, help="Per-request timeout in seconds")
    args = parser.parse_args()

    parsed_url = urlsplit(args.base_url)
    if (
        parsed_url.scheme not in {"http", "https"}
        or not parsed_url.netloc
        or parsed_url.username is not None
        or parsed_url.password is not None
        or parsed_url.query
        or parsed_url.fragment
        or args.timeout <= 0
    ):
        parser.error("Use an http(s) origin without credentials, query, or fragment and a positive timeout.")
    base_url = args.base_url.rstrip("/")

    try:
        status, device, mapping = validate_device(base_url, args.timeout)
    except (RuntimeError, OSError) as error:
        print(f"FAILED: {error}", file=sys.stderr)
        return 1

    commanded_off = all(not relay["state"] for relay in status["relays"])
    active_gpios = mapping["activeGpios"]
    print("PASS: status, device, and relay mapping GET responses validated.")
    print(f"Device: {device.get('model', 'unknown')} / {device.get('firmware', 'unknown')}")
    print(f"Controller-reported IP: {device.get('ip', 'unknown')}")
    print(f"Active GPIO mapping by channel: {active_gpios}")
    print(
        "Controller-reported states: "
        + ("all OFF" if commanded_off else "one or more ON")
        + f"; mapping allRelaysOff={mapping['allRelaysOff']}, "
        + f"commandPending={mapping['commandPending']}."
    )
    print(
        "Reminder: states are firmware command bookkeeping, not physical relay/load feedback. "
        "This check does not verify NVS persistence and never sends writes or relay commands."
    )
    if not commanded_off or not mapping["allRelaysOff"] or mapping["commandPending"]:
        print("NOT READY for any mapping change: the software state is not safely idle.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
