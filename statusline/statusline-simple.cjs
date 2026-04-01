#!/usr/bin/env node
/**
 * Standalone Claude Code Statusline
 * Zero dependencies — pure Node.js built-ins only.
 *
 * Field reference: https://code.claude.com/docs/en/statusline
 */

'use strict';

const { execSync } = require('child_process');

const c = {
  reset:   '\x1b[0m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  blink:   '\x1b[5m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  purple:  '\x1b[35m',
  bgRed:   '\x1b[41m',
  white:   '\x1b[37m',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 1500, stdio: ['pipe','pipe','pipe'] }).trim();
  } catch { return ''; }
}

function fmtTokens(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1000)}k`;
  return String(n);
}

function fmtCost(usd) {
  if (!usd) return null;
  if (usd < 0.001) return `$${usd.toFixed(4)}`;
  if (usd < 0.01)  return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtDuration(ms) {
  if (!ms) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Segments ─────────────────────────────────────────────────────────────────

function modelSegment(displayName) {
  if (!displayName) return `◆ ${c.dim}—${c.reset}`;
  const d = displayName.toLowerCase();
  let color = c.cyan;
  if (d.includes('opus'))       color = c.purple;
  else if (d.includes('haiku')) color = c.green;
  return `◆ ${color}${c.bold}${displayName}${c.reset}`;
}

/** Context bar with label, %, and warning at 80%+ */
function ctxSegment(pct) {
  if (pct == null) return `${c.dim}ctx —${c.reset}`;
  const n     = Math.round(pct);
  const color = n >= 80 ? c.red : n >= 50 ? c.yellow : c.green;
  const filled = Math.floor(n / 10);
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `${c.dim}ctx${c.reset} ${color}${bar} ${n}%${c.reset}`;
}

/** Token counts: ↑44k ↓8k */
function tokenSegment(tokIn, tokOut) {
  if (tokIn == null && tokOut == null) return null;
  const parts = [
    tokIn  != null ? `↑${fmtTokens(tokIn)}`  : '',
    tokOut != null ? `↓${fmtTokens(tokOut)}` : '',
  ].filter(Boolean).join(' ');
  return `${c.dim}${parts}${c.reset}`;
}

/** Session cost */
function costSegment(usd) {
  const s = fmtCost(usd);
  return s ? `${c.yellow}${s}${c.reset}` : null;
}

/** Session duration */
function durationSegment(ms) {
  const s = fmtDuration(ms);
  return s ? `${c.dim}⏱ ${s}${c.reset}` : null;
}

/** Lines added/removed this session */
function linesSegment(added, removed) {
  if (!added && !removed) return null;
  const a = added   ? `${c.green}+${added}${c.reset}`   : '';
  const r = removed ? `${c.red}-${removed}${c.reset}` : '';
  return [a, r].filter(Boolean).join(' ');
}

/** Git branch — cached 5s to avoid lag */
const GIT_CACHE = '/tmp/cc-statusline-git.cache';
function gitSegment(cwd) {
  try {
    const fs = require('fs');
    const now = Date.now() / 1000;
    let cached = null;

    if (fs.existsSync(GIT_CACHE)) {
      const age = now - fs.statSync(GIT_CACHE).mtimeMs / 1000;
      if (age < 5) cached = fs.readFileSync(GIT_CACHE, 'utf8').trim();
    }

    if (cached === null) {
      // Check if inside a git repo; if not, write empty and skip
      const check = safeExec(`git -C "${cwd}" rev-parse --git-dir`);
      if (!check) { fs.writeFileSync(GIT_CACHE, ''); return null; }
      const branch = safeExec(`git -C "${cwd}" branch --show-current`);
      fs.writeFileSync(GIT_CACHE, branch || '');
      cached = branch;
    }

    if (!cached) return null;
    return `${c.green}🌿 ${cached}${c.reset}`;
  } catch { return null; }
}

/** 5-hour rate limit bar — flashes red when ≥ 90% */
function rateSegment(pct, resetsAt) {
  if (pct == null) return null;
  const n      = Math.round(pct);
  const filled = Math.floor(n / 10);
  const bar    = '▪'.repeat(filled) + '·'.repeat(10 - filled);

  let resetStr = '';
  if (resetsAt) {
    const secsLeft = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
    const h = Math.floor(secsLeft / 3600);
    const m = Math.floor((secsLeft % 3600) / 60);
    resetStr = h > 0 ? ` resets ${h}h${m}m` : ` resets ${m}m`;
  }

  // ≥ 90%: bold red + blink warning
  if (n >= 90) {
    return `${c.cyan}5h:${c.reset} ${c.bold}${c.red}${c.blink}⚠${c.reset} ${c.bold}${c.red}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
  }
  const color = n >= 70 ? c.yellow : c.green;
  return `${c.cyan}5h:${c.reset} ${color}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
}

// ─── Stdin ────────────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf.trim()));
    process.stdin.on('error', () => resolve(''));
    setTimeout(() => resolve(buf.trim()), 500);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await readStdin();
  let d = {};
  if (raw) { try { d = JSON.parse(raw); } catch {} }

  const model      = d.model?.display_name ?? null;
  const ctxPct     = d.context_window?.used_percentage ?? null;
  const tokIn      = d.context_window?.total_input_tokens ?? null;
  const tokOut     = d.context_window?.total_output_tokens ?? null;
  const cost       = d.cost?.total_cost_usd ?? null;
  const durationMs = d.cost?.total_duration_ms ?? null;
  const linesAdded = d.cost?.total_lines_added ?? null;
  const linesRemov = d.cost?.total_lines_removed ?? null;
  const ratePct    = d.rate_limits?.five_hour?.used_percentage ?? null;
  const rateReset  = d.rate_limits?.five_hour?.resets_at ?? null;
  const cwd        = d.workspace?.current_dir ?? d.cwd ?? process.cwd();

  const sep = `${c.dim} │ ${c.reset}`;

  // Line 1: session identity — model, branch, duration, lines changed
  const line1 = [
    modelSegment(model),
    gitSegment(cwd),
    durationSegment(durationMs),
    linesSegment(linesAdded, linesRemov),
  ].filter(Boolean).join(sep);

  // Line 2: usage & limits — ctx, tokens, cost, 5h rate limit
  const line2 = [
    ctxSegment(ctxPct),
    tokenSegment(tokIn, tokOut),
    costSegment(cost),
    rateSegment(ratePct, rateReset),
  ].filter(Boolean).join(sep);

  // If rate limit is critical (≥90%), prepend alert to line 1
  const rateCritical = ratePct != null && Math.round(ratePct) >= 90;
  const prefix = rateCritical ? `${c.bold}${c.red}⚡ RATE LIMIT CRITICAL${c.reset}${sep}` : '';

  process.stdout.write(`${prefix}${line1}\n${line2}\n`);
}

main().catch(() => process.stdout.write('◆ Claude Code\n'));
