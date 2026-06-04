#!/usr/bin/env node
/**
 * Standalone Claude Code Statusline
 * Zero dependencies — pure Node.js built-ins only.
 *
 * Field reference: https://code.claude.com/docs/en/statusline
 *
 * Security: uses spawnSync with argument arrays throughout — no shell
 * interpolation, no command injection possible via cwd or branch names.
 */

'use strict';

const { spawnSync } = require('child_process');
const fs            = require('fs');
const os            = require('os');
const path          = require('path');

// ─── ANSI colors ──────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  blink:  '\x1b[5m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  purple: '\x1b[35m',
};

// ─── Safe git runner (spawnSync — no shell, no injection) ─────────────────────
function git(args, cwd) {
  try {
    const r = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout:  1500,
      stdio:    ['pipe', 'pipe', 'pipe'],
    });
    return r.status === 0 ? (r.stdout || '').trim() : '';
  } catch { return ''; }
}

// ─── Format helpers ───────────────────────────────────────────────────────────
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
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ─── Segments ─────────────────────────────────────────────────────────────────
function modelSegment(name) {
  if (!name) return `◆ ${c.dim}—${c.reset}`;
  const d = name.toLowerCase();
  const color = d.includes('opus') ? c.purple : d.includes('haiku') ? c.green : c.cyan;
  return `◆ ${color}${c.bold}${name}${c.reset}`;
}

function ctxSegment(pct) {
  if (pct == null) return `${c.dim}ctx —${c.reset}`;
  const n     = Math.round(pct);
  const color = n >= 80 ? c.red : n >= 50 ? c.yellow : c.green;
  const filled = Math.floor(n / 10);
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `${c.dim}ctx${c.reset} ${color}${bar} ${n}%${c.reset}`;
}

function tokenSegment(tokIn, tokOut) {
  if (tokIn == null && tokOut == null) return null;
  const parts = [
    tokIn  != null ? `↑${fmtTokens(tokIn)}`  : '',
    tokOut != null ? `↓${fmtTokens(tokOut)}` : '',
  ].filter(Boolean).join(' ');
  return `${c.dim}${parts}${c.reset}`;
}

function costSegment(usd) {
  const s = fmtCost(usd);
  return s ? `${c.yellow}${s}${c.reset}` : null;
}

function durationSegment(ms) {
  const s = fmtDuration(ms);
  return s ? `${c.dim}⏱ ${s}${c.reset}` : null;
}

function linesSegment(added, removed) {
  if (!added && !removed) return null;
  const a = added   ? `${c.green}+${added}${c.reset}`  : '';
  const r = removed ? `${c.red}-${removed}${c.reset}` : '';
  return [a, r].filter(Boolean).join(' ');
}

function gitSegment(cwd) {
  // Validate cwd is a non-empty absolute path before any fs/shell use
  if (!cwd || typeof cwd !== 'string' || !path.isAbsolute(cwd)) return null;

  try {
    // Per-directory cache file, kept inside os.tmpdir()
    const dirHash  = Buffer.from(cwd).toString('base64').replace(/[/+=]/g, '_').slice(0, 32);
    const CACHE    = path.join(os.tmpdir(), `cc-git-${dirHash}.cache`);

    // Ensure resolved path stays strictly within tmpdir (TOCTOU guard)
    if (!path.resolve(CACHE).startsWith(path.resolve(os.tmpdir()))) return null;

    const now = Date.now() / 1000;
    let cached = null;

    try {
      const stat = fs.statSync(CACHE);
      if ((now - stat.mtimeMs / 1000) < 5) {
        cached = fs.readFileSync(CACHE, 'utf8').trim();
      }
    } catch { /* cache miss — will refresh below */ }

    if (cached === null) {
      const check = git(['rev-parse', '--git-dir'], cwd);
      if (!check) { fs.writeFileSync(CACHE, ''); return null; }
      const branch = git(['branch', '--show-current'], cwd);
      fs.writeFileSync(CACHE, branch);
      cached = branch;
    }

    if (!cached) return null;
    return `${c.green}git: ${cached}${c.reset}`;
  } catch { return null; }
}

