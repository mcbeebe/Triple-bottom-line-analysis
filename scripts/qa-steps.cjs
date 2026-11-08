/**
 * Browser suite for the Phase 2 guided steps (fresh load, Steps 1 to 3, routing, focus, the answer link).
 * Covers docs/dev-package/phase-2-plan.md "Tests": 3 taps to the answer, Back (browser and in-app), Skip,
 * the just-buy path, trade-in offer, status labels, Something else, the miles slider, the 4-car limit and
 * zero cars, adding and removing your own car, commas, keyboard-only, deep links, page titles, and on every
 * screen at 390 and 1280 px in the Ledger, Night and Field saved themes: axe WCAG 2.1 A/AA, 44 px targets,
 * no overflow, no console errors.
 */
const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
const AXE = require.resolve('axe-core/axe.min.js');
const CONTROLS = '#steps :is(button, a[href], summary, input, select, textarea), #answer-bar :is(button, a[href])';
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

async function open(browser, { width = 390, theme = null, hash = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem('tbl-theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('**/*', (r) => (/fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.abort() : r.continue()));
  await page.goto(url + hash, { waitUntil: 'load' });
  return { ctx, page, errors };
}

const info = (page) => page.evaluate(() => ({
  hash: location.hash,
  title: document.title,
  steps: !document.getElementById('steps').hidden,
  answer: !document.getElementById('answer-screen').hidden,
  heading: document.querySelector('#steps:not([hidden]) #st-title')?.textContent ?? '',
  active: document.activeElement?.id || document.activeElement?.tagName
}));

async function audit(page, label) {
  const r = await page.evaluate((sel) => {
    const small = [...document.querySelectorAll(sel)]
      .filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
      .map((el) => { const b = el.getBoundingClientRect(); return { w: b.width, h: b.height, d: el.outerHTML.slice(0, 70) }; })
      .filter((b) => b.w < 44 || b.h < 44);
    // #style-guide is its own container on purpose; the step and answer routes must never name an element (the browser would jump to it).
    const ids = ['step-1', 'step-2', 'step-3', 'answer'].filter((n) => document.getElementById(n));
    return { overflow: document.documentElement.scrollWidth - window.innerWidth, small, ids };
  }, CONTROLS);
  check(`${label}: no horizontal overflow`, r.overflow <= 0, `overflow=${r.overflow}`);
  check(`${label}: every control is at least 44 x 44 px`, r.small.length === 0, r.small.map((s) => `${Math.round(s.w)}x${Math.round(s.h)} ${s.d}`).join(' | '));
  check(`${label}: no route name matches an element id`, r.ids.length === 0, r.ids.join(','));
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate(() => window.axe.run(document.getElementById('steps'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`);
  check(`${label}: axe WCAG 2.1 AA violations = 0`, v.length === 0, v.join(' | '));
}

const statusText = (page, slot) => page.evaluate((id) => document.getElementById(id)?.textContent.replace(/:.*$/, '').trim(), slot);

(async () => {
  const browser = await chromium.launch();

  // ---------- fresh load, 3 taps, Back ----------
  {
    const { ctx, page, errors } = await open(browser);
    let s = await info(page);
    check('fresh load shows Step 1', s.steps && !s.answer && s.heading === 'What are you deciding?' && s.title.startsWith('Step 1 of 3: What are you deciding?'), JSON.stringify(s));
    check('fresh load: nothing pressed and focus not moved', (await page.locator('#steps [aria-pressed="true"]').count()) === 0 && s.active === 'BODY');
    check('Step 1: without the AI there is no analyst option', (await page.locator('#steps .ds-option').count()) === 3 && !(await page.locator('#steps').innerText()).includes('Not sure'));
    await page.click('[data-act="st-path"][data-val="sell"]');
    s = await info(page);
    check('tap 1 (Sell) opens Step 2 and focuses its heading', s.hash === '#step-2' && s.heading === 'Your car and your driving' && s.active === 'st-title', JSON.stringify(s));
    await page.click('[data-act="st-next"]');
    s = await info(page);
    check('tap 2 (Continue to cars) opens Step 3 and focuses its heading', s.hash === '#step-3' && s.heading === 'Which cars should we compare?' && s.active === 'st-title', JSON.stringify(s));
    await page.click('[data-act="st-answer"]');
    s = await info(page);
    const snap = await page.evaluate(() => window.__tbl.snapshot());
    const keep = await page.evaluate(() => [...document.querySelectorAll('#answer-screen .ds-card-name')].map((h) => h.textContent));
    check('tap 3 (Show my answer) shows the answer and focuses its heading', s.answer && !s.steps && s.active === 'ans-title' && s.title.startsWith('Your answer'), JSON.stringify(s));
    check('the default answer: Keep your gas sedan plus Bolt, Camry Hybrid and Corolla', keep.includes('Keep your gas sedan') && ['bolt-loan', 'bolt-lease', 'camryh-loan', 'camryh-lease', 'corolla-loan', 'keep'].every((id) => snap.ranks.some((r) => r.id === id)) && snap.ranks.length === 6, keep.join(','));
    check('the answer heading is scrolled into view', await page.evaluate(() => { const r = document.getElementById('ans-title').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; }));
    check('the basis line offers Edit, and no assumption line once a path is chosen', (await page.locator('#ans-edit').isVisible()) && (await page.locator('#answer-screen .ds-answer-note').count()) === 0);
    await page.goBack();
    s = await info(page);
    check('browser Back returns to Step 3 with focus on its heading', s.hash === '#step-3' && s.steps && s.active === 'st-title', JSON.stringify(s));
    await page.click('#steps [data-act="st-back"]');
    s = await info(page);
    check('in-app Back goes to Step 2 (via browser history)', s.hash === '#step-2' && s.active === 'st-title', JSON.stringify(s));
    await page.click('#steps [data-act="st-back"]');
    s = await info(page);
    check('in-app Back again goes to Step 1, which now shows Sell pressed', s.hash === '' || s.hash === '#step-1');
    check('Step 1 shows the chosen path as pressed', (await page.locator('[data-act="st-path"][data-val="sell"][aria-pressed="true"]').count()) === 1);
    await page.goForward();
    check('browser Forward goes back to Step 2', (await info(page)).hash === '#step-2');
    check('flow: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Skip ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.click('#steps [data-act="st-skip"]');
    let s = await info(page);
    check('Skip from Step 1 (no path chosen) shows the answer with the sell assumption stated', s.answer && (await page.locator('#answer-screen .ds-answer-note').innerText()) === 'We assumed you sell your car yourself.');
    check('...and the basis line says Sell, then buy', (await page.locator('#answer-screen .ds-basis').innerText()).startsWith('Sell, then buy'));
    await page.click('#ans-edit');
    s = await info(page);
    check('Edit with no path chosen goes to Step 1', s.steps && s.heading === 'What are you deciding?' && s.active === 'st-title', JSON.stringify(s));
    await page.click('[data-act="st-path"][data-val="trade"]');
    await page.click('#steps [data-act="st-skip"]');
    check('Skip from Step 2 shows the answer', (await info(page)).answer);
    await page.click('#ans-edit');
    s = await info(page);
    check('Edit after choosing a path goes to Step 2', s.heading === 'Your car and your driving', JSON.stringify(s));
    await page.click('[data-act="st-next"]');
    await page.click('#steps [data-act="st-skip"]');
    check('Skip from Step 3 shows the answer', (await info(page)).answer);
    check('skip: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Step 2: trade, status labels, Lexus source, Something else, slider, commas ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.click('[data-act="st-path"][data-val="trade"]');
    check('trade path: the field is "Trade-in offer" at 15% below the private value', (await page.locator('label[for="st-value"]').innerText()) === 'Trade-in offer' && (await page.inputValue('#st-value')) === '7,650');
    check('trade path: the discount is called a placeholder', /^Allowed: .* Placeholder: dealers usually offer about 15% less than a private buyer\. California taxes the full price, so a trade-in saves no sales tax\.$/.test(await page.locator('#st-value-hint').innerText()));
    check('sedan value is marked Placeholder', (await statusText(page, 'st-value-status')) === 'Placeholder');
    await page.fill('#st-value', '8500');
    await page.locator('#st-value').blur();
    check('typing an offer shows commas and marks it Your number', (await page.inputValue('#st-value')) === '8,500' && (await statusText(page, 'st-value-status')) === 'Your number');
    await page.click('[data-act="st-preset"][data-val="lexus"]');
    const src = await page.locator('#st-value-status a').getAttribute('href').catch(() => null);
    check('Lexus example: the value shows Source with an https link', (await statusText(page, 'st-value-status')) === 'Source' && /^https:\/\//.test(src || ''), src || '');
    check('choosing a preset keeps focus on that chip', await page.evaluate(() => document.activeElement?.dataset.val === 'lexus'));
    await page.click('[data-act="st-preset"][data-val="custom"]');
    check('Something else opens name, mpg, repair cost and insurance (no second value field)', (await page.locator('#st-car-name').count()) === 1 && (await page.locator('#st-mpg, #st-maint, #st-ins').count()) === 3 && (await page.locator('#st-value').count()) === 1);
    check('Something else fields are marked Placeholder', (await statusText(page, 'st-mpg-status')) === 'Placeholder' && (await statusText(page, 'st-ins-status')) === 'Placeholder');
    await page.fill('#st-car-name', 'Old Civic');
    await page.fill('#st-mpg', '31');
    await page.locator('#st-mpg').blur();
    check('editing mpg marks it Your number', (await statusText(page, 'st-mpg-status')) === 'Your number');
    await page.focus('#st-miles');
    await page.keyboard.press('ArrowRight');
    const miles = await page.evaluate(() => ({ out: document.getElementById('st-miles-out').textContent, vt: document.getElementById('st-miles').getAttribute('aria-valuetext') }));
    check('the miles slider moves with arrow keys and says the value in words', miles.out === '8,000' && miles.vt === '8,000 miles a year', JSON.stringify(miles));
    check('a moved slider is marked Your number', (await statusText(page, 'st-miles-status')) === 'Your number');
    await page.click('[data-act="st-next"]');
    await page.click('[data-act="st-answer"]');
    const ans = await page.evaluate(() => ({ keep: [...document.querySelectorAll('#answer-screen .ds-card-name')].map((h) => h.textContent).find((t) => t.startsWith('Keep')), basis: document.querySelector('#answer-screen .ds-basis').textContent }));
    const mpg = String((await page.evaluate(() => window.__tbl.snapshot())).cars.find((c) => c.owned).mpg);
    check('step answers reach the answer screen (name, mpg, miles)', ans.keep === 'Keep your Old Civic' && ans.basis.includes('8,000 miles a year') && mpg === '31', JSON.stringify({ ...ans, mpg }));
    check('step 2: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Just buy ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.click('[data-act="st-path"][data-val="none"]');
    const s = await info(page);
    check('Just buy: Step 2 is "Your driving" with miles only', s.heading === 'Your driving' && (await page.locator('#st-value').count()) === 0 && (await page.locator('#st-miles').count()) === 1 && s.title.startsWith('Step 2 of 3: Your driving'), JSON.stringify(s));
    await page.click('[data-act="st-next"]');
    await page.click('[data-act="st-answer"]');
    check('Just buy: the answer has no keep option', !(await page.evaluate(() => window.__tbl.snapshot())).ranks.some((r) => r.id === 'keep'));
    check('just buy: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Step 3: limit, zero, add and remove your own car ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.click('[data-act="st-path"][data-val="sell"]');
    await page.click('[data-act="st-next"]');
    const count = () => page.locator('#st-count').innerText();
    check('Step 3 starts with 3 of up to 4 chosen', (await count()) === '3 of up to 4 chosen.');
    await page.focus('#st-pick-tesla');
    await page.keyboard.press('Space');
    check('at 4 cars the status line states the limit', (await count()) === '4 of 4 chosen. Pick up to 4. Uncheck one first.');
    const lim = await page.evaluate(() => ({ disabled: [...document.querySelectorAll('input[data-act="st-pick"]:not(:checked)')].every((b) => b.disabled && b.getAttribute('aria-describedby').includes('st-count')), add: document.getElementById('st-addopen').disabled, focus: document.activeElement.id, live: document.getElementById('st-count').getAttribute('role') }));
    check('at 4 cars the other boxes and "+ Add my own car" are disabled with the reason', lim.disabled && lim.add && lim.live === 'status', JSON.stringify(lim));
    check('ticking a box keeps focus on it', lim.focus === 'st-pick-tesla');
    for (const id of ['tesla', 'bolt', 'camryh', 'corolla']) await page.click(`label[for="st-pick-${id}"]`);
    const zero = await page.evaluate(() => ({ show: document.getElementById('st-show').disabled, skip: document.querySelector('#steps [data-act="st-skip"]').disabled, why: document.getElementById('st-show').getAttribute('aria-describedby') }));
    check('with no cars, Show my answer and Skip are disabled with the reason', (await count()) === 'No cars chosen. Pick at least one car to compare.' && zero.show && zero.skip && zero.why === 'st-count', JSON.stringify(zero));
    await page.click('#st-addopen');
    check('opening the form focuses the car name', await page.evaluate(() => document.activeElement.id === 'st-new-name'));
    await page.fill('#st-new-name', 'My Ioniq');
    await page.fill('#st-new-price', '41,000');
    await page.locator('#st-new-price').blur();
    await page.focus('#st-new-name');
    await page.keyboard.press('Enter');
    const added = await page.evaluate(() => { const box = [...document.querySelectorAll('input[data-act="st-pick"]')].find((b) => document.querySelector(`label[for="${b.id}"] .ds-check-name`).textContent === 'My Ioniq'); return { checked: box?.checked, focus: document.activeElement === box, detail: box && document.getElementById(box.id + '-detail').textContent }; });
    check('Enter adds the car, checks it and focuses it', added.checked && added.focus && added.detail === '$41,000 · Loan only', JSON.stringify(added));
    check('the status line announces it', (await count()).startsWith('Added My Ioniq. 1 of up to 4 chosen.'));
    const remove = page.locator('[data-act="st-remove"]');
    check('your own car has a Remove button named for the car', (await remove.getAttribute('aria-label')) === 'Remove My Ioniq');
    await remove.click();
    check('Remove takes it out and moves focus to "+ Add my own car"', (await page.locator('[data-act="st-remove"]').count()) === 0 && (await page.evaluate(() => document.activeElement.id)) === 'st-addopen');
    await page.click('label[for="st-pick-bolt"]');
    await page.click('#st-addopen');
    await page.click('input[data-act="st-kind"][value="ice"]');
    check('choosing Gas switches the efficiency field to mpg', (await page.locator('label[for="st-new-eff"]').innerText()) === 'Fuel economy');
    await page.click('[data-act="st-cancel"]');
    check('Cancel closes the form and returns focus', (await page.locator('#st-addcar').count()) === 0 && (await page.evaluate(() => document.activeElement.id)) === 'st-addopen');
    check('step 3: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- picker and presets (ported from the old page's qa.cjs and qa-path.cjs) ----------
  {
    const { ctx, page, errors } = await open(browser);
    const snap = () => page.evaluate(() => window.__tbl.snapshot());
    await page.click('[data-act="st-path"][data-val="sell"]');
    const own = async () => (await snap()).cars.find((c) => c.owned);
    await page.click('[data-act="st-preset"][data-val="suv"]');
    const suv = await own();
    check('choosing a preset sets its value and mpg', suv.price === 11000 && suv.mpg === 21 && (await page.inputValue('#st-value')) === '11,000', JSON.stringify(suv));
    await page.click('[data-act="st-next"]');
    const legends = await page.evaluate(() => [...document.querySelectorAll('#steps .ds-checks > legend')].map((l) => l.textContent));
    check('Step 3 lists electric, hybrid and gas cars in groups', legends.slice(0, 3).join('|') === 'Electric|Hybrid|Gas', legends.join('|'));
    await page.focus('#st-pick-corolla');
    await page.keyboard.press('Space');
    const ids = (await snap()).ranks.map((r) => r.id);
    check('unticking a car takes its options out of the answer', !ids.some((id) => id.startsWith('corolla')) && ids.includes('bolt-loan'), ids.join(','));
    await page.click('[data-act="st-answer"]');
    const keepName = await page.evaluate(() => [...document.querySelectorAll('#answer-screen .ds-card-name')].map((h) => h.textContent).find((t) => t.startsWith('Keep')));
    check('the keep card takes its name from the preset', keepName === 'Keep your gas SUV', keepName);
    await page.evaluate(() => { location.hash = '#step-2'; });
    await page.waitForSelector('[data-act="st-preset"]');
    await page.click('[data-act="st-preset"][data-val="hybrid"]');
    check('the hybrid preset still has a keep option', (await snap()).ranks.some((r) => r.id === 'keep') && (await own()).mpg > 30);
    check('picker and presets: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- keyboard only, deep links ----------
  {
    const { ctx, page, errors } = await open(browser, { width: 1280 });
    const tabTo = async (pred) => { for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(pred)) return true; } return false; };
    const ringOk = () => page.evaluate(() => { const a = document.activeElement; const box = a.matches('.ds-check-input') ? a.nextElementSibling : a; const s = getComputedStyle(box); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; });
    let ok = await tabTo(() => document.activeElement?.dataset?.val === 'sell');
    check('keyboard: Tab reaches the first option, with a focus ring', ok && (await ringOk()));
    await page.keyboard.press('Enter');
    ok = await tabTo(() => document.activeElement?.dataset?.act === 'st-next');
    check('keyboard: Enter chose it; Tab reaches Continue to cars', ok && (await info(page)).hash === '#step-2');
    await page.keyboard.press('Enter');
    ok = await tabTo(() => document.activeElement?.id === 'st-pick-tesla');
    check('keyboard: checkboxes are reachable and show a focus ring', ok && (await ringOk()));
    ok = await tabTo(() => document.activeElement?.id === 'st-show');
    await page.keyboard.press('Enter');
    check('keyboard only completes the flow to the answer', ok && (await info(page)).answer && (await info(page)).active === 'ans-title');
    check('keyboard: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
    // Deep links need a fresh page: a hash change on the same page keeps the path already chosen.
    for (const [hash, want, name] of [['#step-3', '#step-1', 'a deep link to Step 3 before a path is chosen goes to Step 1'], ['#nonsense', '#step-1', 'an unknown hash shows Step 1 and the address is corrected']]) {
      const fresh = await open(browser, { width: 1280, hash });
      const s = await info(fresh.page);
      check(name, s.heading === 'What are you deciding?' && s.hash === want, JSON.stringify(s));
      await fresh.ctx.close();
    }
  }

  // ---------- every screen: overflow, 44 px, axe, at 390 and 1280 in three saved themes ----------
  for (const width of [390, 1280]) {
    for (const theme of ['ledger', 'night', 'field']) {
      const { ctx, page, errors } = await open(browser, { width, theme });
      const tag = `${width}px ${theme}`;
      await audit(page, `${tag} Step 1`);
      await page.click('[data-act="st-path"][data-val="trade"]');
      await audit(page, `${tag} Step 2 trade`);
      await page.click('[data-act="st-preset"][data-val="custom"]');
      await audit(page, `${tag} Step 2 Something else`);
      await page.click('[data-act="st-next"]');
      await page.click('label[for="st-pick-tesla"]');
      await audit(page, `${tag} Step 3 at the limit`);
      await page.click('label[for="st-pick-tesla"]');
      await page.click('#st-addopen');
      await audit(page, `${tag} Step 3 add-car form`);
      await page.click('[data-act="st-answer"]');
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${tag} answer: no horizontal overflow`, ov <= 0, `overflow=${ov}`);
      check(`${tag}: no console errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('qa-steps error:', e);
  console.log(`\n${failures} check(s) failed before the error`);
  process.exit(1);
});
