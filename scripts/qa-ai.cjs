/**
 * Browser suite for "Ask the analyst" on the new screens (owner reversed P8): the Step 1 option
 * "Not sure? Describe it in a sentence" and the answer screen's "Ask the analyst" button, both opening the
 * analyst in a bottom sheet. The AI is stubbed with window.claude.use (as in qa-analyst.cjs); nothing real is called.
 * Checks: hidden without the AI, appears once the AI check resolves without stealing focus, sheet focus and Escape,
 * suggestions apply only on a tap and update the screen behind, "See my answer", old #details links,
 * and at 390 and 1280 px in Ledger and Night: axe WCAG 2.1 A/AA, 44 px controls, no overflow, no console errors.
 */
const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
const AXE = require.resolve('axe-core/axe.min.js');
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const ANSWER = {
  summary: 'At 14,000 miles a year a <b>hybrid</b> pays off sooner.',
  interpretation: 'You drive more than the example assumes.',
  questions: [],
  suggestions: [
    { field: 'g..milesPerYear', value: 14000, reason: 'You said you commute 40 miles a day' },
    { field: 'g..gasPrice', value: 6.1, reason: 'Recent California average' }
  ],
  addCars: [{ id: 'rav4h', reason: 'Room for the dog' }],
  settings: { path: 'trade', reason: 'You mentioned a dealer offer' },
  explanation: ['Keeping costs least at low mileage.'],
  flipFactors: [],
  caveats: ['Check the trade-in offer in writing']
};
const AI_MOCK = `window.__prompts=[];window.claude={use:async(n)=>n==='sample'?{json:async(p,o)=>{window.__prompts.push(p);await new Promise(r=>setTimeout(r,120));return ${JSON.stringify(ANSWER)}}}:null};`;
const SLOW_AI_MOCK = `window.claude={use:(n)=>new Promise(r=>setTimeout(()=>r(n==='sample'?{json:async()=>(${JSON.stringify(ANSWER)})}:null),400))};`;

