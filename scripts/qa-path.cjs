const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
let failures = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!ok) failures++; };

const ANSWER = {
  summary: 'Trade-in vs selling: selling nets more.',
  currentCarName: '2014 Subaru Outback',
  suggestions: [{ field: 'lx..price', value: 9000, reason: 'You said about $9,000' }, { field: 'lx..mpg', value: 26, reason: 'You said 26 mpg' }],
  newCars: [{ name: 'Mazda CX-50 Hybrid', kind: 'hybrid', price: 38000, efficiency: 38, reason: 'You asked about it' }, { name: 'Bad', kind: 'ev', efficiency: 30 }],
  removeCars: [{ id: 'tesla', reason: 'Not interested' }, { id: 'lx', reason: 'owned' }],
  settings: { path: 'trade', reason: 'You mentioned a dealer' }
};
const MOCK = `window.__prompts=[];window.claude={use:async()=>({json:async(p)=>{window.__prompts.push(p);return ${JSON.stringify(ANSWER)}}})};`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(MOCK);
  await page.goto(url);
  await page.waitForTimeout(300);
  const snap = () => page.evaluate(() => window.__tbl.snapshot());
  const ids = async () => (await snap()).ranks.map((r) => r.id);
  const bolt = async () => (await snap()).ranks.find((r) => r.id === 'bolt-loan');
  const order = await page.evaluate(() => [...document.querySelectorAll('main > section, main > details, main > div')].map((e) => e.id));
  check('path panel sits between analyst and design bar', order.indexOf('analyst') < order.indexOf('path') && order.indexOf('path') < order.indexOf('designbar'), order.join(','));

  // default = sell
  check('default path is sell-then-buy', await page.locator('[data-act="path"][data-val="sell"].on').count() === 1);
  check('Keep option present by default', (await ids()).includes('keep'));
  const sellNpv = (await bolt()).npv;

  // trade-in
  await page.click('[data-act="path"][data-val="trade"]');
  check('trade-in costs more than selling (15% below value)', (await bolt()).npv > sellNpv, `${sellNpv.toFixed(0)} -> ${(await bolt()).npv.toFixed(0)}`);
  check('trade-in discount input appears in Key drivers', await page.locator('#in-g\\.\\.tradeInDiscount').count() === 1);
  check('blurb says California gives no tax credit', (await page.textContent('#path-blurb')).includes('saves no tax'));
  await page.fill('#in-g\\.\\.tradeInDiscount', '0');
  check('0% discount trade-in equals selling', Math.abs((await bolt()).npv - sellNpv) < 0.5);
  await page.fill('#in-g\\.\\.tradeInDiscount', '30');
  const d30 = (await bolt()).npv;
  check('bigger discount costs more', d30 > sellNpv + 100);

  // just buy
  await page.click('[data-act="path"][data-val="none"]');
  check('just buy removes the Keep option', !(await ids()).includes('keep'));
  check('just buy: no trade-in discount row, no leakage row', (await page.locator('#in-g\\.\\.tradeInDiscount').count()) === 0 && (await page.locator('#in-g\\.\\.lxLeakage').count()) === 0);
  check('just buy: current-car presets hidden', (await page.locator('[data-act="carpreset"]').count()) === 0);
  check('just buy: no sale proceeds, so Bolt costs more', (await bolt()).npv > sellNpv);
  check('just buy: verdict explains no keep option', (await page.textContent('#res-verdict')).includes('no keep-your-car option'));
  check('just buy: live bar has no Keep cost', !(await page.textContent('#livebar')).includes('Keep:'));
  // all views still render with no keep
  for (const t of ['planet', 'people', 'profit']) { await page.click(`[data-act="tab"][data-val="${t}"]`); }
  await page.click('[data-act="resview"][data-val="table"]');
  check('table renders without Keep row', (await page.locator('table.results tbody tr').count()) > 0 && !(await page.textContent('table.results')).includes('Keep Lexus'));
  await page.click('[data-act="resview"][data-val="cards"]');
  for (const sc of ['anchored', 'relative', 'benchmark']) {
    await page.click('#controls summary').catch(() => {});
    await page.evaluate((v) => document.querySelector(`[data-act="scale"][data-val="${v}"]`).click(), sc);
  }
  check('scales all work without Keep (no errors yet)', errors.length === 0, errors.join('|'));
  check('cars matrix has no owned column in just-buy mode', !(await page.textContent('.matrix')).includes('· yours'));

  // back to sell; preset change
  await page.click('[data-act="path"][data-val="sell"]');
  check('back to sell restores Keep', (await ids()).includes('keep'));
  const lexusPrice = await page.inputValue('#in-lx\\.\\.price');
  await page.click('[data-act="carpreset"][data-val="sedan"]');
  check('sedan preset changes the current car value and mpg', (await page.inputValue('#in-lx\\.\\.price')) === '9000' && (await page.inputValue('#in-lx\\.\\.mpg')) === '28' && lexusPrice === '7000');
  check('preset is not flagged as edited', (await page.locator('[data-wrap="lx..price"].is-edited').count()) === 0);
  check('Keep card renamed from the preset', (await page.locator('#res-main .card h3', { hasText: 'Keep My gas sedan' }).count()) === 1);
  await page.fill('#in-carname', 'My 2012 Civic');
  check('rename updates cards', (await page.locator('#res-main .card h3', { hasText: 'Keep My 2012 Civic' }).count()) === 1);
  await page.click('[data-act="carpreset"][data-val="hybrid"]');
  check('hybrid preset renders with a Keep option', (await ids()).includes('keep'));
  await page.click('[data-act="carpreset"][data-val="lexus"]');
  check('Lexus preset restores sourced notes', (await page.inputValue('#in-lx\\.\\.price')) === '7000');

  // analyst: applies path, name, suggestions, new/remove cars
  await page.fill('#an-text', 'I drive a 2014 Subaru Outback worth $9,000 at 26 mpg and want to trade it for a Mazda CX-50 hybrid at $38,000.');
  await page.click('[data-act="an-analyze"]');
  await page.waitForSelector('.an-summary');
  const prompt = await page.evaluate(() => window.__prompts[0]);
  check('prompt carries path, current car, selected cars', prompt.includes('"path":"sell"') && prompt.includes('THE CAR THEY HAVE NOW: {"name":"Lexus LX 470"') && prompt.includes('Tesla Model Y'));
  check('prompt lists current-car input ids', prompt.includes('lx..price') && prompt.includes('lx..mpg'));
  check('prompt includes trade-in what-if', prompt.includes('Trade in at a dealer instead'));
  check('invalid new car (no price) dropped; only 1 new car button', (await page.locator('[data-act="an-newcar"]').count()) === 1);
  check('owned car cannot be removed; only tesla offered', (await page.locator('[data-act="an-removecar"]').count()) === 1);
  await page.click('[data-act="an-carname"]');
  check('analyst name applied', (await page.locator('#res-main .card h3', { hasText: 'Keep 2014 Subaru Outback' }).count()) === 1);
  await page.click('[data-act="an-apply"]');
  await page.click('[data-act="an-apply"]');
  check('analyst set current car value and mpg', (await page.inputValue('#in-lx\\.\\.price')) === '9000' && (await page.inputValue('#in-lx\\.\\.mpg')) === '26');
  await page.click('[data-act="an-newcar"]');
  check('new car added and selected with the given price and mpg', await page.evaluate(() => {
    const s = window.__tbl.snapshot();
    return s.selected.some((id) => id.startsWith('custom'));
  }) && (await page.locator('.pwrap', { hasText: 'Mazda CX-50 Hybrid' }).count()) === 1);
  const customId = (await snap()).selected.find((id) => id.startsWith('custom'));
  check('new car inputs match what the person said', (await page.inputValue(`#in-${customId}\\.\\.price`)) === '38000' && (await page.inputValue(`#in-${customId}\\.\\.mpg`)) === '38');
  check('new car is not flagged edited', (await page.locator(`[data-wrap="${customId}..price"].is-edited`).count()) === 0);
  await page.click('[data-act="an-removecar"]');
  check('tesla removed from comparison', !(await snap()).selected.includes('tesla'));
  await page.click('[data-act="an-settings"]');
  check('analyst set path to trade-in', await page.locator('[data-act="path"][data-val="trade"].on').count() === 1);
  check('path sync: trade-in discount row present', await page.locator('#in-g\\.\\.tradeInDiscount').count() === 1);

  // not sure -> focuses analyst
  await page.click('[data-act="askanalyst"]');
  check('Not sure focuses the analyst box', await page.evaluate(() => document.activeElement && document.activeElement.id === 'an-text'));

  // reset
  await page.click('button[data-act="reset"]');
  check('reset returns to sell path', await page.locator('[data-act="path"][data-val="sell"].on').count() === 1);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: path.resolve(__dirname, '../qa-shots/path-desktop.png') });
  await ctx.close();

  // mobile layout
  const m = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const mp = await m.newPage();
  await mp.addInitScript(MOCK);
  await mp.goto(url);
  await mp.waitForTimeout(300);
  check('mobile: no horizontal overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
  await mp.locator('#path').screenshot({ path: path.resolve(__dirname, '../qa-shots/path-mobile.png') });
  await mp.click('[data-act="path"][data-val="none"]');
  check('mobile: no overflow in just-buy mode', (await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
  await m.close();

  // no analyst available: path still works, no "Not sure" chip
  const n = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const np = await n.newPage();
  await np.goto(url);
  await np.waitForTimeout(300);
  check('without analyst: path chips work', await np.locator('[data-act="path"]').count() === 3 && (await np.locator('[data-act="askanalyst"]').count()) === 0);
  await n.close();

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
