# Claude Code Powerups - Windows Installer
# One-liner: iex (iwr https://raw.githubusercontent.com/asinadarsh/claude-code-powerups/main/install.ps1).Content
# Or clone:  git clone https://github.com/asinadarsh/claude-code-powerups && cd claude-code-powerups && .\install.ps1

$ErrorActionPreference = "Stop"

$HOME_DIR    = $env:USERPROFILE
$HELPERS_DIR = "$HOME_DIR\.claude\helpers"
$MEMORY_DIR  = "$HOME_DIR\.claude\memory"
$SETTINGS    = "$HOME_DIR\.claude\settings.json"
$SCRIPT_PATH = ($HELPERS_DIR -replace '\\', '/') + "/statusline-simple.cjs"

function Log-Step($m) { Write-Host "  -> $m" -ForegroundColor Cyan }
function Log-Ok($m)   { Write-Host "  OK $m" -ForegroundColor Green }
function Log-Warn($m) { Write-Host "  !! $m" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  Claude Code Powerups" -ForegroundColor Cyan
Write-Host "  ---------------------"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Node.js is required. Install from https://nodejs.org then re-run." -ForegroundColor Yellow
    exit 1
}
Log-Ok "Node.js $(node --version) found"

New-Item -ItemType Directory -Force -Path $HELPERS_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $MEMORY_DIR  | Out-Null

# --- Statusline script --------------------------------------------------------
Log-Step "Installing statusline script..."

$scriptDest = "$HELPERS_DIR\statusline-simple.cjs"
$scriptSrc  = Join-Path $PSScriptRoot "statusline\statusline-simple.cjs"

if (Test-Path $scriptSrc) {
    Copy-Item $scriptSrc $scriptDest -Force
} else {
    $url = "https://raw.githubusercontent.com/asinadarsh/claude-code-powerups/main/statusline/statusline-simple.cjs"
    Invoke-WebRequest -Uri $url -OutFile $scriptDest -UseBasicParsing
}
Log-Ok "Copied statusline-simple.cjs"

# --- Patch settings.json (absolute path, no tilde) ----------------------------
Log-Step "Configuring settings.json..."

$statusLine = [PSCustomObject]@{ type = "command"; command = "node $SCRIPT_PATH" }

if (Test-Path $SETTINGS) {
    $raw = Get-Content $SETTINGS -Raw -Encoding UTF8
    try   { $json = $raw | ConvertFrom-Json }
    catch {
        Log-Warn "settings.json is invalid - creating backup and resetting"
        Copy-Item $SETTINGS "$SETTINGS.bak"
        $json = [PSCustomObject]@{}
    }
} else {
    $json = [PSCustomObject]@{}
}

if ($json.PSObject.Properties['statusLine']) {
    $json.statusLine = $statusLine
} else {
    $json | Add-Member -NotePropertyName 'statusLine' -NotePropertyValue $statusLine
}

$json | ConvertTo-Json -Depth 10 | Set-Content $SETTINGS -Encoding UTF8
Log-Ok "settings.json updated"

# --- Memory templates ---------------------------------------------------------
Log-Step "Installing memory templates..."
$templateDir = Join-Path $PSScriptRoot "memory\templates"
if (Test-Path $templateDir) {
    foreach ($f in Get-ChildItem $templateDir -File) {
        $dest = Join-Path $MEMORY_DIR $f.Name
        if (-not (Test-Path $dest)) {
            Copy-Item $f.FullName $dest
            Log-Ok "Created $($f.Name)"
        } else {
            Log-Warn "Skipped $($f.Name) - already exists"
        }
    }
}

# --- Session alias helpers ----------------------------------------------------
Log-Step "Adding session helpers to PowerShell profile..."
$snippet = Join-Path $PSScriptRoot "session-aliases\powershell-snippet.ps1"
if (Test-Path $snippet) {
    $profilePath = $PROFILE.CurrentUserAllHosts
    New-Item -ItemType File -Force -Path $profilePath | Out-Null
    $existing = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
    if ($existing -match "claude-sessions-helper") {
        Log-Warn "Session helpers already in profile - skipping"
    } else {
        Add-Content $profilePath "`n# -- Claude Code Session Helpers --"
        Get-Content $snippet | Add-Content $profilePath
        Log-Ok "Added to $profilePath"
    }
}

# --- Verify -------------------------------------------------------------------
Log-Step "Testing statusline script..."
$test   = '{"model":{"display_name":"Sonnet"},"context_window":{"used_percentage":10},"cost":{"total_cost_usd":0.01}}'
$result = $test | node $scriptDest 2>&1
if ($LASTEXITCODE -eq 0 -and $result) {
    Log-Ok "Script test passed"
} else {
    Log-Warn "Test failed - check Node.js installation"
}

# --- Done ---------------------------------------------------------------------
Write-Host ""
Write-Host "  Done! Restart Claude Code to see the statusline." -ForegroundColor Green
Write-Host ""
Write-Host "  Line 1: model  |  git branch  |  duration  |  lines changed"
Write-Host "  Line 2: ctx bar  |  tokens  |  cost  |  5h rate limit"
Write-Host ""
