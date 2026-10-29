#!/usr/bin/env bash
set -Eeuo pipefail

ENV_NAME="esp32dev"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
FIRMWARE_DIR="$ROOT_DIR/firmware"
VENV_DIR="$FIRMWARE_DIR/.venv"
PRIVATE_HEADER="$FIRMWARE_DIR/include/wifi_credentials.h"
EXAMPLE_HEADER="$FIRMWARE_DIR/include/wifi_credentials.example.h"
PORT=""
BUILD_ONLY=false
NO_MONITOR=false

usage() {
  cat <<'EOF'
Usage: scripts/setup-and-flash.sh [--port PORT] [--build-only] [--no-monitor]

Builds firmware for esp32dev, then optionally uploads and opens the serial
monitor. Normal uploads do not erase flash or NVS.
EOF
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

while (($#)); do
  case "$1" in
    --port)
      (($# >= 2)) || fail "--port requires a serial device path"
      PORT="$2"
      shift 2
      ;;
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --no-monitor)
      NO_MONITOR=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "unknown option: $1"
      ;;
  esac
done

PIO=""
if [[ -x "$VENV_DIR/bin/pio" ]]; then
  PIO="$VENV_DIR/bin/pio"
elif [[ -x "$HOME/.venvs/platformio/bin/pio" ]]; then
  PIO="$HOME/.venvs/platformio/bin/pio"
elif command -v pio >/dev/null 2>&1; then
  PIO="$(command -v pio)"
else
  command -v python3 >/dev/null 2>&1 || fail "Python 3 is required to install PlatformIO."
  printf 'Creating project-local Python environment at %s\n' "$VENV_DIR"
  if ! python3 -m venv "$VENV_DIR"; then
    fail "Could not create a Python virtual environment. Install python3-venv, then rerun."
  fi
  if ! "$VENV_DIR/bin/python" -m pip install --upgrade platformio; then
    fail "PlatformIO installation failed. Check Python, network access, and package-index availability."
  fi
  PIO="$VENV_DIR/bin/pio"
fi

INI="$FIRMWARE_DIR/platformio.ini"
[[ -f "$INI" ]] || fail "Missing firmware/platformio.ini."
if ! awk -F '=' '
  /^[[:space:]]*default_envs[[:space:]]*=/ {
    gsub(/[[:space:]]/, "", $2)
    if ($2 == "esp32dev") default_env = 1
  }
  /^\[env:esp32dev\][[:space:]]*$/ { in_env = 1; next }
  /^\[/ { in_env = 0 }
  in_env && /^[[:space:]]*board[[:space:]]*=/ {
    gsub(/[[:space:]]/, "", $2)
    if ($2 == "esp32dev") board = 1
  }
  END { exit !(default_env && board) }
' "$INI"; then
  fail "PlatformIO target mismatch: expected default environment [env:esp32dev] with board = esp32dev."
fi
printf 'Verified PlatformIO target: %s (board esp32dev)\n' "$ENV_NAME"

if [[ ! -f "$PRIVATE_HEADER" ]]; then
  [[ -f "$EXAMPLE_HEADER" ]] || fail "Missing Wi-Fi header template: $EXAMPLE_HEADER"
  cp -- "$EXAMPLE_HEADER" "$PRIVATE_HEADER"
  chmod 600 "$PRIVATE_HEADER"
  printf 'Created ignored local credential template: %s\n' "$PRIVATE_HEADER"
  fail "Edit the local Wi-Fi header with your credentials, then rerun. Its contents are never displayed."
fi
if grep -q 'replace-with-your-router' "$PRIVATE_HEADER"; then
  fail "The local Wi-Fi header still contains template placeholders. Edit it and rerun; its contents are never displayed."
fi

printf '\nBuilding firmware for %s...\n' "$ENV_NAME"
if ! (cd "$FIRMWARE_DIR" && "$PIO" run -e "$ENV_NAME"); then
  fail "Firmware build failed. Review the PlatformIO diagnostics above."
fi
printf 'Firmware build succeeded.\n'

if [[ "$BUILD_ONLY" == true ]]; then
  printf 'Build-only mode complete; no device was accessed or changed.\n'
  exit 0
fi

if [[ -z "$PORT" ]]; then
  shopt -s nullglob
  PORT_CANDIDATES=(/dev/serial/by-id/*)
  if ((${#PORT_CANDIDATES[@]} == 0)); then
    PORT_CANDIDATES=(/dev/ttyUSB* /dev/ttyACM*)
  fi
  shopt -u nullglob

  if ((${#PORT_CANDIDATES[@]} == 1)); then
    PORT="${PORT_CANDIDATES[0]}"
  elif ((${#PORT_CANDIDATES[@]} > 1)); then
    printf 'Detected serial ports:\n'
    printf '  %s\n' "${PORT_CANDIDATES[@]}"
  fi

  if [[ -z "$PORT" ]]; then
    [[ -t 0 ]] || fail "No serial port was selected. Rerun with --port /dev/ttyUSB0."
    read -r -p "Serial port (for example /dev/ttyUSB0): " PORT
  fi
fi
[[ -e "$PORT" ]] || fail "Serial port does not exist: $PORT"
if [[ ! -r "$PORT" || ! -w "$PORT" ]]; then
  fail "No read/write access to $PORT. Check the device and your dialout group membership; do not change permissions globally."
fi

[[ -t 0 ]] || fail "Upload requires an interactive confirmation. Run from a terminal or use --build-only."
printf '\nTarget port: %s\n' "$PORT"
read -r -p "Confirm the relay module AND all external loads are disconnected before upload [y/N]: " CONFIRM
[[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]] || fail "Upload cancelled; no device was changed."

printf 'Uploading firmware to %s...\n' "$PORT"
if ! (cd "$FIRMWARE_DIR" && "$PIO" run -e "$ENV_NAME" -t upload --upload-port "$PORT"); then
  fail "Firmware upload failed. Verify the selected port, USB cable, driver, and bootloader mode."
fi
printf 'Firmware upload succeeded. This does not verify serial startup, HTTP connectivity, or physical relay behavior.\n'

if [[ "$NO_MONITOR" == true ]]; then
  printf 'Serial monitor skipped by request.\n'
  exit 0
fi

read -r -p "Open the 115200-baud serial monitor now? [Y/n]: " MONITOR || MONITOR="n"
if [[ "$MONITOR" != "n" && "$MONITOR" != "N" ]]; then
  printf 'Monitoring %s at 115200 baud. Press Ctrl+C to stop; if startup lines were missed, attach the monitor before one deliberate reset with relay hardware disconnected.\n' "$PORT"
  (cd "$FIRMWARE_DIR" && "$PIO" device monitor --port "$PORT" --baud 115200) || \
    fail "Serial monitor exited with an error."
else
  printf 'Serial monitor skipped. Startup, HTTP, and physical relay operation remain unverified by this script.\n'
fi
