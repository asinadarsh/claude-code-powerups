# Claude Code Powerups - Windows Installer
# Run from PowerShell: iex (iwr https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/install.ps1).Content
# Or locally: .\install.ps1

param(
  [switch]$Statusline,
  [switch]$Memory,
  [switch]$SessionAliases,
  [switch]$All
)

$ErrorActionPreference = "Stop"

$HELPERS_DIR  = "$env:USERPROFILE\.claude\helpers"
$MEMORY_DIR   = "$env:USERPROFILE\.claude\memory"
$SETTINGS     = "$env:USERPROFILE\.claude\settings.json"
$PS_PROFILE   = $PROFILE.CurrentUserAllHosts   # works for both PS5 + PS7

$GREEN  = "`e[32m"
$CYAN   = "`e[36m"
$YELLOW = "`e[33m"
$RESET  = "`e[0m"

function Log-Step($msg)    { Write-Host "$CYAN  → $msg$RESET" }
function Log-Ok($msg)      { Write-Host "$GREEN  ✓ $msg$RESET" }
function Log-Warn($msg)    { Write-Host "$YELLOW  ! $msg$RESET" }

Write-Host ""
Write-Host "$CYAN  Claude Code Powerups — Installer$RESET"
Write-Host "  ────────────────────────────────"
Write-Host ""

# If no specific flags, install everything
if (-not ($Statusline -or $Memory -or $SessionAliases)) { $All = $true }

# ─── Ensure helpers dir ────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $HELPERS_DIR | Out-Null

# ─── STATUSLINE ────────────────────────────────────────────────────────────────
if ($All -or $Statusline) {
  Log-Step "Installing statusline..."

  $scriptSrc  = Join-Path $PSScriptRoot "statusline\statusline-simple.cjs"
  $scriptDest = Join-Path $HELPERS_DIR  "statusline-simple.cjs"

  if (Test-Path $scriptSrc) {
    Copy-Item $scriptSrc $scriptDest -Force
  } else {
    Log-Warn "statusline-simple.cjs not found in repo — skipping copy"
  }

  # Patch settings.json
  if (Test-Path $SETTINGS) {
    $json = Get-Content $SETTINGS -Raw | ConvertFrom-Json
    if (-not $json.statusLine) {
      $json | Add-Member -NotePropertyName "statusLine" -NotePropertyValue ([PSCustomObject]@{
        type    = "command"
        command = "node ~/.claude/helpers/statusline-simple.cjs"
      }) -Force
    } else {
      $json.statusLine.type    = "command"
      $json.statusLine.command = "node ~/.claude/helpers/statusline-simple.cjs"
    }
    $json | ConvertTo-Json -Depth 10 | Set-Content $SETTINGS -Encoding UTF8
    Log-Ok "settings.json updated with statusLine command"
  } else {
    # Create minimal settings.json
    @{
      statusLine = @{
        type    = "command"
        command = "node ~/.claude/helpers/statusline-simple.cjs"
      }
    } | ConvertTo-Json -Depth 5 | Set-Content $SETTINGS -Encoding UTF8
    Log-Ok "settings.json created"
  }

  Log-Ok "Statusline installed → restart Claude Code to see it"
}

# ─── MEMORY TEMPLATES ──────────────────────────────────────────────────────────
if ($All -or $Memory) {
  Log-Step "Installing memory templates..."

  New-Item -ItemType Directory -Force -Path $MEMORY_DIR | Out-Null

  $templateSrc = Join-Path $PSScriptRoot "memory\templates"
  if (Test-Path $templateSrc) {
    foreach ($file in Get-ChildItem $templateSrc -File) {
      $dest = Join-Path $MEMORY_DIR $file.Name
      if (-not (Test-Path $dest)) {
        Copy-Item $file.FullName $dest
        Log-Ok "Created $($file.Name)"
      } else {
        Log-Warn "Skipped $($file.Name) — already exists"
      }
    }
  }

  Log-Ok "Memory templates ready at ~/.claude/memory/"
}

# ─── SESSION ALIASES ───────────────────────────────────────────────────────────
if ($All -or $SessionAliases) {
  Log-Step "Installing session alias helpers..."

  $snippetFile = Join-Path $PSScriptRoot "session-aliases\powershell-snippet.ps1"
  if (Test-Path $snippetFile) {
    $snippet = Get-Content $snippetFile -Raw

    # Check if already installed
    $profileContent = if (Test-Path $PS_PROFILE) { Get-Content $PS_PROFILE -Raw } else { "" }
    if ($profileContent -match "claude-sessions-helper") {
      Log-Warn "Session alias helpers already in PowerShell profile — skipping"
    } else {
      Add-Content -Path $PS_PROFILE -Value "`n# ── Claude Code Session Helpers ──`n$snippet"
      Log-Ok "Added session helper functions to $PS_PROFILE"
      Log-Warn "Restart PowerShell or run: . `$PROFILE"
    }
  }
}

# ─── DONE ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "$GREEN  Installation complete!$RESET"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "  1. Restart Claude Code to apply statusline"
Write-Host "  2. Run $CYAN  my-claude-sessions  $RESET to see your named sessions"
Write-Host "  3. Edit $CYAN  ~/.claude/memory/user.md  $RESET with your profile"
Write-Host ""
