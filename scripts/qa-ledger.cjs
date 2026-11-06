/**
 * Port ledger guard (Phase 3b): proves no old-page check was dropped while the old page is rebuilt.
 * Reads docs/dev-package/phase-3b-port-ledger.md and checks:
 *  - every check in the old suites (while they exist) has exactly one row, and every row names a real old check;
 *  - a "ported" row names a check that exists word for word in a new suite ("qa-answer.cjs: name");
 *  - a "retired" row gives a reason;
 *  - "pending" is allowed only while its old suite file still exists.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const LEDGER = path.join(root, 'docs/dev-package/phase-3b-port-ledger.md');
const OLD = ['qa.cjs', 'qa-path.cjs', 'qa-analyst.cjs'];
const NEW = ['qa-answer.cjs', 'qa-ai.cjs', 'qa-steps.cjs', 'qa-components.cjs'];
let failures = 0;
const fail = (msg) => { console.log('FAIL  ' + msg); failures++; };

/** Every check name in a suite: the first string literal passed to check(...). */
function checkNames(file) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const re = /check\(\s*(['`])((?:\\.|(?!\1).)*)\1/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push(m[2]);
  return out;
}

const unescapeCell = (t) => t.replace(/\\\|/g, '|').trim();
const rows = fs
  .readFileSync(LEDGER, 'utf8')
  .split('\n')
  .filter((l) => /^\| \d+ \|/.test(l))
  .map((l) => {
    const cells = l.slice(1, -1).split(/(?<!\\)\|/).map(unescapeCell);
    return { n: Number(cells[0]), suite: cells[1], name: cells[2], status: cells[3], target: cells[4] ?? '' };
  });

const newNames = Object.fromEntries(NEW.map((f) => [f, new Set(checkNames(f))]));
const counts = { ported: 0, retired: 0, pending: 0 };

for (const f of OLD) {
  if (!fs.existsSync(path.join(__dirname, f))) continue;
  const names = checkNames(f);
  for (const n of names) {
    const hits = rows.filter((r) => r.suite === f && r.name === n).length;
    if (hits !== 1) fail(`${f}: "${n}" has ${hits} ledger rows (want 1)`);
  }
  for (const r of rows.filter((x) => x.suite === f)) if (!names.includes(r.name)) fail(`row ${r.n}: "${r.name}" is not a check in ${f}`);
}

for (const r of rows) {
  if (!(r.status in counts)) {
    fail(`row ${r.n}: unknown status "${r.status}"`);
    continue;
  }
  counts[r.status]++;
  if (r.status === 'ported') {
    const m = /^(qa-[a-z-]+\.cjs): (.+)$/.exec(r.target);
    if (!m || !newNames[m[1]]) fail(`row ${r.n}: ported row must say "suite.cjs: check name" for a new suite (${NEW.join(', ')}), got "${r.target}"`);
    else if (!newNames[m[1]].has(m[2])) fail(`row ${r.n}: "${m[2]}" is not a check in ${m[1]}`);
  } else if (r.status === 'retired') {
    if (r.target.length < 15) fail(`row ${r.n}: a retired row needs a reason`);
  } else if (!fs.existsSync(path.join(__dirname, r.suite))) fail(`row ${r.n}: still pending, but ${r.suite} has been deleted`);
}

if (rows.length !== 155) fail(`ledger has ${rows.length} rows (want 155)`);
console.log(`ledger: ${rows.length} rows · ported ${counts.ported} · retired ${counts.retired} · pending ${counts.pending}`);
console.log(failures ? `\n${failures} ledger problem(s)` : '\nLedger is consistent');
process.exit(failures ? 1 : 0);
