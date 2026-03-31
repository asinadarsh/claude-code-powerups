#!/usr/bin/env node
/**
 * Standalone Claude Code Statusline
 * Zero dependencies — pure Node.js built-ins only.
 * No ruflo, no MCP, no external integrations required.
 *
 * Claude Code pipes a JSON object via stdin on every turn.
 * This script reads it, formats a status line, and exits fast (<50ms).
 */

'use strict';

// ANSI colors
const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  purple: '\x1b[35m',
  white:  '\x1b[37m',
  bold:   '\x1b[1m',
};

function colorize(str, color) {
  return `${color}${str}${c.reset}`;
}

/**
 * Shorten model name for display
 * "claude-opus-4-6" → "Opus 4.6"
 * "claude-sonnet-4-6" → "Sonnet 4.6"
 * "claude-haiku-4-5" → "Haiku 4.5"
 */
function shortModel(model) {
  if (!model) return '—';
  const m = model.toLowerCase();
  let name = model;
  let color = c.white;

  if (m.includes('opus')) {
    name = 'Opus';
    color = c.purple;
  } else if (m.includes('sonnet')) {
    name = 'Sonnet';
    color = c.cyan;
  } else if (m.includes('haiku')) {
    name = 'Haiku';
    color = c.green;
  }

  // Extract version number: "claude-opus-4-6" → "4.6"
  const ver = model.match(/(\d+)-(\d+)(?:-\d+)?$/);
  if (ver) name += ` ${ver[1]}.${ver[2]}`;

  return colorize(name, color + c.bold);
}

/**
 * Format context percentage with color coding
 */
function ctxBar(used, max) {
  if (!used || !max) return colorize('ctx —', c.dim);
  const pct = Math.round((used / max) * 100);
  const bar = pct >= 80 ? c.yellow : pct >= 50 ? c.cyan : c.green;
  return colorize(`ctx ${pct}%`, bar);
}

/**
 * Format token count: 1234567 → "1.2M", 123456 → "123k"
 */
function fmtTokens(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Format cost: 0.004567 → "$0.005"
 */
function fmtCost(cost) {
  if (cost == null || cost === 0) return null;
  if (cost < 0.001) return `$${cost.toFixed(4)}`;
  if (cost < 0.01)  return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Read all stdin and return as string.
 * Resolves with '' if stdin is empty / TTY.
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf.trim()));
    process.stdin.on('error', () => resolve(''));
    // Safety timeout
    setTimeout(() => resolve(buf.trim()), 400);
  });
}

async function main() {
  const raw = await readStdin();

  let data = {};
  if (raw) {
    try { data = JSON.parse(raw); } catch { /* ignore bad JSON */ }
  }

  // --- Extract fields (handle various Claude Code JSON shapes) ---
  const model      = data.model || data.modelId || null;
  const numTurns   = data.numTurns ?? data.turns ?? null;
  const cost       = data.totalCostUSD ?? data.totalCost ?? data.costUSD ?? null;

  // Token counts — Claude Code uses different field names across versions
  const tokensIn   = data.totalInputTokens  ?? data.inputTokens  ?? data.tokensIn  ?? null;
  const tokensOut  = data.totalOutputTokens ?? data.outputTokens ?? data.tokensOut ?? null;
  const tokensUsed = tokensIn != null && tokensOut != null ? tokensIn + tokensOut
                   : data.tokensUsed ?? data.contextTokens ?? null;
  const maxTokens  = data.maxTokens ?? data.contextWindow ?? null;

  // --- Build status line segments ---
  const parts = [];

  // Model
  parts.push(`◆ ${shortModel(model)}`);

  // Context %
  if (tokensUsed != null) {
    parts.push(ctxBar(tokensUsed, maxTokens || 200_000));
  }

  // Token counts
  if (tokensIn != null || tokensOut != null) {
    const inStr  = tokensIn  != null ? `↑${fmtTokens(tokensIn)}`  : '';
    const outStr = tokensOut != null ? `↓${fmtTokens(tokensOut)}` : '';
    const tokenStr = [inStr, outStr].filter(Boolean).join(' ');
    parts.push(colorize(tokenStr, c.dim));
  } else if (tokensUsed != null) {
    parts.push(colorize(`${fmtTokens(tokensUsed)} tokens`, c.dim));
  }

  // Cost
  const costStr = fmtCost(cost);
  if (costStr) {
    parts.push(colorize(costStr, c.yellow));
  }

  // Turns
  if (numTurns != null) {
    parts.push(colorize(`${numTurns} turns`, c.dim));
  }

  // Separator between segments
  const sep = colorize(' │ ', c.dim);
  process.stdout.write(parts.join(sep) + '\n');
}

main().catch(() => {
  // Silent fallback — never crash the status line
  process.stdout.write('◆ Claude Code\n');
});
