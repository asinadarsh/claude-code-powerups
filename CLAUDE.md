# CLAUDE.md — Starter Template

> Copy this file to your project root or `~/.claude/CLAUDE.md` as a global config.
> Customize every section to match your workflow.

## Behavioral Rules

- Do what was asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing ones
- NEVER add unsolicited comments, docstrings, or type annotations
- NEVER commit secrets, credentials, or .env files
- ALWAYS read a file before editing it

## Communication Style

- Keep responses short and direct
- No preamble ("Sure!", "Great question!") — just do the task
- No trailing summaries — I can see the diff
- Use inline code references with `file.js:42` line numbers

## Code Style

<!-- Customize for your stack -->
- Language: JavaScript / TypeScript / Python / etc.
- Formatter: Prettier / Black / gofmt / etc.
- Test framework: Jest / pytest / etc.
- Prefer: <!-- e.g. async/await over callbacks, functional over OOP -->

## File Organization

- Source code: `/src`
- Tests: `/tests`
- Docs: `/docs`
- Config: `/config`
- Scripts: `/scripts`

## Build & Test

```bash
# Install
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys or secrets in source files
- NEVER commit `.env` files
- Always validate user input at system boundaries
- Always sanitize file paths (prevent directory traversal)

## Memory System

At the start of every session, read files in `~/.claude/memory/`:
- `MEMORY.md` — index of all memory files
- `user.md` — my background and preferences
- `feedback.md` — behavioral rules
- `decisions.md` — key decisions and their reasoning

At the end of every session (or when I say "save" / "remember this"), update the relevant memory file.
