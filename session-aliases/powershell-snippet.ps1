# ── Claude Code Session Helpers ──
# Marker for installer: claude-sessions-helper
#
# Add named session shortcuts below. Each function resumes a saved Claude Code session.
# Usage: Add your own sessions using the pattern shown here.
#
# To get a session ID: after starting a Claude Code session, run:
#   claude --print-session-id
# Then add it here as a new function.

# ──────────────────────────────────────────────────────────────────────────────
# TEMPLATE — copy and fill in your own sessions:
# function my-project { claude --resume "YOUR-SESSION-ID-HERE" --dangerously-skip-permissions }
# ──────────────────────────────────────────────────────────────────────────────

# Shows all configured session shortcuts
function my-claude-sessions {
    Write-Host ""
    Write-Host "  Claude Session Shortcuts" -ForegroundColor Cyan
    Write-Host "  ------------------------" -ForegroundColor DarkGray

    # List all functions in this profile that map to claude sessions
    $profileContent = Get-Content $PROFILE.CurrentUserAllHosts -Raw -ErrorAction SilentlyContinue
    if ($profileContent) {
        $matches = [regex]::Matches($profileContent, 'function\s+([\w-]+)\s*\{[^}]*claude --resume')
        if ($matches.Count -gt 0) {
            foreach ($m in $matches) {
                Write-Host "  $($m.Groups[1].Value)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  (no sessions configured yet)" -ForegroundColor DarkGray
            Write-Host ""
            Write-Host "  Add sessions to your PowerShell profile:" -ForegroundColor DarkGray
            Write-Host "  notepad `$PROFILE" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
}

# Quick helper: open PowerShell profile in notepad
function edit-claude-profile {
    notepad $PROFILE.CurrentUserAllHosts
}
