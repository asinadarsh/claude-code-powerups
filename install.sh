#!/usr/bin/env bash
# Claude Code Powerups - Mac/Linux Installer
# Run: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/install.sh | bash
# Or locally: bash install.sh

set -euo pipefail

HELPERS_DIR="$HOME/.claude/helpers"
MEMORY_DIR="$HOME/.claude/memory"
SETTINGS="$HOME/.claude/settings.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; RESET='\033[0m'
log_step() { echo -e "${CYAN}  → $1${RESET}"; }
log_ok()   { echo -e "${GREEN}  ✓ $1${RESET}"; }
log_warn() { echo -e "${YELLOW}  ! $1${RESET}"; }

echo ""
echo -e "${CYAN}  Claude Code Powerups — Installer${RESET}"
echo "  ────────────────────────────────"
echo ""

mkdir -p "$HELPERS_DIR" "$MEMORY_DIR"

# ─── STATUSLINE ───────────────────────────────────────────────────────────────
log_step "Installing statusline..."
cp "$SCRIPT_DIR/statusline/statusline-simple.cjs" "$HELPERS_DIR/statusline-simple.cjs"
chmod +x "$HELPERS_DIR/statusline-simple.cjs"

if command -v node &>/dev/null; then
  # Patch or create settings.json
  if [ -f "$SETTINGS" ]; then
    # Use node to safely merge the statusLine key
    node -e "
      const fs = require('fs');
      const s = JSON.parse(fs.readFileSync('$SETTINGS', 'utf8'));
      s.statusLine = { type: 'command', command: 'node ~/.claude/helpers/statusline-simple.cjs' };
      fs.writeFileSync('$SETTINGS', JSON.stringify(s, null, 2));
    "
    log_ok "settings.json updated"
  else
    echo '{"statusLine":{"type":"command","command":"node ~/.claude/helpers/statusline-simple.cjs"}}' \
      | node -e "const fs=require('fs'),d=require('/dev/stdin');fs.writeFileSync('$SETTINGS',JSON.stringify(d,null,2))" \
      2>/dev/null || echo '{"statusLine":{"type":"command","command":"node ~/.claude/helpers/statusline-simple.cjs"}}' > "$SETTINGS"
    log_ok "settings.json created"
  fi
  log_ok "Statusline installed → restart Claude Code to see it"
else
  log_warn "node not found — install Node.js first, then re-run"
fi

# ─── MEMORY TEMPLATES ─────────────────────────────────────────────────────────
log_step "Installing memory templates..."
for f in "$SCRIPT_DIR/memory/templates/"*; do
  dest="$MEMORY_DIR/$(basename "$f")"
  if [ ! -f "$dest" ]; then
    cp "$f" "$dest"
    log_ok "Created $(basename "$f")"
  else
    log_warn "Skipped $(basename "$f") — already exists"
  fi
done

# ─── SESSION ALIASES ──────────────────────────────────────────────────────────
log_step "Installing session alias helpers..."
SNIPPET="$SCRIPT_DIR/session-aliases/bash-snippet.sh"
SHELL_RC=""
[ -f "$HOME/.zshrc" ]  && SHELL_RC="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && SHELL_RC="${SHELL_RC:-$HOME/.bashrc}"

if [ -n "$SHELL_RC" ] && [ -f "$SNIPPET" ]; then
  if grep -q "claude-sessions-helper" "$SHELL_RC" 2>/dev/null; then
    log_warn "Session helpers already in $SHELL_RC — skipping"
  else
    echo "" >> "$SHELL_RC"
    echo "# ── Claude Code Session Helpers ──" >> "$SHELL_RC"
    cat "$SNIPPET" >> "$SHELL_RC"
    log_ok "Added session helpers to $SHELL_RC"
    log_warn "Reload shell: source $SHELL_RC"
  fi
fi

# ─── DONE ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  Installation complete!${RESET}"
echo ""
echo "  Next steps:"
echo "  1. Restart Claude Code to see the status line"
echo "  2. Run  my-claude-sessions  to see named session commands"
echo "  3. Edit  ~/.claude/memory/user.md  with your profile"
echo ""