function rateSegment(pct, resetsAt) {
  if (pct == null) return null;
  const n      = Math.round(pct);
  const filled = Math.floor(n / 10);
  const bar    = '▪'.repeat(filled) + '·'.repeat(10 - filled);

  let resetStr = '';
  if (resetsAt) {
    const left = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    resetStr = h > 0 ? ` resets ${h}h${m}m` : ` resets ${m}m`;
  }

  if (n >= 90) {
    return `${c.cyan}5h:${c.reset} ${c.bold}${c.red}${c.blink}⚠${c.reset} ${c.bold}${c.red}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
  }
  const color = n >= 70 ? c.yellow : c.green;
  return `${c.cyan}5h:${c.reset} ${color}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
}

function weeklySegment(pct, resetsAt) {
  if (pct == null) return null;
  const n      = Math.round(pct);
  const filled = Math.floor(n / 10);
  const bar    = '▪'.repeat(filled) + '·'.repeat(10 - filled);

  let resetStr = '';
  if (resetsAt) {
    const left = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
    const d = Math.floor(left / 86400);
    const h = Math.floor((left % 86400) / 3600);
    const m = Math.floor((left % 3600) / 60);
    if (d > 0)      resetStr = ` resets ${d}d ${h}h`;
    else if (h > 0) resetStr = ` resets ${h}h${m}m`;
    else            resetStr = ` resets ${m}m`;
  }

  if (n >= 90) {
    return `${c.cyan}wk:${c.reset} ${c.bold}${c.red}${c.blink}⚠${c.reset} ${c.bold}${c.red}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
  }
  const color = n >= 70 ? c.yellow : c.green;
  return `${c.cyan}wk:${c.reset} ${color}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
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

  // Parse JSON safely — use Object.create(null) to avoid prototype pollution
  let d = Object.create(null);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') Object.assign(d, parsed);
    } catch { /* ignore malformed input */ }
  }

  const model      = d.model?.display_name      ?? null;
  const ctxPct     = d.context_window?.used_percentage ?? null;
  const tokIn      = d.context_window?.total_input_tokens  ?? null;
  const tokOut     = d.context_window?.total_output_tokens ?? null;
  const cost       = d.cost?.total_cost_usd      ?? null;
  const durationMs = d.cost?.total_duration_ms   ?? null;
  const linesAdded = d.cost?.total_lines_added   ?? null;
  const linesRemov = d.cost?.total_lines_removed ?? null;
  const ratePct    = d.rate_limits?.five_hour?.used_percentage ?? null;
  const rateReset  = d.rate_limits?.five_hour?.resets_at       ?? null;
  const weeklyPct  = d.rate_limits?.weekly?.used_percentage    ?? null;
  const weeklyReset = d.rate_limits?.weekly?.resets_at         ?? null;
  const cwd        = d.workspace?.current_dir ?? d.cwd ?? null;

  const sep = `${c.dim} │ ${c.reset}`;

  // Line 1: session identity — model, branch, duration, lines changed
  const line1 = [
    modelSegment(model),
    gitSegment(cwd),
    durationSegment(durationMs),
    linesSegment(linesAdded, linesRemov),
  ].filter(Boolean).join(sep);

  // Line 2: usage & limits — ctx, tokens, cost, 5h rate limit, weekly limit
  const line2 = [
    ctxSegment(ctxPct),
    tokenSegment(tokIn, tokOut),
    costSegment(cost),
    rateSegment(ratePct, rateReset),
    weeklySegment(weeklyPct, weeklyReset),
  ].filter(Boolean).join(sep);

  const rateCritical = (ratePct != null && Math.round(ratePct) >= 90) ||
                       (weeklyPct != null && Math.round(weeklyPct) >= 90);
  const prefix = rateCritical ? `${c.bold}${c.red}⚡ RATE LIMIT CRITICAL${c.reset}${sep}` : '';

  process.stdout.write(`${prefix}${line1}\n${line2}\n`);
}

main().catch(() => process.stdout.write('◆ Claude Code\n'));
