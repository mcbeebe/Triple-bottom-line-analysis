/**
 * Browser suite for the Phase 1 design system (the #style-guide view).
 * At 390 px and 1280 px, in Ledger and Night: every component renders, no horizontal
 * overflow, no console errors, zero axe WCAG 2.1 A/AA violations, every control at least
 * 44 x 44 px. Then: bottom-sheet focus trap, Escape/Close/backdrop, scroll lock and inert
 * background; keyboard-only reach and activation; routing back to the scorecard.
 */
const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
const AXE = require.resolve('axe-core/axe.min.js');
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CONTROLS = '#style-guide :is(button, a[href], summary, input, select, textarea)';
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

async function open(browser, width, theme) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('**/*', (r) => (/fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.abort() : r.continue()));
  await page.goto(url + '#style-guide', { waitUntil: 'load' });
  if (theme === 'night') await page.click('[data-act="sg-theme"][data-val="night"]');
  return { ctx, page, errors };
}

async function axe(page, label) {
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), AXE_TAGS);
  const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`);
  check(`${label}: axe WCAG 2.1 AA violations = 0`, v.length === 0, v.join(' | '));
}

const active = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { id: a?.id ?? '', inDialog: !!a?.closest('[role="dialog"]'), tag: a?.tagName ?? '' };
});

(async () => {
  const browser = await chromium.launch();

  for (const width of [390, 1280]) {
    for (const theme of ['ledger', 'night']) {
      const label = `${width}px ${theme}`;
      const { ctx, page, errors } = await open(browser, width, theme);
      const st = await page.evaluate(() => ({
        theme: document.body.dataset.theme,
        guide: !document.getElementById('style-guide').hidden,
        main: !document.querySelector('main').hidden,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        counts: Object.fromEntries(Object.entries({
          primary: '.ds-btn-primary', secondary: '.ds-btn-secondary', link: '.ds-btn-link', chip: '.ds-chip', option: '.ds-option',
          step: '.ds-step', stepNav: '.ds-step-nav', slider: '.ds-slider input[type=range]', check: '.ds-check input[type=checkbox]', status: '.ds-status', field: '.ds-field', card: '.ds-card', cardTop: '.ds-card-top', disc: '.ds-disc', sheet: '[data-sheet="sg-sheet"]'
        }).map(([k, sel]) => [k, document.querySelectorAll(sel).length]))
      }));
      const c = st.counts;
      check(`${label}: guide shown, scorecard hidden, theme applied`, st.guide && !st.main && st.theme === theme);
      check(`${label}: no horizontal overflow`, st.overflow <= 0, `overflow=${st.overflow}`);
      check(`${label}: every component renders`, c.primary >= 2 && c.secondary >= 1 && c.link >= 3 && c.chip >= 7 && c.option === 4 && c.step === 2 && c.stepNav === 2 && c.field >= 3 && c.card >= 2 && c.cardTop === 1 && c.disc === 2 && c.sheet === 1 && c.slider === 1 && c.check === 3 && c.status === 4, JSON.stringify(c));
      const small = await page.evaluate((sel) => [...document.querySelectorAll(sel)]
        .filter((el) => el.getClientRects().length)
        .map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, d: el.outerHTML.slice(0, 60) }; })
        .filter((r) => r.w < 44 || r.h < 44), CONTROLS);
      check(`${label}: every control is at least 44 x 44 px`, small.length === 0, small.map((s) => `${Math.round(s.w)}x${Math.round(s.h)} ${s.d}`).join(' | '));
      await axe(page, label);
      await page.click('#sg-open-sheet');
      await axe(page, `${label} sheet open`);
      await page.keyboard.press('Escape');
      check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  // Bottom sheet behavior.
  {
    const { ctx, page, errors } = await open(browser, 390, 'ledger');
    await page.click('#sg-open-sheet');
    // Measured after the click: Playwright scrolls the opener into view before clicking it.
    const y0 = await page.evaluate(() => window.scrollY);
    const opened = await page.evaluate(() => ({
      visible: !document.querySelector('[data-sheet="sg-sheet"]').hidden,
      lock: document.documentElement.classList.contains('ds-scroll-lock'),
      guideInert: document.getElementById('style-guide').inert,
      mainInert: document.querySelector('main').inert
    }));
    check('sheet: opens', opened.visible);
    check('sheet: page behind is inert and scroll-locked', opened.lock && opened.guideInert && opened.mainInert, JSON.stringify(opened));
    check('sheet: focus moves inside', (await active(page)).inDialog);
    let trapped = true;
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); if (!(await active(page)).inDialog) trapped = false; }
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Shift+Tab'); if (!(await active(page)).inDialog) trapped = false; }
    check('sheet: Tab and Shift-Tab stay inside', trapped);
    const ids = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] :is(button:not([disabled]), input, a[href], summary)')].filter((e) => e.getClientRects().length).map((e) => e.id || e.textContent.trim()));
    await page.focus('[data-sheet-close]');
    await page.keyboard.press('Shift+Tab');
    const wrapped = await page.evaluate(() => { const a = document.activeElement; return a.id || a.textContent.trim(); });
    check('sheet: Shift-Tab from the first control wraps to the last', wrapped === ids[ids.length - 1], `${wrapped} vs ${ids[ids.length - 1]}`);
    await page.mouse.move(195, 100);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(200);
    check('sheet: page behind does not scroll', (await page.evaluate(() => window.scrollY)) === y0);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({
      hidden: document.querySelector('[data-sheet="sg-sheet"]').hidden,
      lock: document.documentElement.classList.contains('ds-scroll-lock'),
      inert: document.getElementById('style-guide').inert || document.querySelector('main').inert
    }));
    check('sheet: Escape closes and restores the page', closed.hidden && !closed.lock && !closed.inert, JSON.stringify(closed));
    check('sheet: focus returns to the opener after Escape', (await active(page)).id === 'sg-open-sheet');
    await page.click('#sg-open-sheet');
    await page.click('[data-sheet-close]');
    check('sheet: Close button closes and returns focus', (await page.evaluate(() => document.querySelector('[data-sheet="sg-sheet"]').hidden)) && (await active(page)).id === 'sg-open-sheet');
    await page.click('#sg-open-sheet');
    await page.mouse.click(10, 10);
    check('sheet: tap outside closes and returns focus', (await page.evaluate(() => document.querySelector('[data-sheet="sg-sheet"]').hidden)) && (await active(page)).id === 'sg-open-sheet');
    check('sheet: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // Keyboard only: every enabled control is reachable, shows a focus ring, and works.
  {
    const { ctx, page, errors } = await open(browser, 1280, 'ledger');
    const expected = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => !e.disabled && e.getClientRects().length).length, CONTROLS);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    const seen = new Set();
    let noRing = [];
    for (let i = 0; i < expected + 5; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate((sel) => {
        const a = document.activeElement;
        if (!a || !a.closest('#style-guide')) return null;
        const ring = (el) => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; };
        const host = a.closest('.ds-input');
        // Key by position: several controls (e.g. the two "Skip to answer" buttons) have identical markup.
        return { key: [...document.querySelectorAll(sel)].indexOf(a), ring: ring(a) || (host ? ring(host) : false) };
      }, CONTROLS);
      if (!info) continue;
      seen.add(info.key);
      if (!info.ring) noRing.push(info.key);
    }
    check('keyboard: Tab reaches every enabled control', seen.size === expected, `${seen.size} of ${expected}`);
    check('keyboard: every focused control shows a focus ring', noRing.length === 0, noRing.slice(0, 3).join(' | '));
    await page.focus('[data-act="sg-chip"][data-val="suv"]');
    await page.keyboard.press('Enter');
    await page.focus('[data-act="sg-option"][data-val="trade"]');
    await page.keyboard.press('Space');
    const pressed = await page.evaluate(() => ({
      suv: document.querySelector('[data-act="sg-chip"][data-val="suv"]').getAttribute('aria-pressed'),
      sedan: document.querySelector('[data-act="sg-chip"][data-val="sedan"]').getAttribute('aria-pressed'),
      trade: document.querySelector('[data-act="sg-option"][data-val="trade"]').getAttribute('aria-pressed'),
      sell: document.querySelector('[data-act="sg-option"][data-val="sell"]').getAttribute('aria-pressed')
    }));
    check('keyboard: Enter and Space press chips and option buttons (single choice)', pressed.suv === 'true' && pressed.sedan === 'false' && pressed.trade === 'true' && pressed.sell === 'false', JSON.stringify(pressed));
    await page.focus('#sg-disc-1 > summary');
    await page.keyboard.press('Enter');
    check('keyboard: Enter opens a disclosure', await page.evaluate(() => document.getElementById('sg-disc-1').open));
    await page.focus('#sg-open-sheet');
    await page.keyboard.press('Enter');
    check('keyboard: Enter opens the sheet', (await active(page)).inDialog);
    await page.keyboard.press('Escape');
    check('keyboard: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // Number fields: commas, strict parsing, clamping (Phase 2, owner decision: add commas).
  {
    const { ctx, page, errors } = await open(browser, 390, 'ledger');
    const events = [];
    await page.exposeFunction('__numEvent', (d) => events.push(d));
    await page.evaluate(() => document.addEventListener('ds:number', (e) => window.__numEvent(e.detail)));
    const f = '#sg-sale';
    const read = () => page.evaluate((sel) => { const el = document.querySelector(sel); return { v: el.value, inv: el.getAttribute('aria-invalid'), err: document.getElementById(el.id + '-error').textContent, last: el.dataset.last }; }, f);
    check('field: starts with commas', (await read()).v === '9,000');
    await page.fill(f, '12000');
    await page.locator(f).blur();
    let r = await read();
    check('field: typing 12000 commits 12000 and shows 12,000 after leaving', r.v === '12,000' && r.last === '12000' && events.some((e) => e.name === 'sg-sale' && e.value === 12000), JSON.stringify(r));
    await page.fill(f, '$15,500');
    await page.locator(f).blur();
    check('field: "$15,500" is read as 15500', (await read()).last === '15500');
    await page.fill(f, '7k');
    r = await read();
    check('field: unreadable text is marked invalid with the range and an example', r.inv === 'true' && r.err === 'Enter an amount from $1,000 to $150,000, like 9,000.' && r.last === '15500', JSON.stringify(r));
    await page.fill(f, '-5');
    await page.locator(f).blur();
    r = await read();
    check('field: an out-of-range value is clamped on leaving, with a message', r.v === '1,000' && r.last === '1000' && r.err === 'Changed to $1,000, the lowest allowed.' && r.inv === null, JSON.stringify(r));
    await page.fill(f, '');
    await page.locator(f).blur();
    check('field: an emptied field goes back to the last valid value', (await read()).v === '1,000');
    check('field: the input is a text box with a numeric keyboard', await page.evaluate((sel) => { const el = document.querySelector(sel); return el.type === 'text' && el.inputMode === 'numeric'; }, f));
    check('number fields: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // Routing: the guide is hidden by default and leaving it restores the scorecard and its theme.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    const start = await page.evaluate(() => ({ guide: document.getElementById('style-guide').hidden, main: document.querySelector('main').hidden }));
    check('route: scorecard by default, guide hidden', start.guide && !start.main);
    await page.evaluate(() => { location.hash = 'style-guide'; });
    await page.waitForFunction(() => !document.getElementById('style-guide').hidden);
    await page.click('[data-act="sg-theme"][data-val="night"]');
    await page.click('#style-guide a[href="#"]');
    await page.waitForFunction(() => !document.querySelector('main').hidden);
    const back = await page.evaluate(() => ({ guide: document.getElementById('style-guide').hidden, theme: document.body.dataset.theme, snap: window.__tbl.snapshot().theme }));
    check('route: Back to the scorecard restores the scorecard and its own theme', back.guide && back.theme === back.snap && back.theme === 'ledger', JSON.stringify(back));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('qa-components error:', e);
  process.exit(1);
});
