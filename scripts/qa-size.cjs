/**
 * Bundle-size guard. Fails if dist/index.html is more than 5% larger than BASELINE_BYTES.
 * Raise BASELINE_BYTES deliberately, in its own commit, when a phase adds features.
 *
 * History:
 * - 132,998  Phase 0 baseline (commit 89402fa)
 * - 143,261  Phase 1: tokens plus ds- component styles (+8.2 KB of CSS)
 * - 154,641  Phase 1 final: + sheet behavior, style guide and #style-guide route (+11.4 KB)
 * - 166,427  Phase 2: data fixes, shared mutations, comma fields, slider, checkbox row, status labels (+11.8 KB)
 * - 185,141  Phase 2: scenario and step logic, the three step screens, router, answer bar (+18.7 KB)
 * - 195,981  Phase 3a: verdict, share links, scenario edits/settings, new answer screen; old page still in (+10.8 KB). Phase 3b deletes the old page.
 * - 207,569  Phase 3a final: + Fine-tune top drivers and the Share sheet (+11.3 KB). Phase 3b deletes the old page.
 * - 230,128  Phase 3b step 2: Why this result sheet and table styles (+16.7 KB with the 3b logic); temporary while the old page is still in. Step 7 deletes it and resets this.
 */
const fs = require('fs');
const path = require('path');

const BASELINE_BYTES = 230128;
const TOLERANCE = 0.05;
const file = path.resolve(__dirname, '../dist/index.html');
const size = fs.statSync(file).size;
const cap = Math.floor(BASELINE_BYTES * (1 + TOLERANCE));
const delta = (((size - BASELINE_BYTES) / BASELINE_BYTES) * 100).toFixed(2);
const ok = size <= cap;
console.log(`${ok ? 'PASS' : 'FAIL'}  bundle size ${size.toLocaleString('en-US')} bytes (${delta >= 0 ? '+' : ''}${delta}% vs size baseline, cap ${cap.toLocaleString('en-US')})`);
process.exit(ok ? 0 : 1);
