# TODO

## Bind `set-call-mic.sh` to a global hotkey via `skhd` (Option B — recommended)

Status: **deferred** (currently using a macOS Shortcuts keyboard shortcut, which is
fine but fragile — Shortcuts keyboard bindings get dropped on rename/re-save and rely on
the flaky Services registry).

### Why `skhd` over Shortcuts

`skhd` is a tiny global-hotkey daemon. It maps a key **directly** to
`bash/set-call-mic.sh` — zero involvement from Shortcuts, Siri, Services, or multi-device
voice arbitration. It can't be broken by a rename, it fires **system-wide** (including
over fullscreen apps), and it works in **clamshell/docked** mode. This is the "just
works" path for flipping the call mic when answering FaceTime / relayed iPhone calls.

Context: `Hey Siri` can't drive this reliably on the docked MacBook — the wake-word
detector uses the built-in mic (covered by the closed lid in clamshell), it isn't routed
through the BlackShark, and cross-device arbitration hands requests to the iPhone. A
direct keystroke sidesteps all of that.

### Setup (all user-space, non-destructive)

```bash
brew install koekeishiya/formulae/skhd

# ~/.config/skhd/skhdrc
ctrl + alt - m : $HOME/code/nmccready/snippets/bash/set-call-mic.sh

skhd --start-service   # registers a launchd agent; runs at login
```

Grant **skhd** Accessibility permission once
(System Settings → Privacy & Security → Accessibility) — inherent to any real
global-hotkey tool. Then **⌃⌥M** flips the mic to the best-available device instantly,
forever.

### Notes / follow-ups

- If migrating from the Shortcuts binding, remove the keyboard shortcut from the
  "Set Call Mic" shortcut afterward to avoid a double-trigger on the same key.
- Path in `skhdrc` is hardcoded; if the repo moves, update it (or symlink the script
  onto `PATH`).
- Reload config after edits: `skhd --reload`.
