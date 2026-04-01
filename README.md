# Claude Code Powerups

Practical enhancements for [Claude Code](https://claude.ai/code) that work out of the box — no extra services, no npm installs, no ruflo required.

## What's included

| Feature | What it does |
|---------|-------------|
| **Statusline** | Live 2-line status bar showing model, context, tokens, cost, git branch, and rate limits |
| **Session Aliases** | Named shortcuts to resume your Claude sessions from any terminal |
| **Memory Templates** | File-based persistent memory so Claude remembers context across sessions |
| **CLAUDE.md Starter** | A production-ready project config template |

---

## Quick Install

### Windows (PowerShell)

```powershell
git clone https://github.com/asinadarsh/claude-code-powerups.git
cd claude-code-powerups
.\install.ps1
```

### Mac / Linux / Git Bash

```bash
git clone https://github.com/asinadarsh/claude-code-powerups.git
cd claude-code-powerups
bash install.sh
```

Then **restart Claude Code**.

> **Note**: The installers write your full absolute home path into `settings.json` automatically — works on any OS, username, or terminal.

---

## Features

### 1. Statusline

A live 2-line status bar at the bottom of Claude Code. Updates after every response.

```
◆ Sonnet  │  git: main  │  ⏱ 32m 10s  │  +156 -23
ctx ██░░░░░░░░ 22%  │  ↑44k ↓8k  │  $0.18  │  5h: ▪▪▪▪·· 45% resets 2h0m
```

#### Line 1 — Session info

| Segment | Example | Meaning |
|---------|---------|---------|
| `◆ Sonnet` | `◆ Opus` / `◆ Haiku` | Current model. Purple = Opus, Cyan = Sonnet, Green = Haiku |
| `git: main` | `git: feature/auth` | Active git branch in the current working directory |
| `⏱ 32m 10s` | `⏱ 1h 5m` | How long this Claude Code session has been running |
| `+156 -23` | `+12 -4` | Lines of code added (green) and removed (red) this session |

#### Line 2 — Usage & limits

| Segment | Example | Meaning |
|---------|---------|---------|
| `ctx ██░░░░░░░░ 22%` | `ctx ████████░░ 83%` | Context window usage. Bar fills up as you use more context. Green → Yellow → Red as it fills |
| `↑44k ↓8k` | `↑166k ↓21k` | Tokens sent to Claude (↑ input) and received back (↓ output) this session |
| `$0.18` | `$2.40` | Total API cost for this session in USD |
| `5h: ▪▪▪▪·· 45% resets 2h0m` | `5h: ▪▪▪▪▪▪▪▪▪· 92%` | Your 5-hour Claude rate limit window. Green → Yellow at 70% → Red at 90%. Shows time until the window resets. Only visible on Claude Pro/Max plans |

#### Rate limit alert

When your 5-hour limit hits 90%+, the entire statusline prefixes with a flashing warning:

```
⚡ RATE LIMIT CRITICAL  │  ◆ Sonnet  │  git: main  │  ...
```

#### Context window colors

| Color | Usage | Meaning |
|-------|-------|---------|
| 🟢 Green | 0–49% | Plenty of context remaining |
| 🟡 Yellow | 50–79% | Getting used — consider wrapping up or compacting |
| 🔴 Red | 80–100% | Context nearly full — use `/compact` soon |

---

### Manual install

1. Copy `statusline/statusline-simple.cjs` to `~/.claude/helpers/`
2. Add to `~/.claude/settings.json` using your **full absolute path** (not `~`):

   **Mac / Linux**
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node /home/YOUR_USERNAME/.claude/helpers/statusline-simple.cjs"
     }
   }
   ```

   **Windows** (forward slashes required)
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node C:/Users/YOUR_USERNAME/.claude/helpers/statusline-simple.cjs"
     }
   }
   ```

3. Restart Claude Code

> **Why absolute path?** Claude Code runs the statusline through Git Bash on Windows where `~` does not expand. Full path works on every OS and terminal.

**Requirements**: Node.js 18+. No npm packages needed.

---

### 2. Session Aliases

Resume named Claude Code sessions from your terminal in one command:

```powershell
# PowerShell
my-project          # resumes your saved Claude session
my-claude-sessions  # lists all configured shortcuts
```

```bash
# bash / zsh
my-project
my-claude-sessions
```

**How to add your own sessions:**

1. Start a Claude session and copy the session ID from the URL or run:
   ```bash
   claude --print-session-id
   ```

2. Add to your shell profile:

   **PowerShell** (`$PROFILE`):
   ```powershell
   function my-project { claude --resume "YOUR-SESSION-ID" --dangerously-skip-permissions }
   ```

   **bash/zsh** (`~/.bashrc` or `~/.zshrc`):
   ```bash
   my-project() { claude --resume "YOUR-SESSION-ID" --dangerously-skip-permissions; }
   ```

The installer adds `my-claude-sessions` and `edit-claude-profile` helper commands automatically.

---

### 3. Persistent Memory

Claude remembers who you are and how you work — across sessions.

**How it works:**
1. Memory files live in `~/.claude/memory/`
2. Add this to your `CLAUDE.md`:
   ```markdown
   At the start of every session, read files in `~/.claude/memory/`:
   - `MEMORY.md` — index of all memory files
   - `user.md` — my background and preferences
   - `feedback.md` — rules Claude should follow
   - `decisions.md` — key decisions and their reasoning
   ```
3. Tell Claude *"remember that I prefer TypeScript"* → it writes to `feedback.md`
4. Next session: Claude reads those files and already knows

| File | What to put in it |
|------|-------------------|
| `user.md` | Your role, skills, OS, preferred tools |
| `feedback.md` | Corrections and confirmed approaches |
| `decisions.md` | Key technical decisions with reasoning |
| `MEMORY.md` | Index pointing to all other files |

---

### 4. CLAUDE.md Starter

`CLAUDE.md` is Claude Code's project config file — it tells Claude how to behave in your project. The included template covers behavioral rules, code style, build commands, security rules, and memory setup.

```bash
# Use globally (all sessions)
cp CLAUDE.md ~/.claude/CLAUDE.md

# Or per-project
cp CLAUDE.md ./CLAUDE.md
```

---

## Requirements

- [Claude Code](https://claude.ai/code)
- [Node.js](https://nodejs.org/) 18+
- PowerShell 5+ or 7+ (Windows) / bash or zsh (Mac/Linux)

---

## Folder structure

```
claude-code-powerups/
├── install.ps1                    Windows installer
├── install.sh                     Mac/Linux/Git Bash installer
├── CLAUDE.md                      Starter CLAUDE.md template
├── statusline/
│   └── statusline-simple.cjs      Standalone statusline (no dependencies)
├── session-aliases/
│   ├── powershell-snippet.ps1     PowerShell session helpers
│   └── bash-snippet.sh            bash/zsh session helpers
└── memory/
    └── templates/
        ├── MEMORY.md              Memory index template
        ├── user.md                User profile template
        ├── feedback.md            Feedback rules template
        └── decisions.md           Decisions log template
```

---

## Security

The statusline script is designed to be safe:
- Uses `spawnSync` with argument arrays — no shell interpolation, no command injection
- Validates `cwd` is an absolute path before any filesystem or git use
- Cache files are confined to `os.tmpdir()` with path traversal checks
- JSON parsed into a null-prototype object to prevent prototype pollution
- All git and file operations wrapped in try/catch — never crashes the statusline

---

## Contributing

PRs welcome. Keep scripts dependency-free (no npm installs) so they work on any machine with just Node.js.

---

## License

MIT
