const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
// The old page is now "All the details" (#details) until Phase 3b; QA loads it with the original Lexus test case via a boot hook.
const url = 'file://' + path.resolve(__dirname, '../dist/index.html') + '#details';
const shots = path.resolve(__dirname, '../qa-shots');
fs.mkdirSync(shots, { recursive: true });
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { window.__TBL_QA__ = { scenario: 'legacy' }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url, { waitUntil: 'load' });

  const cards = () => page.locator('#res-main .card').count();
  const snap = () => page.evaluate(() => window.__tbl.snapshot());
  const rankOf = (s, id) => s.ranks.find((r) => r.id === id);

  // ---------- layout and discoverability ----------
  check('mobile: scoring options start collapsed', (await page.evaluate(() => document.getElementById('controls').open)) === false);
  check('assumptions panel is visible without opening anything', await page.locator('#assump').isVisible());
  check('assumption inputs are visible (key drivers)', await page.locator('input[data-field="g..gasPrice"]').isVisible());
  check('the "please confirm" box is visible with the MyFirstEV switch', await page.locator('.confirm select[data-field="g..firstTimeZev"]').isVisible());
  const order = await page.evaluate(() => ['res-verdict', 'assump', 'res-main'].map((id) => document.getElementById(id).getBoundingClientRect().top));
  check('assumptions sit between the verdict and the detail results', order[0] < order[1] && order[1] < order[2]);
  check('live scoreboard is present inside the assumptions panel', (await page.locator('#assump #livebar .lchip').count()) >= 2);
  check('car matrix has one column per active car (Lexus + 3 selected)', (await page.locator('.matrix thead th.vh').count()) === 4);
  check('matrix cell exists for Tesla loan APR', await page.locator('input[data-field="tesla.loan.apr"]').count() === 1);

  // ---------- default results ----------
  check('page renders 7 option cards by default', (await cards()) === 7);
  const s0 = await snap();
  check('ranks are 1..7 and unique', JSON.stringify(s0.ranks.map(r => r.rank).sort()) === JSON.stringify([1,2,3,4,5,6,7]));

  // ---------- THE REPORTED BUG: negative Lexus net cost froze the profit score ----------
  await page.fill('input[data-field="lx..price"]', '60000');
  await page.fill('input[data-field="lx..annualValueLoss"]', '0');
  await page.fill('input[data-field="g..horizonYears"]', '3');
  const neg = await snap();
  check('repro: Lexus net cost goes negative with a high resale value', neg.keepNPV < 0, `(${Math.round(neg.keepNPV)})`);
  const profits = neg.ranks.map((r) => Math.round(r.profit * 100));
  check('profit scores still differ across options when the Lexus NPV is negative', new Set(profits).size >= 4, `(${profits.join(',')})`);
  const before = rankOf(neg, 'keep').profit;
  await page.fill('input[data-field="g..gasPrice"]', '12');
  const after = (await snap());
  check('...and the Lexus profit score falls when gas gets expensive', rankOf(after, 'keep').profit < before - 0.5, `(${before.toFixed(1)} -> ${rankOf(after, 'keep').profit.toFixed(1)})`);
  check('edited markers appear on the three changed inputs', (await page.locator('.is-edited').count()) >= 3);
  check('edit counter reports the edits', /edited/.test(await page.locator('#edcount').innerText()) && !/No values/.test(await page.locator('#edcount').innerText()));
  await page.click('[data-act="resetfield"][data-val="g..gasPrice"]');
  check('per-field reset restores the gas price input', (await page.inputValue('input[data-field="g..gasPrice"]')) === '5.5');
  await page.locator('#assump .ahead [data-act="reset"]').click();
  const reset = await snap();
  check('reset all restores default Lexus NPV', Math.abs(reset.keepNPV - s0.keepNPV) < 1e-6, `(${reset.keepNPV.toFixed(0)} vs ${s0.keepNPV.toFixed(0)})`);
  check('...and clears the edited markers', (await page.locator('.is-edited').count()) === 0);

  // ---------- collapsible assumption sections ----------
  const confirmOpen = () => page.evaluate(() => document.querySelector('details[data-sec="confirm"]').open);
  check('the confirm section starts expanded', (await confirmOpen()) === true);
  await page.click('details[data-sec="confirm"] > summary');
  check('tapping the confirm heading collapses it', (await confirmOpen()) === false && !(await page.locator('select[data-field="g..firstTimeZev"]').isVisible()));
  await page.click('details[data-sec="confirm"] > summary');
  check('tapping again expands it', (await confirmOpen()) === true && (await page.locator('select[data-field="g..firstTimeZev"]').isVisible()));
  await page.click('[data-act="collapseall"]');
  check('Collapse all closes every assumption section', (await page.locator('details.asec[open]').count()) === 0);
  check('...but the live scoreboard and header stay visible', (await page.locator('#livebar').isVisible()) && (await page.locator('#edcount').isVisible()));
  await page.click('[data-act="expandall"]');
  check('Expand all opens every section', (await page.locator('details.asec:not([open])').count()) === 0);
  await page.click('details[data-sec="confirm"] > summary');
  await page.click('[data-act="pick"][data-val="rav4h"]');
  check('a collapsed section stays collapsed after the page re-renders (picking a car)', (await confirmOpen()) === false);
  await page.click('[data-act="pick"][data-val="rav4h"]');
  await page.click('details[data-sec="confirm"] > summary');
  await page.selectOption('select[data-field="g..firstTimeZev"]', '0');
  check('section headers show how many values were edited', /1 edited/.test(await page.locator('[data-secedit="confirm"]').innerText()));
  await page.click('[data-act="resetfield"][data-val="g..firstTimeZev"]');
  const boxOver = await page.evaluate(() => { const r = document.querySelector('details[data-sec="confirm"]').getBoundingClientRect(); return r.right - window.innerWidth; });
  check('the confirm box stays inside the screen width', boxOver <= 0.5, `(${boxOver})`);

  // ---------- the Lexus score must respond to its own inputs (default scale) ----------
  await page.click('#controls > summary');
  check('default scale is "typical new car"', (await page.locator('[data-act="scale"][data-val="benchmark"].on').count()) === 1);
  await page.click('#controls > summary');
  const lexusProfit = async () => Number(await page.locator('#res-main .card').filter({ hasText: 'Keep Lexus LX 470' }).locator('.prow').nth(2).locator('.pval').innerText());
  const lexusPlanet = async () => Number(await page.locator('#res-main .card').filter({ hasText: 'Keep Lexus LX 470' }).locator('.prow').nth(0).locator('.pval').innerText());
  const p0 = await lexusProfit(), pl0 = await lexusPlanet();
  await page.fill('input[data-field="lx..maintPerMile"]', '0.05');
  await page.fill('input[data-field="lx..insurancePerYear"]', '400');
  const p1 = await lexusProfit();
  check('Lexus Profit score RISES when its running costs fall', p1 > p0, `(${p0} -> ${p1})`);
  await page.fill('input[data-field="lx..mpg"]', '25');
  const pl1 = await lexusPlanet();
  check('Lexus Planet score RISES when its fuel economy improves', pl1 > pl0, `(${pl0} -> ${pl1})`);
  await page.locator('#assump .ahead [data-act="reset"]').click();

  // ---------- results as a table ----------
  await page.click('[data-act="resviewgo"][data-val="table"]');
  check('the verdict panel has a one-tap shortcut to the table', (await page.locator('table.results').count()) === 1);
  await page.click('[data-act="resviewgo"][data-val="cards"]');
  check('results default to cards', (await page.locator('#res-main .card').count()) === 7);
  await page.click('[data-act="resview"][data-val="table"]');
  check('table view replaces the cards', (await page.locator('#res-main .card').count()) === 0 && (await page.locator('table.results').count()) === 1);
  check('table has one row per option', (await page.locator('table.results tbody tr').count()) === 7);
  const heads = (await page.locator('table.results thead th').allTextContents()).join('|');
  check('table has the key columns', ['Overall', 'Planet', 'People', 'Profit', 'net cost (PV)', 'Lifecycle CO2e', 'Incentives', 'Payback'].every((h) => heads.includes(h)), heads);
  await page.click('[data-act="sort"][data-val="npv"]');
  const firstName = async () => (await page.locator('table.results tbody tr').first().locator('th').innerText()).trim();
  check('sorting by net cost puts the cheapest option first', (await firstName()) === 'Keep Lexus LX 470', await firstName());
  await page.click('[data-act="sort"][data-val="npv"]');
  check('clicking again reverses the sort', (await firstName()) !== 'Keep Lexus LX 470');
  await page.click('[data-act="sort"][data-val="overall"]');
  const overalls = await page.locator('table.results tbody tr td:nth-child(5)').allTextContents();
  check('sorting by overall score descending is monotone', overalls.map(Number).every((v, i, a) => i === 0 || a[i - 1] >= v), overalls.join(','));
  await page.click('[data-act="copytable"]');
  await page.waitForFunction(() => document.getElementById('copynote').textContent.length > 0, null, { timeout: 5000 }).catch(() => {});
  check('copy button gives feedback (copied, or a clear message if the browser blocks it)', (await page.locator('#copynote').innerText()).length > 0);
  await page.screenshot({ path: `${shots}/table-mobile.png`, fullPage: false });
  check('table view causes no page-level horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
  await page.click('[data-act="resview"][data-val="cards"]');
  check('switching back restores the cards', (await page.locator('#res-main .card').count()) === 7);

  // ---------- picker: EVs, hybrids and gas ----------
  check('picker lists electric, hybrid and gas groups', (await page.locator('#picker .pgroup h3').allTextContents()).join('|') === 'Electric|Hybrid|Gas');
  // The limit is 4 cars (owner decision P3), so free a slot before adding a hybrid and a gas car.
  await page.click('[data-act="pick"][data-val="rivian"]');
  await page.click('[data-act="pick"][data-val="rav4h"]');
  await page.click('[data-act="pick"][data-val="corolla"]');
  const picked = await snap();
  check('selecting a hybrid and a gas car adds their options (rav4h loan+lease, corolla loan)', ['rav4h-loan', 'rav4h-lease', 'corolla-loan'].every((id) => picked.ranks.some((r) => r.id === id)));
  check('the matrix gained columns for the new cars', (await page.locator('.matrix thead th.vh').count()) === 5);
  check('a gas-only car has no lease option', !picked.ranks.some((r) => r.id === 'corolla-lease'));
  await page.click('[data-act="pick"][data-val="tesla"]');
  check('deselecting a car removes its options', !(await snap()).ranks.some((r) => r.id.startsWith('tesla')));
  await page.click('[data-act="pick"][data-val="tesla"]');
  // cap at 4: a fifth car is refused with a notice
  await page.click('[data-act="pick"][data-val="equinoxev"]');
  const capped = await snap();
  check('selection is capped at 4 cars', capped.selected.length === 4 && !capped.selected.includes('equinoxev'), `(${capped.selected.length})`);
  check('a notice explains the cap', /Pick up to 4/.test(await page.locator('#picker .notice').innerText()));
  // 4 cars that all lease give 9 options, one more than the 8 cards shown before "Show all"
  await page.click('[data-act="pick"][data-val="corolla"]');
  await page.click('[data-act="pick"][data-val="rivian"]');
  const nine = await snap();
  check('card list collapses to top 8 with a Show-all button', nine.ranks.length === 9 && (await cards()) <= 9 && (await page.locator('[data-act="showall"]').count()) === 1, `(${nine.ranks.length} options)`);
  await page.click('[data-act="showall"]');
  check('Show all reveals every option', (await cards()) === nine.ranks.length);
  await page.click('[data-act="clearpicks"]');
  check('clear selection leaves only the Lexus', (await snap()).ranks.length === 1);
  for (const id of ['tesla', 'rivian', 'bolt']) await page.click(`[data-act="pick"][data-val="${id}"]`);

  // custom car
  await page.click('[data-act="addcustom"][data-val="hybrid"]');
  check('adding a custom hybrid selects it and offers a loan option', (await snap()).ranks.some((r) => r.id === 'custom1-loan'));
  await page.fill('input[data-field="custom1..price"]', '28000');
  await page.fill('input[data-vname="custom1"]', 'My Prius');
  check('custom car can be renamed', (await page.locator('#picker').innerText()).includes('My Prius'));
  await page.click('[data-act="addlease"][data-val="custom1"]');
  check('lease terms can be added to a custom car', (await snap()).ranks.some((r) => r.id === 'custom1-lease'));
  await page.click('[data-act="rmcustom"][data-val="custom1"]');
  check('a custom car can be removed', !(await snap()).ranks.some((r) => r.id.startsWith('custom1')));

  // ---------- incentives ----------
  const base = await snap();
  const boltBase = rankOf(base, 'bolt-loan').npv;
  await page.selectOption('select[data-field="g..firstTimeZev"]', '0');
  const noRebate = await snap();
  check('turning off MyFirstEV raises the Bolt net cost by about $3,500', Math.abs(rankOf(noRebate, 'bolt-loan').npv - boltBase - 3500) < 1, `(${(rankOf(noRebate, 'bolt-loan').npv - boltBase).toFixed(0)})`);
  check('Tesla is unaffected by MyFirstEV (funding closed)', Math.abs(rankOf(noRebate, 'tesla-loan').npv - rankOf(base, 'tesla-loan').npv) < 1e-6);
  await page.selectOption('select[data-field="g..firstTimeZev"]', '1');
  await page.selectOption('select[data-field="g..loanInterestDeduction"]', '0');
  const noDed = await snap();
  check('turning off the loan-interest deduction raises the Tesla loan cost', rankOf(noDed, 'tesla-loan').npv > rankOf(base, 'tesla-loan').npv + 100);
  check('...but not the Tesla lease (leases do not qualify)', Math.abs(rankOf(noDed, 'tesla-lease').npv - rankOf(base, 'tesla-lease').npv) < 1e-6);
  await page.selectOption('select[data-field="g..loanInterestDeduction"]', '1');
  await page.fill('input[data-field="g..magi"]', '300000');
  const hi = await snap();
  check('income above the phase-out removes the deduction', Math.abs(rankOf(hi, 'tesla-loan').npv - rankOf(noDed, 'tesla-loan').npv) < 1e-6);
  await page.fill('input[data-field="g..magi"]', '150000');
  await page.selectOption('select[data-field="g..cc4a"]', '1');
  const cc = await snap();
  check('Clean Cars 4 All changes the replacement scores (scrapping removes the sold Lexus emissions)', rankOf(cc, 'bolt-loan').overall > rankOf(base, 'bolt-loan').overall + 1, `(${rankOf(base, 'bolt-loan').overall.toFixed(1)} -> ${rankOf(cc, 'bolt-loan').overall.toFixed(1)})`);
  await page.selectOption('select[data-field="g..cc4a"]', '0');
  await page.fill('input[data-field="g..gasUpstreamKgPerGal"]', '0');
  const noUp = await snap();
  await page.fill('input[data-field="g..gasUpstreamKgPerGal"]', '2.86');
  check('upstream gasoline input affects emissions only (NPV unchanged)', Math.abs(noUp.keepNPV - base.keepNPV) < 1e-6);

  // ---------- design, scoring, views ----------
  await page.click('#controls > summary');
  for (const t of ['ledger', 'night', 'field']) {
    await page.click(`[data-act="theme"][data-val="${t}"]`);
    check(`theme ${t} applied`, (await page.evaluate(() => document.body.getAttribute('data-theme'))) === t);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`theme ${t}: no horizontal page overflow at 390px`, over <= 1, `(overflow ${over}px)`);
    await page.screenshot({ path: `${shots}/${t}-mobile-full.png`, fullPage: true });
  }
  await page.click('[data-act="theme"][data-val="ledger"]');
  for (const m of ['hybrid', 'metrics', 'ratings']) {
    await page.click(`[data-act="mode"][data-val="${m}"]`);
    const s = await snap();
    check(`mode ${m} selected and scores finite`, s.mode === m && s.ranks.every(r => Number.isFinite(r.overall) && r.overall >= 0 && r.overall <= 100));
  }
  await page.click('[data-act="mode"][data-val="hybrid"]');
  await page.click('[data-act="scale"][data-val="relative"]');
  check('relative scale: cheapest option shows profit 100', (await page.locator('#res-main .card').filter({ hasText: 'Keep Lexus LX 470' }).locator('.prow').nth(2).locator('.pval').innerText()) === '100');
  await page.click('[data-act="scale"][data-val="anchored"]');
  check('anchored scale: keep profit = 50', (await page.locator('#res-main .card').filter({ hasText: 'Keep Lexus LX 470' }).locator('.prow').nth(2).locator('.pval').innerText()) === '50');
  await page.click('[data-act="agg"][data-val="weakest"]');
  check('weakest-link aggregation still ranks', (await snap()).ranks.length === 7);
  await page.click('[data-act="agg"][data-val="average"]');
  await page.click('[data-act="view"][data-val="loan"]');
  check('loan-only view shows 4 cards', (await cards()) === 4);
  await page.click('[data-act="view"][data-val="lease"]');
  check('lease-only view shows 4 cards', (await cards()) === 4);
  await page.click('[data-act="view"][data-val="both"]');
  await page.click('[data-act="preset"][data-val="planet"]');
  const planetTop = (await snap()).ranks.find(r => r.rank === 1);
  await page.click('[data-act="preset"][data-val="wallet"]');
  const walletTop = (await snap()).ranks.find(r => r.rank === 1);
  check('wallet-first winner has a profit score at least as high as the planet-first winner', walletTop.profit >= planetTop.profit - 1e-9, `(${walletTop.id} ${walletTop.profit.toFixed(0)} vs ${planetTop.id} ${planetTop.profit.toFixed(0)})`);
  await page.click('[data-act="preset"][data-val="balanced"]');

  for (const t of ['planet', 'people', 'profit']) {
    await page.click(`[data-act="tab"][data-val="${t}"]`);
    check(`tab ${t} renders a table`, (await page.locator('#res-main table').count()) >= 1);
  }
  await page.click('[data-act="tab"][data-val="people"]');
  const pBefore = await page.locator('.ptable tr.sum td').first().innerText();
  await page.selectOption('select[data-rate="lx"][data-crit="safety"]', '5');
  check('raising the Lexus safety rating raises its People score', Number(await page.locator('.ptable tr.sum td').first().innerText()) > Number(pBefore));
  await page.selectOption('select[data-embodied]', 'full');
  check('strict embodied mode still renders', (await cards()) === 7);

  // links
  const badLinks = await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => !/^https:\/\//.test(a.getAttribute('href') || '')).length);
  check('every link is an https URL', badLinks === 0);
  check('external links use rel=noopener', (await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].filter(a => !/noopener/.test(a.rel)).length)) === 0);
  check('sources list is populated', (await page.locator('#sources li a').count()) >= 60);

  // desktop
  const d = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await d.addInitScript(() => { window.__TBL_QA__ = { scenario: 'legacy' }; });
  const dp = await d.newPage();
  await dp.goto(url, { waitUntil: 'load' });
  check('desktop: scoring options start open', (await dp.evaluate(() => document.getElementById('controls').open)) === true);
  for (const t of ['ledger', 'night', 'field']) {
    await dp.click(`[data-act="theme"][data-val="${t}"]`);
    await dp.screenshot({ path: `${shots}/${t}-desktop.png`, fullPage: true });
  }

  check('no page or console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
