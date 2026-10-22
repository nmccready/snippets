#!/usr/bin/env bash
#
# set-call-mic.sh
#
# Sets the macOS system default microphone (audio INPUT) to the best
# available device, by a fixed priority order. Built for answering relayed
# iPhone cell calls on the Mac (FaceTime / Continuity): macOS has no per-app
# input routing, so calls use the system default input. When the laptop is
# docked clamshell the built-in mic is "active" but muffled — this flips the
# default to a real headset/dongle in one keystroke.
#
# Pick = first device in MIC_PRIORITY that is currently connected (exact name
# match first, then case-insensitive substring). Idempotent: re-running when
# the best device is already selected is a no-op.
#
# Requires: switchaudio-osx  (brew install switchaudio-osx)
#
# Usage:
#   set-call-mic.sh [options]
#
# Options:
#   -l, --list      List available input devices + current default, then exit.
#   -n, --dry-run   Show which device WOULD be selected; make no changes.
#   -h, --help      Show this help.
#
# Hotkey (macOS Shortcuts):
#   1. Shortcuts.app → new shortcut "Call Mic".
#   2. Add a "Run Shell Script" action; body = the absolute path to this file.
#   3. Details → Add Keyboard Shortcut → assign your global hotkey.
#   4. Approve the Automation/Accessibility prompt on first run.
#
# Exit codes: 0 ok, 1 error.

set -euo pipefail

# ---------------------------------------------------------------------------
# config / globals
# ---------------------------------------------------------------------------

# Desired mic order, best first. Edit freely; each entry is matched against the
# live device list by exact name, then case-insensitive substring. Re-identify
# device names anytime with:  set-call-mic.sh --list
MIC_PRIORITY=(
  "BlackShark V3 X"        # headset
  "USB PnP Sound Device"   # USB mic dongle
  "MacBook Pro Microphone" # last resort (muffled when docked)
)

# runtime flags
LIST_ONLY=false
DRY_RUN=false

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

log()  { printf '%s\n' "$*"; }
info() { printf '\033[36m• %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
err()  { printf '\033[31mx %s\033[0m\n' "$*" >&2; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//'
}

# Resolve SwitchAudioSource even under the minimal PATH that macOS Shortcuts
# hands a shell action (Homebrew bins are usually not on it).
SAS=""
resolve_sas() {
  local candidate
  if candidate="$(command -v SwitchAudioSource 2>/dev/null)"; then
    SAS="$candidate"
  elif [[ -x /opt/homebrew/bin/SwitchAudioSource ]]; then
    SAS="/opt/homebrew/bin/SwitchAudioSource"   # Apple Silicon
  elif [[ -x /usr/local/bin/SwitchAudioSource ]]; then
    SAS="/usr/local/bin/SwitchAudioSource"      # Intel
  else
    err "SwitchAudioSource not found. Install it with: brew install switchaudio-osx"
    exit 1
  fi
}

# Best-effort GUI toast — the terminal isn't visible when run from a hotkey.
notify() {
  osascript -e "display notification \"$1\" with title \"Call Mic\"" >/dev/null 2>&1 || true
}

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# ---------------------------------------------------------------------------
# argument parsing (flags in any order)
# ---------------------------------------------------------------------------

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -l|--list)    LIST_ONLY=true ;;
      -n|--dry-run) DRY_RUN=true ;;
      -h|--help)    usage; exit 0 ;;
      --)           shift; break ;;
      -*)           err "Unknown option: $1"; usage; exit 1 ;;
      *)            err "Unexpected argument: $1"; usage; exit 1 ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# device selection
# ---------------------------------------------------------------------------

# Echo the first connected device matching $1 (exact name, then substring),
# scanning the newline-separated available list in $2. Empty if no match.
match_device() {
  local want="$1" available="$2" line
  # exact name match
  while IFS= read -r line; do
    [[ "$line" == "$want" ]] && { printf '%s' "$line"; return 0; }
  done <<< "$available"
  # case-insensitive substring fallback
  local want_lc; want_lc="$(lower "$want")"
  while IFS= read -r line; do
    [[ "$(lower "$line")" == *"$want_lc"* ]] && { printf '%s' "$line"; return 0; }
  done <<< "$available"
  return 1
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"
  resolve_sas

  local available current
  available="$("$SAS" -a -t input)"
  current="$("$SAS" -c -t input)"

  if $LIST_ONLY; then
    info "Available input devices:"
    while IFS= read -r line; do
      if [[ "$line" == "$current" ]]; then
        ok "  ${line}  (current default)"
      else
        log "    ${line}"
      fi
    done <<< "$available"
    exit 0
  fi

  # Walk the priority list; first connected match wins.
  local want target=""
  for want in "${MIC_PRIORITY[@]}"; do
    if target="$(match_device "$want" "$available")"; then
      break
    fi
    target=""
  done

  if [[ -z "$target" ]]; then
    err "None of the preferred mics are connected. Available inputs:"
    log "$available" >&2
    exit 1
  fi

  if [[ "$target" == "$current" ]]; then
    ok "Mic already set to: ${target}"
    exit 0
  fi

  if $DRY_RUN; then
    warn "Dry run (--dry-run): would switch mic ${current} → ${target}"
    exit 0
  fi

  "$SAS" -t input -s "$target"
  ok "Mic → ${target}  (was: ${current})"
  notify "Mic → ${target}"
}

# Run main only when executed directly, not when sourced.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
