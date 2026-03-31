# Claude Code Powerups - Windows Installer
# Run locally: .\install.ps1
# Or one-liner: iex (iwr https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/install.ps1).Content

$ErrorActionPreference = "Stop"

$HOME_DIR     = $env:USERPROFILE
$HELPERS_DIR  = "$HOME_DIR\.claude\helpers"
$MEMORY_DIR   = "$HOME_DIR\.claude\memory"
$SETTINGS     = "$HOME_DIR\.claude\settings.json"
# Forward slashes — Git Bash (used by Claude Code on Windows) needs them
$SCRIPT_PATH  = ($HELPERS_DIR -replace '\\','/') + "/statusline-simple.cjs"

$GREEN  = "`e[32m"; $CYAN = "`e[36m"; $YELLOW = "`e[33m"; $RESET = "`e[0m"
function Log-Step($m) { Write-Host "${CYAN}  → $m${RESET}" }
function Log-Ok($m)   { Write-Host "${GREEN}  ✓ $m${RESET}" }
function Log-Warn($m) { Write-Host "${YELLOW}  ! $m${RESET}" }

Write-Host ""
Write-Host "${CYAN}  Claude Code Powerups${RESET}"
Write-Host "  ─────────────────────"
Write-Host ""

# ─── Prereqs ──────────────────────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "${YELLOW}  Node.js is required but not found.${RESET}"
  Write-Host "  Install it from https://nodejs.org and re-run this script."
  exit 1
}
Log-Ok "Node.js $(node --version) found"

# ─── Create dirs ──────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $HELPERS_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $MEMORY_DIR  | Out-Null

# ─── Copy statusline script ───────────────────────────────────────────────────
Log-Step "Installing statusline script..."
$src = Join-Path $PSScriptRoot "statusline\statusline-simple.cjs"
if (-not (Test-Path $src)) {
  # When run via iex (remote), download the file
  $raw = "https://raw.githubusercontent.com/YOUR_USERNAME/claude-code-powerups/main/statusline/statusline-simple.cjs"
  Invoke-WebRequest -Uri $raw -OutFile "$HELPERS_DIR\statusline-simple.cjs"
} else {
  Copy-Item $src "$HELPERS_DIR\statusline-simple.cjs" -Force
}
Log-Ok "Copied statusline-simple.cjs"

# ─── Patch settings.json with absolute path ───────────────────────────────────
Log-Step "Configuring settings.json..."

$statusLineConfig = [PSCustomObject]@{
  type    = "command"
  command = "node $SCRIPT_PATH"
}

if (Test-Path $SETTINGS) {
  $raw = Get-Content $SETTINGS -Raw
  try   { $json = $raw | ConvertFrom-Json }
  catch { Log-Warn "settings.json is invalid JSON — creating backup and resetting"; Copy-Item $SETTINGS "$SETTINGS.bak"; $json = [PSCustomObject]@{} }
} else {
  $json = [PSCustomObject]@{}
}

# Add or replace statusLine
if ($json.PSObject.Properties['statusLine']) {
  $json.statusLine = $statusLineConfig
} else {
  $json | Add-Member -NotePropertyName 'statusLine' -NotePropertyValue $statusLineConfig
}

$json | ConvertTo-Json -Depth 10 | Set-Content $SETTINGS -Encoding UTF8
Log-Ok "settings.json updated (path: $SCRIPT_PATH)"

# ─── Install memory templates ─────────────────────────────────────────────────
Log-Step "Installing memory templates..."
$templateDir = Join-Path $PSScriptRoot "memory\templates"
if (Test-Path $templateDir) {
  foreach ($f in Get-ChildItem $templateDir -File) {
    $dest = Join-Path $MEMORY_DIR $f.Name
    if (-not (Test-Path $dest)) {
      Copy-Item $f.FullName $dest
      Log-Ok "Created $($f.Name)"
    } else {
      Log-Warn "Skipped $($f.Name) (already exists)"
    }
  }
}

# ─── Session alias helpers ────────────────────────────────────────────────────
Log-Step "Adding session helpers to PowerShell profile..."
$snippet = Join-Path $PSScriptRoot "session-aliases\powershell-snippet.ps1"
if (Test-Path $snippet) {
  $profilePath = $PROFILE.CurrentUserAllHosts
  New-Item -ItemType File -Force -Path $profilePath | Out-Null
  $profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
  if ($profileContent -match "claude-sessions-helper") {
    Log-Warn "Session helpers already in profile — skipping"
  } else {
    Add-Content $profilePath "`n# ── Claude Code Session Helpers ──"
    Get-Content $snippet | Add-Content $profilePath
    Log-Ok "Added to $profilePath"
  }
}

# ─── Verify script works ──────────────────────────────────────────────────────
Log-Step "Testing statusline script..."
$testJson = '{"model":{"display_name":"Sonnet"},"context_window":{"used_percentage":10},"cost":{"total_cost_usd":0.01}}'
$result = $testJson | node "$HELPERS_DIR\statusline-simple.cjs" 2>&1
if ($LASTEXITCODE -eq 0 -and $result) {
  Log-Ok "Script test passed"
} else {
  Log-Warn "Script test produced no output — check Node.js installation"
}

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "${GREEN}  Done! Restart Claude Code to see the statusline.${RESET}"
Write-Host ""
Write-Host "  It will appear at the bottom of the Claude Code UI showing:"
Write-Host "  model name · context bar · token counts · session cost"
Write-Host ""
