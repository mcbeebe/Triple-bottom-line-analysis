const { chromium } = require('playwright');
const path = require('path');
// Phase 2: the old page is the answer screen (#answer); QA loads it with the original Lexus test case via a boot hook.
const url = 'file://' + path.resolve(__dirname, '../dist/index.html') + '#answer';
let failures = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!ok) failures++; };

const ANSWER = {
  summary: 'Keeping the Lexus is cheapest at your mileage, but <b>EVs</b> win on carbon.',
  interpretation: 'Solar at home makes charging cheaper.',
  questions: [{ question: 'How many miles do you drive?', why: 'Drives fuel savings', field: 'g..milesPerYear', value: 14000 }, { question: 'Anything else?', why: 'x', field: 'bogus', value: 1 }],
  suggestions: [
    { field: 'g..gasPrice', value: 99, reason: 'Out of range on purpose' },
    { field: 'g..elecPrice', value: 0.12, reason: 'Solar at home' },
    { field: 'evil..x', value: 1, reason: 'unknown field' }
  ],
  addCars: [{ id: 'rav4h', reason: 'Hybrid fits towing' }, { id: 'lx', reason: 'owned' }],
  settings: { mode: 'metrics', preset: 'planet', reason: 'You said planet matters most' },
  explanation: ['Keep costs less.'],
  flipFactors: [{ factor: 'Gas at $8', effect: 'EV wins' }],
  caveats: ['Confirm tax eligibility']
};

