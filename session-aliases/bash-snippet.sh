# ── Claude Code Session Helpers ──
# Marker for installer: claude-sessions-helper
#
# Add named session shortcuts below.
# To get a session ID: claude --print-session-id
#
# TEMPLATE — copy and fill in:
# my-project() { claude --resume "YOUR-SESSION-ID-HERE" --dangerously-skip-permissions; }

# Shows all configured session shortcuts
my-claude-sessions() {
  echo ""
  echo "  Claude Session Shortcuts"
  echo "  ------------------------"

  RC="${BASH_SOURCE[0]:-${(%):-%x}}"  # works in bash and zsh
  if [ -f "$HOME/.zshrc" ]; then RC="$HOME/.zshrc"; elif [ -f "$HOME/.bashrc" ]; then RC="$HOME/.bashrc"; fi

  if grep -q "claude --resume" "$RC" 2>/dev/null; then
    grep -oP '(?<=function |alias )\S+(?=\s*\(\)\s*\{[^}]*claude --resume)' "$RC" 2>/dev/null \
      | while read -r name; do echo "  $name"; done
  else
    echo "  (no sessions configured yet)"
    echo ""
    echo "  Add sessions to $RC like:"
    echo "    my-project() { claude --resume \"YOUR-ID\" --dangerously-skip-permissions; }"
  fi
  echo ""
}
