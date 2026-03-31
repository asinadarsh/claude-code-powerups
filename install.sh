#!/usr/bin/env bash
# Claude Code Powerups - Mac / Linux / Git Bash Installer
# Run locally:  bash install.sh
# One-liner:    bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/install.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
HOME_DIR="$HOME"
HELPERS_DIR="$HOME_DIR/.claude/helpers"
MEMORY_DIR="$HOME_DIR/.claude/memory"
SETTINGS="$HOME_DIR/.claude/settings.json"
# Absolute path used in settings.json — avoids ~ expansion issues
SCRIPT_PATH="$HELPERS_DIR/statusline-simple.cjs"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; RESET='\033[0m'
log_step() { printf "${CYAN}  → %s${RESET}\n" "$1"; }
log_ok()   { printf "${GREEN}  ✓ %s${RESET}\n" "$1"; }
log_warn() { printf "${YELLOW}  ! %s${RESET}\n" "$1"; }

printf "\n${CYAN}  Claude Code Powerups${RESET}\n"
printf "  ─────────────────────\n\n"

# ─── Prereqs ──────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  printf "${YELLOW}  Node.js is required but not found.\n"
  printf "  Install it from https://nodejs.org and re-run this script.${RESET}\n"
  exit 1
fi
log_ok "Node.js $(node --version) found"

mkdir -p "$HELPERS_DIR" "$MEMORY_DIR"

# ─── Copy statusline script ───────────────────────────────────────────────────
log_step "Installing statusline script..."
LOCAL_SRC="$SCRIPT_DIR/statusline/statusline-simple.cjs"
if [ -f "$LOCAL_SRC" ]; then
  cp "$LOCAL_SRC" "$SCRIPT_PATH"
else
  # Remote install — download the file
  RAW_URL="https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/statusline/statusline-simple.cjs"
  if command -v curl &>/dev/null; then
    curl -fsSL "$RAW_URL" -o "$SCRIPT_PATH"
  elif command -v wget &>/dev/null; then
    wget -qO "$SCRIPT_PATH" "$RAW_URL"
  else
    printf "${YELLOW}  curl or wget required for remote install${RESET}\n"; exit 1
  fi
fi
chmod +x "$SCRIPT_PATH"
log_ok "Copied to $SCRIPT_PATH"

# ─── Patch settings.json with absolute path ───────────────────────────────────
log_step "Configuring settings.json..."

# Use node to safely merge — works on all platforms where node exists
node - "$SETTINGS" "$SCRIPT_PATH" <<'EOF'
const fs   = require('fs');
const file = process.argv[2];
const cmd  = `node ${process.argv[3]}`;

let cfg = {};
if (fs.existsSync(file)) {
  try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { /* start fresh if corrupt */ }
}
cfg.statusLine = { type: 'command', command: cmd };
fs.mkdirSync(require('path').dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
EOF

log_ok "settings.json updated (command: node $SCRIPT_PATH)"

# ─── Memory templates ─────────────────────────────────────────────────────────
log_step "Installing memory templates..."
TEMPLATE_DIR="$SCRIPT_DIR/memory/templates"
if [ -d "$TEMPLATE_DIR" ]; then
  for f in "$TEMPLATE_DIR"/*; do
    dest="$MEMORY_DIR/$(basename "$f")"
    if [ ! -f "$dest" ]; then
      cp "$f" "$dest"
      log_ok "Created $(basename "$f")"
    else
      log_warn "Skipped $(basename "$f") (already exists)"
    fi
  done
fi

# ─── Session alias helpers ────────────────────────────────────────────────────
log_step "Adding session helpers to shell profile..."

# Detect shell config file
if [ -n "${ZSH_VERSION:-}" ] || [ -f "$HOME/.zshrc" ]; then
  RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  RC="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
  RC="$HOME/.bash_profile"
else
  RC="$HOME/.bashrc"
fi

SNIPPET="$SCRIPT_DIR/session-aliases/bash-snippet.sh"
if [ -f "$SNIPPET" ]; then
  if grep -q "claude-sessions-helper" "$RC" 2>/dev/null; then
    log_warn "Session helpers already in $RC — skipping"
  else
    { echo ""; echo "# ── Claude Code Session Helpers ──"; cat "$SNIPPET"; } >> "$RC"
    log_ok "Added to $RC"
    log_warn "Reload shell: source $RC"
  fi
fi

# ─── Verify ───────────────────────────────────────────────────────────────────
log_step "Testing statusline script..."
TEST='{"model":{"display_name":"Sonnet"},"context_window":{"used_percentage":10},"cost":{"total_cost_usd":0.01}}'
if result=$(echo "$TEST" | node "$SCRIPT_PATH" 2>/dev/null) && [ -n "$result" ]; then
  log_ok "Script test passed"
else
  log_warn "Script test produced no output — check Node.js"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
printf "\n${GREEN}  Done! Restart Claude Code to see the statusline.${RESET}\n\n"
printf "  It appears at the bottom of the Claude Code UI:\n"
printf "  ${CYAN}model name · context bar · token counts · session cost${RESET}\n\n"
