#!/usr/bin/env node
/**
 * Standalone Claude Code Statusline
 * Zero dependencies — pure Node.js built-ins only.
 *
 * Field reference: https://code.claude.com/docs/en/statusline
 */

'use strict';

const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  purple: '\x1b[35m',
  bold:   '\x1b[1m',
};

function shortModel(displayName) {
  if (!displayName) return '—';
  const d = displayName.toLowerCase();
  let color = c.cyan;
  if (d.includes('opus'))        color = c.purple;
  else if (d.includes('haiku'))  color = c.green;
  return `${color}${c.bold}${displayName}${c.reset}`;
}

function ctxBar(pct) {
  if (pct == null) return `${c.dim}ctx —${c.reset}`;
  const n   = Math.round(pct);
  const color = n >= 80 ? c.red : n >= 50 ? c.yellow : c.green;
  const filled = Math.floor(n / 10);
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `${color}${bar} ${n}%${c.reset}`;
}

/** Rate-limit bar for 5-hour window */
function rateBar(pct, resetsAt) {
  if (pct == null) return null;
  const n     = Math.round(pct);
  const color = n >= 90 ? c.red : n >= 70 ? c.yellow : c.green;
  const filled = Math.floor(n / 10);
  const bar    = '▪'.repeat(filled) + '·'.repeat(10 - filled);

  // Time until reset
  let resetStr = '';
  if (resetsAt) {
    const secsLeft = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
    const h = Math.floor(secsLeft / 3600);
    const m = Math.floor((secsLeft % 3600) / 60);
    resetStr = h > 0 ? ` resets ${h}h${m}m` : ` resets ${m}m`;
  }

  return `${c.cyan}5h:${c.reset}${color}${bar} ${n}%${c.reset}${c.dim}${resetStr}${c.reset}`;
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

  const model      = d.model?.display_name ?? null;
  const ctxPct     = d.context_window?.used_percentage ?? null;
  const tokIn      = d.context_window?.total_input_tokens ?? null;
  const tokOut     = d.context_window?.total_output_tokens ?? null;
  const cost       = d.cost?.total_cost_usd ?? null;
  const ratePct    = d.rate_limits?.five_hour?.used_percentage ?? null;
  const rateReset  = d.rate_limits?.five_hour?.resets_at ?? null;

  const sep   = `${c.dim} │ ${c.reset}`;
  const parts = [];

  // Model
  parts.push(`◆ ${shortModel(model)}`);

  // Context window bar
  parts.push(ctxBar(ctxPct));

  // Token counts
  if (tokIn != null || tokOut != null) {
    const t = [
      tokIn  != null ? `↑${fmtTokens(tokIn)}`  : '',
      tokOut != null ? `↓${fmtTokens(tokOut)}` : '',
    ].filter(Boolean).join(' ');
    parts.push(`${c.dim}${t}${c.reset}`);
  }

  // Session cost
  const costStr = fmtCost(cost);
  if (costStr) parts.push(`${c.yellow}${costStr}${c.reset}`);

  // 5-hour rate limit window
  const rate = rateBar(ratePct, rateReset);
  if (rate) parts.push(rate);

  process.stdout.write(parts.join(sep) + '\n');
}

main().catch(() => process.stdout.write('◆ Claude Code\n'));
