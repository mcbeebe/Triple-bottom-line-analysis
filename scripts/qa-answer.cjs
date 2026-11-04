/**
 * Browser suite for the Phase 3 answer screen (#answer) and its panels.
 * Phase 3a: verdict, basis line, cards, "What would change this", footer, links to "All the details",
 * the Fine-tune top drivers with live updates, and (commit 5) Share links. At 390 and 1280 px in Ledger and
 * Night: axe WCAG 2.1 A/AA, 44 px controls, no overflow, no console errors.
 */
const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
const AXE = require.resolve('axe-core/axe.min.js');
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

async function open(browser, { width = 390, theme = null, hash = '#answer' } = {}) {
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

async function audit(page, root, label) {
  const r = await page.evaluate((sel) => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    small: [...document.querySelectorAll(`${sel} :is(button, a[href], input, select, summary)`)]
      .filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
      .map((el) => { const b = el.getBoundingClientRect(); return { w: b.width, h: b.height, d: el.outerHTML.slice(0, 70) }; })
      .filter((b) => b.w < 44 || b.h < 44)
  }), root);
  check(`${label}: no horizontal overflow`, r.overflow <= 0, `overflow=${r.overflow}`);
  check(`${label}: every control is at least 44 x 44 px`, r.small.length === 0, r.small.map((s) => `${Math.round(s.w)}x${Math.round(s.h)} ${s.d}`).join(' | '));
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate((sel) => window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }), root);
  const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`);
  check(`${label}: axe WCAG 2.1 AA violations = 0`, v.length === 0, v.join(' | '));
}

const read = (page) => page.evaluate(() => ({
  title: document.getElementById('ans-title')?.textContent,
  basis: document.querySelector('#answer-screen .ds-basis')?.textContent.replace(/\s+Edit$/, '').trim(),
  cards: [...document.querySelectorAll('#answer-screen .ds-card')].map((c) => ({ name: c.querySelector('.ds-card-name').textContent, tag: c.querySelector('.ds-card-tag')?.textContent ?? '', cost: c.querySelector('dd').textContent })),
  change: [...document.querySelectorAll('#answer-screen .ds-change p')].map((p) => p.textContent),
  notice: document.querySelector('#answer-screen .ds-notice p')?.textContent
}));

(async () => {
  const browser = await chromium.launch();

  // ---------- the default answer ----------
  {
    const { ctx, page, errors } = await open(browser);
    const a = await read(page);
    check('verdict sentence (near-tie rule, natural names)', a.title === 'It is close. Keeping your gas sedan and the Chevy Bolt (loan) are within 2 points.', a.title);
    check('basis line', a.basis === "Sell, then buy · 7,500 miles a year · 8 years, in today's dollars", a.basis);
    check('three cards: keep, Bolt (loan), Camry Hybrid (loan)', a.cards.map((c) => c.name).join('|') === 'Keep My gas sedan|Chevy Bolt (loan)|Toyota Camry Hybrid (loan)', a.cards.map((c) => c.name).join('|'));
    check('tags in words, given to the options that earn them', a.cards[0].tag === 'Highest overall score · Lowest cost' && a.cards[1].tag === 'Lowest carbon' && a.cards[2].tag === '', JSON.stringify(a.cards.map((c) => c.tag)));
    check('cards show cost over 8 years', a.cards[0].cost === '$20,984' && a.cards[1].cost === '$39,480');
    check('what would change this: real break-even and today\'s gas price', a.change[0] === 'Gas above $15.29 a gallon makes the Chevy Bolt (loan) cost less than keeping your gas sedan. Today the tool assumes $5.50.', a.change[0]);
    check('what would change this: the what-if flip in plain words', a.change[1] === 'If your gas sedan were scrapped instead of driven by a new owner, the Chevy Bolt (loan) would score highest.', a.change[1]);
    check('footer: not advice, California, both data dates (Q4, Q7)', a.notice === 'Estimates for comparison, not financial or tax advice. California rules and prices. Prices and rates as of Nov 1, 2026; default cars checked Nov 4, 2026.', a.notice);
    const first = await page.evaluate(() => document.querySelector('#answer-screen .ds-card').getBoundingClientRect().bottom);
    check('the first card is visible within one phone screen of the heading', first < 844, `bottom=${Math.round(first)}`);
    check('page title', (await page.title()) === 'Your answer · TBL Decision Scorecard');
    check('default answer: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- just buy: no keep, no change box ----------
  {
    const { ctx, page, errors } = await open(browser, { hash: '' });
    await page.click('[data-act="st-path"][data-val="none"]');
    await page.click('[data-act="st-next"]');
    await page.click('[data-act="st-answer"]');
    const a = await read(page);
    check('just buy: no keep card and no "What would change this"', !a.cards.some((c) => c.name.startsWith('Keep')) && a.change.length === 0, JSON.stringify(a.cards.map((c) => c.name)));
    check('just buy: the verdict names the top option without a current car', /^(It is close\. The |The )/.test(a.title) && !/your/.test(a.title), a.title);
    check('just buy: basis line says Just buy', a.basis.startsWith('Just buy'));
    check('just buy: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Fine-tune top drivers, live updates ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.click('#ans-finetune');
    const opened = await page.evaluate(() => ({ open: !document.querySelector('[data-sheet="ft"]').hidden, inDialog: !!document.activeElement.closest('[role="dialog"]'), fields: ['ft-miles', 'ft-gas', 'ft-value'].every((id) => document.getElementById(id)), zev: !!document.querySelector('input[name="ft-zev"]'), discount: !!document.getElementById('ft-discount') }));
    check('Fine-tune opens as a sheet with focus inside', opened.open && opened.inDialog);
    check('top drivers: miles, gas, value, first-time EV buyer (an EV is chosen); no trade discount on the sell path', opened.fields && opened.zev && !opened.discount, JSON.stringify(opened));
    await audit(page, '[data-sheet="ft"]', 'Fine-tune sheet');
    await page.fill('#ft-gas', '16');
    await page.locator('#ft-gas').blur();
    const g = await page.evaluate(() => ({ v: document.getElementById('ft-gas').value, err: document.getElementById('ft-gas-error').textContent, status: document.getElementById('ft-gas-status').textContent, live: document.getElementById('ft-live').textContent, change: document.querySelector('#answer-screen .ds-change p').textContent }));
    check('gas above the range is changed to the highest allowed, with a message', g.v === '10.00' && g.err === 'Changed to $10.00, the highest allowed.', JSON.stringify(g));
    check('an edited value is marked Your number', g.status === 'Your number');
    check('the answer updates behind the sheet and the change is announced', g.change.includes('Today the tool assumes $10.00.') && g.live.startsWith('Answer updated. '), JSON.stringify(g));
    await page.focus('#ft-miles');
    await page.keyboard.press('ArrowRight');
    check('moving the miles slider updates the basis line', (await read(page)).basis.includes('8,000 miles a year'));
    const before = await page.evaluate(() => window.__tbl.snapshot().ranks.find((r) => r.id === 'bolt-loan').npv);
    await page.click('input[name="ft-zev"][value="0"]');
    const after = await page.evaluate(() => window.__tbl.snapshot().ranks.find((r) => r.id === 'bolt-loan').npv);
    check('first-time EV buyer = No removes the $3,500 rebate from the Bolt', Math.abs(after - before - 3500) < 1, `${Math.round(after - before)}`);
    await page.fill('#ft-value', '12,000');
    await page.locator('#ft-value').blur();
    check('editing what the car would sell for changes the answer', (await read(page)).cards.find((c) => c.name.startsWith('Keep')).cost !== '$20,984');
    await page.keyboard.press('Escape');
    check('Escape closes Fine-tune and returns focus to its button', (await page.evaluate(() => document.activeElement.id)) === 'ans-finetune');
    check('fine-tune: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- trade path in Fine-tune ----------
  {
    const { ctx, page, errors } = await open(browser, { hash: '' });
    await page.click('[data-act="st-path"][data-val="trade"]');
    await page.click('#steps [data-act="st-skip"]');
    await page.click('#ans-finetune');
    const t = await page.evaluate(() => ({ label: document.querySelector('label[for="ft-value"]').textContent, v: document.getElementById('ft-value').value, d: document.getElementById('ft-discount')?.value }));
    check('trade path: Fine-tune shows the trade-in offer and the discount', t.label === 'Trade-in offer' && t.v === '7,650' && t.d === '15', JSON.stringify(t));
    await page.fill('#ft-discount', '30');
    await page.locator('#ft-discount').blur();
    check('changing the discount is marked Your number', (await page.evaluate(() => document.getElementById('ft-discount-status').textContent)) === 'Your number');
    check('trade: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Share links (Q2) ----------
  {
    const { ctx, page, errors } = await open(browser, { hash: '' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('[data-act="st-path"][data-val="trade"]');
    await page.click('[data-act="st-preset"][data-val="suv"]');
    await page.click('[data-act="st-next"]');
    await page.click('label[for="st-pick-tesla"]');
    await page.click('[data-act="st-answer"]');
    await page.click('#ans-finetune');
    await page.fill('#ft-gas', '7.25');
    await page.locator('#ft-gas').blur();
    await page.keyboard.press('Escape');
    await page.click('#ans-share');
    const link = await page.inputValue('#share-link');
    const here = await read(page);
    check('Share puts a plain #name in the address (letters, digits, hyphens)', /^#s1-[a-z2-7]+$/.test(await page.evaluate(() => location.hash)) && /#s1-[a-z2-7]+$/.test(link));
    const rows = await page.evaluate(() => [...document.querySelectorAll('.ds-kv dd')].map((d) => d.textContent));
    check('Share lists exactly what the link holds, in plain words', rows[0] === 'Trade my car in' && rows[1] === 'The "Older gas SUV" preset' && rows[2] === '1 number' && rows[3].includes('Tesla Model Y') && rows[5].startsWith('Hybrid scoring'), JSON.stringify(rows));
    check('Share says nothing is sent and typed names are left out', (await page.locator('[data-sheet="share"] .ds-note').innerText()).startsWith('Nothing is sent anywhere.'));
    await audit(page, '[data-sheet="share"]', 'Share sheet');
    await page.click('#share-copy');
    await page.waitForFunction(() => document.getElementById('share-status').textContent.length > 0);
    check('Copy link copies the link and says so', (await page.evaluate(() => navigator.clipboard.readText())) === link && (await page.textContent('#share-status')) === 'Copied. Paste it into a message.');
    await page.keyboard.press('Escape');
    check('closing Share returns focus to its button', (await page.evaluate(() => document.activeElement.id)) === 'ans-share');
    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const q = await other.newPage();
    const qErrors = [];
    q.on('pageerror', (e) => qErrors.push(e.message));
    await q.goto(link, { waitUntil: 'load' });
    const there = await read(q);
    check('opening the link in a new browser shows the same answer', there.title === here.title && there.basis === here.basis && JSON.stringify(there.cards) === JSON.stringify(here.cards), JSON.stringify({ here: here.title, there: there.title }));
    await q.click('#ans-finetune');
    check('...including the edited gas price', (await q.inputValue('#ft-gas')) === '7.25');
    await q.keyboard.press('Escape');
    await q.click('#ans-edit');
    check('Edit from a shared answer goes to Step 2 (the link says what is being decided)', (await q.evaluate(() => document.getElementById('st-title').textContent)) === 'Your car and your driving');
    check('shared link: no console errors', qErrors.length === 0, qErrors.join(' | '));
    await other.close();
    await page.click('#ans-finetune');
    await page.fill('#ft-gas', '8');
    await page.locator('#ft-gas').blur();
    check('an edit after sharing takes the out-of-date share name out of the address', (await page.evaluate(() => location.hash)) === '#answer');
    const bad = await (await browser.newContext()).newPage();
    await bad.goto(link.slice(0, -6) + 'zzzzzz', { waitUntil: 'load' });
    check('a tampered link shows the standard example with a notice', (await bad.evaluate(() => document.querySelector('#answer-screen .ds-answer-note[role="status"]')?.textContent)) === 'That link could not be read, so this shows the standard example.');
    await bad.context().close();
    check('share: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- links to "All the details" until Phase 3b ----------
  {
    const { ctx, page, errors } = await open(browser);
    for (const [btn, target, name] of [['#ans-why', 'res-main', 'Why this result'], ['#ans-table', 'res-main', 'Table'], ['#ans-sources', 'sources', 'Sources']]) {
      await page.click(btn);
      const r = await page.evaluate((id) => ({ hash: location.hash, details: !document.querySelector('main:not(#steps):not(#answer-screen)').hidden, inView: document.getElementById(id).getBoundingClientRect().top < window.innerHeight }), target);
      check(`${name} opens "All the details" at the right part`, r.hash === '#details' && r.details && r.inView, JSON.stringify(r));
      await page.click('#st-toanswer');
      check(`"Back to my answer" from ${name} returns to the answer`, (await page.evaluate(() => location.hash + ' ' + document.activeElement.id)) === '#answer ans-title');
    }
    check('Table link opens the table view', await page.evaluate(() => { document.getElementById('ans-table').click(); return !!document.querySelector('table.results'); }));
    check('links: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- answer screen: axe, 44 px, overflow in both themes and widths ----------
  for (const width of [390, 1280]) {
    for (const theme of ['ledger', 'night']) {
      const { ctx, page, errors } = await open(browser, { width, theme });
      await audit(page, '#answer-screen', `${width}px ${theme} answer`);
      check(`${width}px ${theme}: no console errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('qa-answer error:', e);
  console.log(`\n${failures} check(s) failed before the error`);
  process.exit(1);
});
