---
name: Feedback & Preferences
description: How Claude should behave — corrections and confirmed approaches
type: feedback
---

# Behavioral Rules

<!-- Add rules as you teach Claude how to work with you. Format:
## Rule title
The rule itself.
**Why:** Why this matters.
**How to apply:** When this kicks in.
-->

## Example: Response length
Keep responses short and direct. Skip preamble and summaries.
**Why:** I can read the diff / output myself.
**How to apply:** Always. Only elaborate when I ask "why" or "explain".

## Example: No unsolicited changes
Only change what I asked for. Don't refactor surrounding code or add comments.
**Why:** Unexpected changes break things and waste review time.
**How to apply:** Any time I ask for a specific fix or feature.
