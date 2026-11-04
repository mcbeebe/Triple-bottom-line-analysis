/**
 * Visual regression guard for the Phase 0 module split.
 *
 * Builds the baseline git ref (default: tag `phase-0-baseline`, override with
 * TBL_BASELINE) in a temporary worktree, screenshots that build and the current
 * `dist/index.html` full-page at 390 px and 1280 px, and fails unless the PNGs
 * are byte-identical. Web fonts are blocked in both runs so the comparison does
 * not depend on the network. On a mismatch both images are written to qa-shots/.
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ref = process.env.TBL_BASELINE || 'phase-0-baseline';
const shots = path.join(root, 'qa-shots');
const widths = [390, 1280];
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

function git(cmd, cwd = root) {
  return execSync(`git ${cmd}`, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function buildBaseline() {
  try {
    git(`rev-parse --verify --quiet ${ref}^{commit}`);
  } catch {
    throw new Error(`Baseline ref "${ref}" is not in this clone. Run: git fetch origin tag ${ref}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tbl-baseline-'));
  git(`worktree add --detach "${tmp}" ${ref}`);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
  execSync('node scripts/build.mjs', { cwd: tmp, stdio: 'pipe' });
  return { dir: tmp, dist: path.join(tmp, 'dist', 'index.html') };
}

function removeBaseline(dir) {
  try { git(`worktree remove --force "${dir}"`); } catch { /* best effort */ }
  try { git('worktree prune'); } catch { /* best effort */ }
}

async function shoot(browser, file, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => (/fonts\.(googleapis|gstatic)\.com/.test(route.request().url()) ? route.abort() : route.continue()));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const png = await page.screenshot({ fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await ctx.close();
  return { png, height };
}

(async () => {
  const current = path.join(root, 'dist', 'index.html');
  if (!fs.existsSync(current)) throw new Error('dist/index.html missing; run `npm run build` first');
  const base = buildBaseline();
  const browser = await chromium.launch();
  try {
    for (const w of widths) {
      const a = await shoot(browser, base.dist, w);
      const b = await shoot(browser, current, w);
      const same = a.png.equals(b.png);
      check(`visual ${w}px identical to ${ref}`, same, `baseline h=${a.height} current h=${b.height}`);
      if (!same) {
        fs.mkdirSync(shots, { recursive: true });
        fs.writeFileSync(path.join(shots, `visual-${w}-baseline.png`), a.png);
        fs.writeFileSync(path.join(shots, `visual-${w}-current.png`), b.png);
        console.log(`      wrote qa-shots/visual-${w}-baseline.png and qa-shots/visual-${w}-current.png`);
      }
    }
  } finally {
    await browser.close();
    removeBaseline(base.dir);
  }
  console.log(failures ? `\n${failures} visual check(s) failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('qa-visual error:', e.message);
  process.exit(1);
});