async function open(browser, { width = 390, theme = null, hash = '', mock = AI_MOCK, legacy = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  if (legacy) await ctx.addInitScript(() => { window.__TBL_QA__ = { scenario: 'legacy' }; });
  if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem('tbl-theme', t); } catch {} }, theme);
  if (mock) await ctx.addInitScript(mock);
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
    small: [...document.querySelectorAll(`${sel} :is(button, a[href], input, select, textarea, summary)`)]
      .filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
      .map((el) => { const b = el.getBoundingClientRect(); return { w: b.width, h: b.height, d: el.outerHTML.slice(0, 70) }; })
      .filter((b) => b.w < 44 || b.h < 44)
  }), root);
  check(`${label}: no horizontal overflow`, r.overflow <= 0, `overflow=${r.overflow}`);
  const clipped = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const edge = Math.min(root.getBoundingClientRect().right, window.innerWidth) + 1;
    return [...root.querySelectorAll('*')].filter((el) => el.getClientRects().length && !el.closest('.ds-table-wrap') && !el.closest('[hidden]') && el.getBoundingClientRect().right > edge).map((el) => el.outerHTML.slice(0, 60));
  }, root);
  check(`${label}: nothing is cut off at the right edge`, clipped.length === 0, clipped.slice(0, 3).join(' | '));
  check(`${label}: every control is at least 44 x 44 px`, r.small.length === 0, r.small.map((s) => `${Math.round(s.w)}x${Math.round(s.h)} ${s.d}`).join(' | '));
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate((sel) => window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }), root);
  const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`);
  check(`${label}: axe WCAG 2.1 AA violations = 0`, v.length === 0, v.join(' | '));
}

const offerCount = (page) => page.locator('[data-act="ai-open"]').count();

(async () => {
  const browser = await chromium.launch();

  // ---------- no AI: nothing is offered ----------
  {
    const { ctx, page, errors } = await open(browser, { mock: null });
    await page.waitForTimeout(300);
    check('no AI: Step 1 has no analyst option', (await offerCount(page)) === 0);
    check('no AI: Step 1 still shows the three choices', (await page.locator('#steps .ds-option').count()) === 3);
    await page.click('[data-act="st-skip"]');
    check('no AI: the answer screen has no "Ask the analyst"', (await offerCount(page)) === 0 && (await page.locator('#ans-share').count()) === 1);
    check('no AI: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- the AI check resolves late: the option appears without moving focus ----------
  {
    const { ctx, page, errors } = await open(browser, { mock: SLOW_AI_MOCK });
    check('slow AI: option not shown before the check resolves', (await offerCount(page)) === 0);
    await page.focus('[data-act="st-path"][data-val="trade"]');
    await page.waitForSelector('#st-ai');
    check('slow AI: option appears after the check resolves', (await offerCount(page)) === 1);
    check('slow AI: focus stays on the choice the person was on', await page.evaluate(() => document.activeElement?.dataset.val === 'trade'));
    check('slow AI: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- Step 1 -> sheet -> analysis -> apply -> answer ----------
  {
    const { ctx, page, errors } = await open(browser);
    await page.waitForSelector('#st-ai');
    const pos = await page.evaluate(() => {
      const ai = document.getElementById('st-ai');
      const group = document.querySelector('#steps [role="group"]');
      return { outside: !group.contains(ai), after: !!(group.compareDocumentPosition(ai) & 4) };
    });
    check('Step 1: the option sits after the three choices, outside their group', pos.outside && pos.after);
    check('Step 1: three choices plus the analyst option', (await page.locator('#steps .ds-option').count()) === 4);
    check('Step 1: the analyst option is not a toggle and says it opens a dialog', (await page.getAttribute('#st-ai', 'aria-pressed')) === null && (await page.getAttribute('#st-ai', 'aria-haspopup')) === 'dialog');
    await audit(page, '#steps', 'Step 1 with the analyst option (390, Ledger)');

    await page.click('#st-ai');
    check('sheet opens as a labeled modal dialog', await page.locator('#ai[role="dialog"][aria-modal="true"]').isVisible() && (await page.textContent('#ai-title')) === 'Ask the analyst');
    check('focus goes to the text box', await page.evaluate(() => document.activeElement?.id === 'an-text'));
    check('the page behind is inert', await page.evaluate(() => document.getElementById('steps').closest('[inert]') !== null || document.getElementById('steps').inert));
    check('the analyst renders only once (no duplicate ids)', await page.evaluate(() => document.querySelectorAll('#an-text').length === 1 && document.querySelectorAll('#an-out').length === 1));
    check('Stop is hidden while idle', !(await page.locator('#ai [data-act="an-stop"]').isVisible()));
    await audit(page, '#ai', 'analyst sheet, empty (390, Ledger)');

    await page.fill('#an-text', 'I commute 40 miles a day and the dealer offered $9,000.');
    await page.keyboard.press('Escape');
    check('Escape closes the sheet and returns focus to the option', !(await page.locator('#ai').isVisible()) && (await page.evaluate(() => document.activeElement?.id === 'st-ai')));
    await page.click('#st-ai');
    check('typed text is kept after closing and reopening', (await page.inputValue('#an-text')).includes('40 miles'));

    await page.click('#ai [data-act="an-analyze"]');
    check('Stop shows while thinking', await page.locator('#ai [data-act="an-stop"]').isVisible());
    await page.waitForSelector('#ai .ds-an-summary');
    check('one AI call, carrying the typed text', await page.evaluate(() => window.__prompts.length === 1 && window.__prompts[0].includes('40 miles')));
    check('AI text is shown as text, not HTML', (await page.locator('#ai .ds-an-summary b').innerText()).includes('<b>hybrid</b>'));
    check('nothing changed before a tap', await page.evaluate(() => window.__tbl.snapshot().selected.join() === 'bolt,camryh,corolla'));
    await audit(page, '#ai', 'analyst sheet with an answer (390, Ledger)');

    await page.click('#ai [data-act="an-settings"]');
    const pressed = await page.evaluate(() => document.querySelector('#steps [aria-pressed="true"]')?.dataset.val);
    check('applying the suggested path updates Step 1 behind the sheet', pressed === 'trade', `pressed=${pressed}`);
    await page.click('#ai [data-act="an-apply"][data-val="0"]');
    await page.click('#ai [data-act="an-addcar"][data-val="rav4h"]');
    check('applied items show as done', (await page.locator('#ai .ds-an-done').count()) === 3);
    check('the sheet stays open and focus stays in it after Apply', await page.locator('#ai').isVisible() && (await page.evaluate(() => !!document.activeElement?.closest('#ai'))));
    await page.click('#ai-answer');
    check('"See my answer" goes to the answer', await page.evaluate(() => location.hash === '#answer' && !document.getElementById('answer-screen').hidden));
    check('focus goes to the answer heading', await page.evaluate(() => document.activeElement?.id === 'ans-title'));
    const basis = (await page.textContent('#answer-screen .ds-basis')).replace(/\s+Edit$/, '').trim();
    check('the answer uses the applied path and miles', basis.startsWith('Trade in, then buy · 14,000 miles a year'), basis);
    check('the added car is in the comparison', await page.evaluate(() => window.__tbl.snapshot().selected.includes('rav4h')));

    // ---------- the answer screen's "Ask the analyst" ----------
    check('answer screen offers "Ask the analyst"', (await page.locator('#ans-ai').count()) === 1);
    await page.click('#ans-ai');
    check('reopened from the answer: the last answer and its applied marks are kept', (await page.locator('#ai .ds-an-done').count()) === 3);
    check('reopened from the answer: the way out reads "Back to my answer"', (await page.textContent('#ai-answer')) === 'Back to my answer');
    await page.click('#ai [data-act="an-apply"][data-val="1"]');
    const after = await page.evaluate(() => document.querySelector('#answer-screen .ds-change')?.textContent ?? '');
    check('applying from the answer updates the answer behind the sheet', after.includes('Today the tool assumes $6.10'), after.slice(0, 160));
    await page.click('#ai-answer');
    check('"Back to my answer" closes the sheet, stays on #answer, focus returns to the button', await page.evaluate(() => location.hash === '#answer' && document.getElementById('ai').closest('[data-sheet]').hidden && document.activeElement?.id === 'ans-ai'));
    check('back to #answer after closing: history did not grow a duplicate answer entry', await page.evaluate(() => history.state?.prev !== 'answer'));

    // ---------- an old #details link (Phase 3a) now opens the answer; the analyst keeps its session ----------
    await page.evaluate(() => { location.hash = '#details'; });
    await page.waitForFunction(() => location.hash === '#answer' && !document.getElementById('answer-screen').hidden);
    await page.click('#ans-ai');
    check('an old #details link opens the answer; the analyst keeps its last answer', (await page.locator('#ai .ds-an-summary').count()) === 1 && (await page.evaluate(() => document.querySelectorAll('#an-text').length)) === 1);
    await page.keyboard.press('Escape');
    check('flow: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- failures on the live site: plain words plus the code, progress while writing ----------
  {
    const failMock = (code) => `window.claude={use:async(n)=>n==='sample'?{json:async()=>{throw {code:'${code}',message:'dev'}}}:null};`;
    const { ctx, page, errors } = await open(browser, { mock: failMock('invalid_json') });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'I commute 10 miles a week.');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForFunction(() => /code:/.test(document.getElementById('an-status').textContent));
    const st = await page.textContent('#an-status');
    check('invalid_json: says the answer could not be read, and names the code', st.includes('could not read') && st.includes('(code: invalid_json)'), st);
    check('invalid_json: the typed text is not in the message', !st.includes('10 miles'));
    check('invalid_json: buttons are usable again', !(await page.locator('#ai [data-act="an-analyze"]').isDisabled()));
    check('invalid_json: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { mock: `window.claude={use:async(n)=>n==='sample'?{json:async()=>{throw {code:'not_granted',message:'dev'}}}:null};` });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'x');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-act="ai-open"]').length === 0);
    const note = await page.textContent('#ai-host');
    check('not_granted: the sheet says why the analyst is gone', note.includes('not allowed here') && note.includes('(code: not_granted)'), note);
    check('not_granted: Step 1 drops the analyst option', (await offerCount(page)) === 0);
    await ctx.close();
  }
  {
    const slowMock = `window.claude={use:async(n)=>n==='sample'?{json:async(p,o)=>{await new Promise(r=>setTimeout(r,150));o.onText&&o.onText({text:'{',delta:'{'});await new Promise(r=>setTimeout(r,400));return ${JSON.stringify(ANSWER)}}}:null};`;
    const { ctx, page } = await open(browser, { mock: slowMock });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'x');
    await page.click('#ai [data-act="an-analyze"]');
    check('progress: "Thinking" first, saying it can take a minute', (await page.textContent('#an-status')).includes('up to a minute'));
    await page.waitForFunction(() => document.getElementById('an-status').textContent.includes('Writing'));
    check('progress: "Writing the answer" once text starts', true);
    await page.waitForSelector('#ai .ds-an-summary');
    check('progress: status clears when the answer is shown', (await page.textContent('#an-status')) === '');
    await ctx.close();
  }

  // ---------- the analyst's answer, ported from the old page's suite (qa-analyst.cjs) on the same Lexus test case ----------
  {
    const OLD_ANSWER = {
      summary: 'Keeping the Lexus is cheapest at your mileage, but <b>EVs</b> win on carbon.',
      interpretation: 'Solar at home makes charging cheaper.',
      questions: [{ question: 'How many miles do you drive?', why: 'Drives fuel savings', field: 'g..milesPerYear', value: 14000 }, { question: 'Anything else?', why: 'x', field: 'bogus', value: 1 }],
      suggestions: [{ field: 'g..gasPrice', value: 99, reason: 'Out of range on purpose' }, { field: 'g..elecPrice', value: 0.12, reason: 'Solar at home' }, { field: 'evil..x', value: 1, reason: 'unknown field' }],
      addCars: [{ id: 'rav4h', reason: 'Hybrid fits towing' }, { id: 'lx', reason: 'owned' }],
      settings: { mode: 'metrics', preset: 'planet', reason: 'You said planet matters most' },
      explanation: ['Keep costs less.'],
      flipFactors: [{ factor: 'Gas at $8', effect: 'EV wins' }],
      caveats: ['Confirm tax eligibility']
    };
    const mock = `window.__prompts=[];window.claude={use:async(n)=>n==='sample'?{json:async(p,o)=>{window.__prompts.push({p,o});await new Promise(r=>setTimeout(r,150));return ${JSON.stringify(OLD_ANSWER)}}}:null};`;
    const { ctx, page, errors } = await open(browser, { hash: '#answer', mock, legacy: true });
    const snap = () => page.evaluate(() => window.__tbl.snapshot());
    await page.waitForSelector('#ans-ai');
    await page.click('#ans-ai');
    await page.click('#ai [data-act="an-analyze"]');
    check('analyst: Analyze with an empty box asks for a description and calls nothing', (await page.textContent('#an-status')).includes('Describe') && (await page.evaluate(() => window.__prompts.length)) === 0);
    await page.click('#ai [data-act="an-example"][data-val="0"]');
    check('analyst: an example fills the text box', (await page.inputValue('#an-text')).includes('40 miles'));
    await page.click('#ai [data-act="an-analyze"]');
    check('analyst: shows Thinking and disables the buttons while it works', (await page.textContent('#an-status')).includes('Thinking') && await page.locator('#ai [data-act="an-analyze"]').isDisabled());
    await page.waitForSelector('#ai .ds-an-summary');
    const call = await page.evaluate(() => window.__prompts[0]);
    check('analyst: every call asks afresh (cache off)', call.o.cache === false);
    check('analyst: the prompt carries the situation, the field ids and the results', call.p.includes('40 miles') && call.p.includes('g..gasPrice') && call.p.includes('CURRENT RESULTS'));
    check('analyst: only valid suggestions are offered (2; the unknown field is dropped)', (await page.locator('#ai [data-act="an-apply"]').count()) === 2);
    check('analyst: your own car is never offered as a car to add', (await page.locator('#ai [data-act="an-addcar"]').count()) === 1);
    const before = await snap();
    await page.click('#ai [data-act="an-apply"][data-val="0"]');
    const gas = (await snap()).g.gasPrice;
    check('analyst: an out-of-range suggestion is clamped when applied', gas <= 10 && gas > 5.5, `gas=${gas}`);
    const after = await snap();
    check('analyst: applying changes the results', JSON.stringify(before.ranks) !== JSON.stringify(after.ranks));
    check('analyst: Apply turns into "Applied"', (await page.locator('#ai .ds-an-done', { hasText: 'Applied' }).count()) >= 1);
    await page.fill('#an-q-0', '14000');
    await page.click('#ai [data-act="an-qset"][data-val="0"]');
    check("analyst: a question's Set updates the value (miles)", (await snap()).g.milesPerYear === 14000);
    await page.click('#ai [data-act="an-apply"]');
    check('analyst: the other suggestion applies too (charging price)', (await snap()).g.elecPrice === 0.12);
    const selBefore = (await snap()).selected;
    await page.click('#ai [data-act="an-addcar"]');
    const selAfter = (await snap()).selected;
    check('analyst: adding a suggested car puts it in the comparison', !selBefore.includes('rav4h') && selAfter.includes('rav4h'));
    check('analyst: the answer stays after the screen behind is redrawn', (await page.locator('#ai .ds-an-summary').count()) === 1);
    await page.click('#ai [data-act="an-settings"]');
    const st = await snap();
    check('analyst: suggested scoring settings apply (Numbers only)', st.mode === 'metrics');
    check('analyst: ...and the Planet-first weighting', st.preset === 'planet');
    await page.fill('#an-text', 'What if gas hits $8?');
    await page.click('#ai [data-act="an-explain"]');
    await page.waitForFunction(() => window.__prompts.length === 2);
    const p2 = await page.evaluate(() => window.__prompts[1].p);
    check('analyst: a second question carries the first and the explain task', p2.includes('Earlier question 1') && p2.includes('Explain these results'));
    await page.click('#ai-answer');
    await page.click('#ans-finetune');
    check('analyst: an applied value is marked "Your number" in Fine-tune', (await page.textContent('#ft-gas-status')).includes('Your number'));
    check('analyst: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  // the analyst fills in your car, adds and drops cars and changes the path (ported from qa-path.cjs, same Lexus test case)
  {
    const PATH_ANSWER = {
      summary: 'Trade-in vs selling: selling nets more.',
      currentCarName: '2014 Subaru Outback',
      suggestions: [{ field: 'lx..price', value: 9000, reason: 'You said about $9,000' }, { field: 'lx..mpg', value: 26, reason: 'You said 26 mpg' }],
      newCars: [{ name: 'Mazda CX-50 Hybrid', kind: 'hybrid', price: 38000, efficiency: 38, reason: 'You asked about it' }, { name: 'Bad', kind: 'ev', efficiency: 30 }],
      removeCars: [{ id: 'tesla', reason: 'Not interested' }, { id: 'lx', reason: 'owned' }],
      settings: { path: 'trade', reason: 'You mentioned a dealer' }
    };
    const mock = `window.__prompts=[];window.claude={use:async()=>({json:async(p)=>{window.__prompts.push(p);return ${JSON.stringify(PATH_ANSWER)}}})};`;
    const { ctx, page, errors } = await open(browser, { hash: '#answer', mock, legacy: true });
    const snap = () => page.evaluate(() => window.__tbl.snapshot());
    await page.waitForSelector('#ans-ai');
    await page.click('#ans-ai');
    await page.fill('#an-text', 'I drive a 2014 Subaru Outback worth $9,000 at 26 mpg and want to trade it for a Mazda CX-50 hybrid at $38,000.');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForSelector('#ai .ds-an-summary');
    const prompt = await page.evaluate(() => window.__prompts[0]);
    check('analyst (path): the prompt carries the path, your car and the compared cars', prompt.includes('"path":"sell"') && prompt.includes('THE CAR THEY HAVE NOW: {"name":"Lexus LX 470"') && prompt.includes('Tesla Model Y'));
    check("analyst (path): the prompt lists your car's input ids", prompt.includes('lx..price') && prompt.includes('lx..mpg'));
    check('analyst (path): the prompt includes the trade-in what-if', prompt.includes('Trade in at a dealer instead'));
    check('analyst (path): a new car without a price is dropped (1 offered)', (await page.locator('#ai [data-act="an-newcar"]').count()) === 1);
    check('analyst (path): your own car is never offered for removal (only Tesla)', (await page.locator('#ai [data-act="an-removecar"]').count()) === 1);
    await page.click('#ai [data-act="an-carname"]');
    check('analyst (path): the suggested name is used on the keep card', (await page.textContent('#answer-screen')).includes('Keep your 2014 Subaru Outback'));
    await page.click('#ai [data-act="an-apply"]');
    await page.click('#ai [data-act="an-apply"]');
    const own = (await snap()).cars.find((c) => c.owned);
    check("analyst (path): your car's value and mpg are set", own.price === 9000 && own.mpg === 26, JSON.stringify(own));
    await page.click('#ai [data-act="an-newcar"]');
    const custom = (await snap()).cars.find((c) => c.id.startsWith('custom'));
    check('analyst (path): the new car is added and chosen with the price and mpg given', !!custom && custom.short === 'Mazda CX-50 Hybrid' && custom.price === 38000 && custom.mpg === 38, JSON.stringify(custom));
    await page.click('#ai [data-act="an-removecar"]');
    check('analyst (path): Tesla is removed from the comparison', !(await snap()).selected.includes('tesla'));
    await page.click('#ai [data-act="an-settings"]');
    check('analyst (path): the suggested path (trade-in) is applied', (await snap()).path === 'trade' && (await page.textContent('#answer-screen .ds-basis')).startsWith('Trade in, then buy'));
    await page.click('#ai-answer');
    await page.click('#ans-finetune');
    check('analyst (path): after the path changes, Fine-tune shows the trade-in discount', (await page.locator('#ft-discount').count()) === 1);
    await page.click('#ft-all > summary');
    await page.click(`input[name="ft-car"][value="${custom.id}"]`, { force: true });
    const st = await page.textContent(`#fs-${custom.id}--price`);
    check("analyst (path): the new car's numbers are not marked as edited", !st.includes('Your number'), st);
    check('analyst (path): no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // failures and Stop (old page's suite)
  for (const [code, expect] of [['rate_limited', 'usage limit'], ['boom', 'could not answer']]) {
    const { ctx, page } = await open(browser, { mock: `window.claude={use:async()=>({json:async()=>{const e=new Error('x');e.code='${code}';throw e}})};` });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'test');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForFunction(() => document.getElementById('an-status').textContent.includes('code:'));
    check(`analyst ${code}: friendly message`, (await page.textContent('#an-status')).includes(expect));
    check(`analyst ${code}: buttons re-enabled`, !(await page.locator('#ai [data-act="an-analyze"]').isDisabled()));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { mock: `window.claude={use:async()=>({json:async()=>({junk:true})})};` });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'test');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForFunction(() => document.getElementById('an-status').textContent.length > 12 && !document.getElementById('an-status').textContent.startsWith('Thinking'));
    check('analyst: an answer with nothing usable says so', (await page.textContent('#an-status')).includes('did not return anything usable'));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { mock: `window.claude={use:async()=>({json:(p,o)=>new Promise((_,rej)=>o.signal.addEventListener('abort',()=>rej({code:'cancelled',message:'x'})))})};` });
    await page.waitForSelector('#st-ai');
    await page.click('#st-ai');
    await page.fill('#an-text', 'test');
    await page.click('#ai [data-act="an-analyze"]');
    await page.click('#ai [data-act="an-stop"]');
    await page.waitForFunction(() => document.getElementById('an-status').textContent.includes('Stopped'));
    check('analyst: Stop ends the call cleanly and frees the buttons', !(await page.locator('#ai [data-act="an-analyze"]').isDisabled()) && !(await page.locator('#ai [data-act="an-stop"]').isVisible()));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(browser, { mock: 'window.claude={use:async()=>null};' });
    await page.waitForTimeout(300);
    const steps = await offerCount(page);
    await page.click('[data-act="st-skip"]');
    check('sample unavailable: no analyst option anywhere, and the answer still works', steps === 0 && (await offerCount(page)) === 0 && (await page.textContent('#ans-title')).length > 10);
    check('sample unavailable: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---------- 1280 px and Night ----------
  for (const [width, theme] of [[1280, null], [390, 'night'], [1280, 'night']]) {
    const { ctx, page, errors } = await open(browser, { width, theme });
    const tag = `(${width}, ${theme ?? 'ledger'})`;
    await page.waitForSelector('#st-ai');
    await audit(page, '#steps', `Step 1 with the analyst option ${tag}`);
    await page.click('#st-ai');
    await page.click('#ai [data-act="an-example"][data-val="0"]');
    await page.click('#ai [data-act="an-analyze"]');
    await page.waitForSelector('#ai .ds-an-summary');
    await audit(page, '#ai', `analyst sheet with an answer ${tag}`);
    await page.keyboard.press('Escape');
    await page.click('[data-act="st-skip"]');
    await audit(page, '#answer-screen', `answer screen with "Ask the analyst" ${tag}`);
    check(`${tag}: no console errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll analyst-sheet checks passed');
  process.exit(failures ? 1 : 0);
})();
