#!/usr/bin/env node
/**
 * Standalone Claude Code Statusline
 * Zero dependencies — pure Node.js built-ins only.
 *
 * Field names from: https://code.claude.com/docs/en/statusline
 * Claude Code pipes JSON via stdin on every turn.
 */

'use strict';

const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  purple: '\x1b[35m',
  bold:   '\x1b[1m',
};

function shortModel(displayName) {
  if (!displayName) return '—';
  const d = displayName.toLowerCase();
  let color = c.cyan;
  if (d.includes('opus'))   color = c.purple;
  else if (d.includes('haiku')) color = c.green;
  return `${color}${c.bold}${displayName}${c.reset}`;
}

function ctxBar(pct) {
  if (pct == null) return `${c.dim}ctx —${c.reset}`;
  const n = Math.round(pct);
  const color = n >= 80 ? c.yellow : n >= 50 ? c.cyan : c.green;
  const filled = Math.floor(n / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `${color}${bar}${c.reset} ${color}${n}%${c.reset}`;
}

function fmtCost(usd) {
  if (!usd) return null;
  if (usd < 0.001) return `$${usd.toFixed(4)}`;
  if (usd < 0.01)  return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtTokens(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1000)}k`;
  return String(n);
}

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

async function main() {
  const raw = await readStdin();
  let d = {};
  if (raw) { try { d = JSON.parse(raw); } catch {} }

  const model   = d.model?.display_name || null;
  const pct     = d.context_window?.used_percentage ?? null;
  const tokIn   = d.context_window?.total_input_tokens ?? null;
  const tokOut  = d.context_window?.total_output_tokens ?? null;
  const cost    = d.cost?.total_cost_usd ?? null;
  const turns   = d.numTurns ?? null;

  const sep = `${c.dim} │ ${c.reset}`;
  const parts = [];

  parts.push(`◆ ${shortModel(model)}`);
  parts.push(ctxBar(pct));

  if (tokIn != null || tokOut != null) {
    const t = [tokIn != null ? `↑${fmtTokens(tokIn)}` : '', tokOut != null ? `↓${fmtTokens(tokOut)}` : '']
      .filter(Boolean).join(' ');
    parts.push(`${c.dim}${t}${c.reset}`);
  }

  const costStr = fmtCost(cost);
  if (costStr) parts.push(`${c.yellow}${costStr}${c.reset}`);

  if (turns != null) parts.push(`${c.dim}${turns} turns${c.reset}`);

  process.stdout.write(parts.join(sep) + '\n');
}

main().catch(() => process.stdout.write('◆ Claude Code\n'));
