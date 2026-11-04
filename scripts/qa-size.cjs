/**
 * Bundle-size guard. Fails if dist/index.html is more than 5% larger than BASELINE_BYTES.
 * Raise BASELINE_BYTES deliberately, in its own commit, when a phase adds features.
 *
 * History:
 * - 132,998  Phase 0 baseline (commit 89402fa)
 * - 143,261  Phase 1: tokens plus ds- component styles (+8.2 KB of CSS)
 * - 154,641  Phase 1 final: + sheet behavior, style guide and #style-guide route (+11.4 KB)
 */
const fs = require('fs');
const path = require('path');

const BASELINE_BYTES = 154641;
const TOLERANCE = 0.05;
const file = path.resolve(__dirname, '../dist/index.html');
const size = fs.statSync(file).size;
const cap = Math.floor(BASELINE_BYTES * (1 + TOLERANCE));
const delta = (((size - BASELINE_BYTES) / BASELINE_BYTES) * 100).toFixed(2);
const ok = size <= cap;
console.log(`${ok ? 'PASS' : 'FAIL'}  bundle size ${size.toLocaleString('en-US')} bytes (${delta >= 0 ? '+' : ''}${delta}% vs size baseline, cap ${cap.toLocaleString('en-US')})`);
process.exit(ok ? 0 : 1);
