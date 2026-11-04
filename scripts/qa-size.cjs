/**
 * Bundle-size guard. Fails if dist/index.html is more than 5% larger than the
 * Phase 0 baseline (132,998 bytes at tag `phase-0-baseline`, commit 89402fa).
 * Raise BASELINE_BYTES deliberately, in its own commit, when a phase adds features.
 */
const fs = require('fs');
const path = require('path');

const BASELINE_BYTES = 132998;
const TOLERANCE = 0.05;
const file = path.resolve(__dirname, '../dist/index.html');
const size = fs.statSync(file).size;
const cap = Math.floor(BASELINE_BYTES * (1 + TOLERANCE));
const delta = (((size - BASELINE_BYTES) / BASELINE_BYTES) * 100).toFixed(2);
const ok = size <= cap;
console.log(`${ok ? 'PASS' : 'FAIL'}  bundle size ${size.toLocaleString('en-US')} bytes (${delta >= 0 ? '+' : ''}${delta}% vs baseline, cap ${cap.toLocaleString('en-US')})`);
process.exit(ok ? 0 : 1);