async function open(browser, w, mock) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { window.__TBL_QA__ = { scenario: 'legacy' }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(mock);
  await page.goto(url);
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch();

  // 1. normal flow, desktop
  const okMock = `window.__prompts=[];window.claude={use:async(n)=>n==='sample'?{json:async(p,o)=>{window.__prompts.push({p,o});await new Promise(r=>setTimeout(r,150));return ${JSON.stringify(ANSWER)}}}:null};`;
  let { ctx, page, errors } = await open(browser, 1280, okMock);
  check('panel visible when sample available', await page.locator('#analyst').isVisible());
  check('panel is above the design bar', await page.evaluate(() => document.getElementById('analyst').compareDocumentPosition(document.getElementById('designbar')) & 4) > 0);
  await page.click('[data-act="an-analyze"]');
  check('empty analyze asks for input, no call', (await page.textContent('#an-status')).includes('Describe') && (await page.evaluate(() => window.__prompts.length)) === 0);
  await page.click('[data-act="an-example"][data-val="0"]');
  check('example fills textarea', (await page.inputValue('#an-text')).includes('40 miles'));
  await page.click('[data-act="an-analyze"]');
  check('shows thinking + disables buttons', (await page.textContent('#an-status')).includes('Thinking') && await page.locator('[data-act="an-analyze"]').isDisabled());
  await page.waitForSelector('.an-summary');
  const call = await page.evaluate(() => window.__prompts[0]);
  check('call used cache:false', call.o.cache === false);
  check('prompt has scenario, field ids, results', call.p.includes('40 miles') && call.p.includes('g..gasPrice') && call.p.includes('CURRENT RESULTS') && call.p.includes('Gas price 50% higher'));
  check('summary rendered as text, not HTML', (await page.locator('.an-summary b').innerText()).includes('<b>EVs</b>'));
  const sugs = await page.locator('#an-out [data-act="an-apply"]').count();
  check('only 2 valid input suggestions (unknown dropped)', sugs === 2, `got ${sugs}`);
  check('lx owned car not offered', (await page.locator('[data-act="an-addcar"]').count()) === 1);
  const before = await page.evaluate(() => window.__tbl.snapshot());
  // apply out-of-range gas price -> clamped
  await page.click('[data-act="an-apply"][data-val="0"]');
  const gas = await page.inputValue('#in-g\\.\\.gasPrice');
  check('out-of-range value clamped on apply', Number(gas) <= 12 && Number(gas) > 5.5, `gas=${gas}`);
  check('edited marker set', await page.locator('[data-wrap="g..gasPrice"].is-edited').count() === 1);
  const after = await page.evaluate(() => window.__tbl.snapshot());
  check('results changed after apply', JSON.stringify(before.ranks) !== JSON.stringify(after.ranks));
  check('Apply replaced by Applied', (await page.locator('.an-done', { hasText: 'Applied' }).count()) >= 1);
  // question set
  await page.fill('#an-q-0', '14000');
  await page.click('[data-act="an-qset"][data-val="0"]');
  check('question Set updates miles', (await page.inputValue('#in-g\\.\\.milesPerYear')) === '14000');
  // apply all remaining
  await page.click('[data-act="an-apply"]');
  check('elec price applied', Number(await page.inputValue('#in-g\\.\\.elecPrice')) === 0.12);
  // add car
  const selBefore = (await page.evaluate(() => window.__tbl.snapshot())).selected;
  await page.click('[data-act="an-addcar"]');
  const selAfter = (await page.evaluate(() => window.__tbl.snapshot())).selected;
  check('add car selects rav4h', !selBefore.includes('rav4h') && selAfter.includes('rav4h'));
  check('answer persists after refreshAll', await page.locator('.an-summary').count() === 1);
  // settings
  await page.click('[data-act="an-settings"]');
  const snap = await page.evaluate(() => window.__tbl.snapshot());
  check('settings applied (mode metrics)', snap.mode === 'metrics');
  check('preset planet applied', (await page.textContent('#ctl-summary')).includes('Planet-first'));
  // history: second call includes first
  await page.fill('#an-text', 'What if gas hits $8?');
  await page.click('[data-act="an-explain"]');
  await page.waitForTimeout(400);
  const p2 = await page.evaluate(() => window.__prompts[1].p);
  check('second prompt carries history + explain task', p2.includes('Earlier question 1') && p2.includes('Explain these results'));
  check('textarea text preserved across renders', (await page.inputValue('#an-text')).includes('gas hits'));
  check('no console errors (normal flow)', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: path.resolve(__dirname, '../qa-shots/analyst-desktop.png'), fullPage: false });
  await ctx.close();

  // 2. mobile no overflow
  ({ ctx, page, errors } = await open(browser, 390, okMock));
  await page.click('[data-act="an-example"][data-val="1"]');
  await page.click('[data-act="an-analyze"]');
  await page.waitForSelector('.an-summary');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile: no horizontal overflow', over <= 1, `overflow=${over}`);
  check('mobile: no console errors', errors.length === 0, errors.join('|'));
  await page.screenshot({ path: path.resolve(__dirname, '../qa-shots/analyst-mobile.png') });
  await ctx.close();

  // 3. error paths
  for (const [code, expect] of [['rate_limited', 'usage limit'], ['boom', 'could not answer']]) {
    ({ ctx, page, errors } = await open(browser, 1280, `window.claude={use:async()=>({json:async()=>{const e=new Error('x');e.code='${code}';throw e}})};`));
    await page.fill('#an-text', 'test');
    await page.click('[data-act="an-analyze"]');
    await page.waitForTimeout(200);
    check(`${code}: friendly message`, (await page.textContent('#an-status')).includes(expect));
    check(`${code}: buttons re-enabled`, !(await page.locator('[data-act="an-analyze"]').isDisabled()));
    await ctx.close();
  }
  // not_granted hides panel
  ({ ctx, page } = await open(browser, 1280, `window.claude={use:async()=>({json:async()=>{const e=new Error('x');e.code='not_granted';throw e}})};`));
  await page.fill('#an-text', 'test');
  await page.click('[data-act="an-analyze"]');
  await page.waitForTimeout(200);
  check('not_granted hides panel', !(await page.locator('#analyst').isVisible()));
  await ctx.close();
  // garbage answer
  ({ ctx, page } = await open(browser, 1280, `window.claude={use:async()=>({json:async()=>({junk:true})})};`));
  await page.fill('#an-text', 'test');
  await page.click('[data-act="an-analyze"]');
  await page.waitForTimeout(200);
  check('garbage answer -> unusable message', (await page.textContent('#an-status')).includes('did not return anything usable'));
  await ctx.close();
  // stop
  ({ ctx, page } = await open(browser, 1280, `window.claude={use:async()=>({json:(p,o)=>new Promise((_,rej)=>o.signal.addEventListener('abort',()=>{const e=new Error('a');e.name='AbortError';rej(e)}))})};`));
  await page.fill('#an-text', 'test');
  await page.click('[data-act="an-analyze"]');
  check('Stop button visible while busy', await page.locator('[data-act="an-stop"]').isVisible());
  await page.click('[data-act="an-stop"]');
  await page.waitForTimeout(200);
  check('Stop aborts cleanly', (await page.textContent('#an-status')).includes('Stopped') && !(await page.locator('[data-act="an-analyze"]').isDisabled()));
  await ctx.close();
  // unavailable
  ({ ctx, page } = await open(browser, 1280, `window.claude={use:async()=>null};`));
  check('sample null hides panel', !(await page.locator('#analyst').isVisible()));
  await ctx.close();
  ({ ctx, page } = await open(browser, 1280, ``));
  check('no window.claude hides panel, rest of page works', !(await page.locator('#analyst').isVisible()) && (await page.locator('#res-verdict').isVisible()));
  await ctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
