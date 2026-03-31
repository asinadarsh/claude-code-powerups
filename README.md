# Claude Code Powerups

A collection of practical enhancements for [Claude Code](https://claude.ai/code) that work out of the box — no extra services required.

## What's included

| Feature | What it does |
|---------|-------------|
| **Statusline** | Shows model, context %, token usage, and cost in Claude Code's status bar |
| **Session Aliases** | Named shortcuts to resume your Claude sessions from the terminal |
| **Memory Templates** | File-based persistent memory so Claude remembers context across sessions |
| **CLAUDE.md Starter** | A production-ready CLAUDE.md template for any project |

---

## Quick Install

### Windows (PowerShell)

```powershell
git clone https://github.com/YOUR_USERNAME/claude-code-powerups.git
cd claude-code-powerups
.\install.ps1
```

### Mac / Linux

```bash
git clone https://github.com/YOUR_USERNAME/claude-code-powerups.git
cd claude-code-powerups
bash install.sh
```

Then **restart Claude Code**.

---

## Features

### 1. Statusline

Adds a live status bar to Claude Code showing:

```
◆ Opus 4.6  │  ctx 15%  │  ↑170k ↓22k  │  $0.45  │  12 turns
```

- **Model name** — color-coded by tier (purple = Opus, cyan = Sonnet, green = Haiku)
- **Context %** — turns yellow at 50%, orange at 80%
- **Token counts** — input ↑ and output ↓ separately
- **Session cost** — in USD
- **Turn count**

**Manual install** (if you prefer):

1. Copy `statusline/statusline-simple.cjs` to `~/.claude/helpers/`
2. Add to `~/.claude/settings.json`:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node ~/.claude/helpers/statusline-simple.cjs"
     }
   }
   ```
3. Restart Claude Code

**Requirements**: Node.js (any recent version). No npm packages needed.

---

### 2. Session Aliases

Resume named Claude Code sessions from your terminal in one command:

```powershell
# PowerShell
my-project        # resumes your "My Project" Claude session
my-claude-sessions  # lists all your session shortcuts
```

```bash
# bash / zsh
my-project        # same idea
my-claude-sessions
```

**How to add your own sessions:**

1. Start a Claude session and get its ID:
   ```bash
   # The session ID appears in the URL or run:
   claude --print-session-id
   ```

2. Add to your shell profile (PowerShell example):
   ```powershell
   function my-project { claude --resume "YOUR-SESSION-ID" --dangerously-skip-permissions }
   ```

The installer adds helper functions (`my-claude-sessions`, `edit-claude-profile`) automatically.

---

### 3. Persistent Memory

Claude remembers who you are and how you like to work — even across sessions.

**How it works:**
1. Memory files live in `~/.claude/memory/`
2. Add this to your `CLAUDE.md` (or use the included template):
   ```markdown
   At the start of every session, read files in `~/.claude/memory/`:
   - `MEMORY.md` — index
   - `user.md` — my background
   - `feedback.md` — behavioral rules
   - `decisions.md` — key decisions
   ```
3. Tell Claude: *"remember that I prefer TypeScript"* → it writes to `feedback.md`
4. Next session: Claude reads those files and already knows

**Memory file types:**

| File | Contents |
|------|----------|
| `user.md` | Your role, skills, how you like to work |
| `feedback.md` | Rules Claude should follow (corrections + confirmations) |
| `decisions.md` | Key project/tech decisions with reasoning |
| `MEMORY.md` | Index pointing to all other memory files |

The installer copies blank templates to `~/.claude/memory/` — just fill them in.

---

### 4. CLAUDE.md Starter

`CLAUDE.md` is Claude Code's project configuration file. The included template covers:
- Behavioral rules (what to do / not do)
- Communication style preferences
- Code style and formatter settings
- File organization conventions
- Build & test commands
- Security rules
- Memory system setup

Copy it to your project root or to `~/.claude/CLAUDE.md` as a global config:

```bash
# Global (applies to all Claude Code sessions)
cp CLAUDE.md ~/.claude/CLAUDE.md

# Per-project
cp CLAUDE.md ~/your-project/CLAUDE.md
```

---

## Requirements

- [Claude Code](https://claude.ai/code) installed
- [Node.js](https://nodejs.org/) 18+ (for the statusline script)
- PowerShell 5+ or 7+ (Windows) / bash or zsh (Mac/Linux)

---

## Folder structure

```
claude-code-powerups/
├── install.ps1                  Windows installer
├── install.sh                   Mac/Linux installer
├── CLAUDE.md                    Starter CLAUDE.md template
├── statusline/
│   └── statusline-simple.cjs   Standalone statusline script
├── session-aliases/
│   ├── powershell-snippet.ps1  PowerShell session helpers
│   └── bash-snippet.sh         bash/zsh session helpers
└── memory/
    └── templates/
        ├── MEMORY.md            Memory index template
        ├── user.md              User profile template
        ├── feedback.md          Feedback rules template
        └── decisions.md         Decisions log template
```

---

## Contributing

PRs welcome. Keep scripts dependency-free (no npm installs) where possible so they work on a fresh machine with just Node.js.

---

## License

MIT
