/**
 * Browser suite for "Ask the analyst" on the new screens (owner reversed P8): the Step 1 option
 * "Not sure? Describe it in a sentence" and the answer screen's "Ask the analyst" button, both opening the
 * analyst in a bottom sheet. The AI is stubbed with window.claude.use (as in qa-analyst.cjs); nothing real is called.
 * Checks: hidden without the AI, appears once the AI check resolves without stealing focus, sheet focus and Escape,
 * suggestions apply only on a tap and update the screen behind, "See my answer", the old page still gets the panel,
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

async function open(browser, { width = 390, theme = null, hash = '', mock = AI_MOCK } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
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
    check('the old page panel was emptied while the sheet holds the analyst', await page.evaluate(() => document.getElementById('analyst').innerHTML === ''));
    check('Stop is hidden while idle', !(await page.locator('#ai [data-act="an-stop"]').isVisible()));
    await audit(page, '#ai', 'analyst sheet, empty (390, Ledger)');

    await page.fill('#an-text', 'I commute 40 miles a day and the dealer offered $9,000.');
    await page.keyboard.press('Escape');
    check('Escape closes the sheet and returns focus to the option', !(await page.locator('#ai').isVisible()) && (await page.evaluate(() => document.activeElement?.id === 'st-ai')));
    await page.click('#st-ai');
    check('typed text is kept after closing and reopening', (await page.inputValue('#an-text')).includes('40 miles'));

    await page.click('#ai [data-act="an-analyze"]');
    check('Stop shows while thinking', await page.locator('#ai [data-act="an-stop"]').isVisible());
    await page.waitForSelector('#ai .an-summary');
    check('one AI call, carrying the typed text', await page.evaluate(() => window.__prompts.length === 1 && window.__prompts[0].includes('40 miles')));
    check('AI text is shown as text, not HTML', (await page.locator('#ai .an-summary b').innerText()).includes('<b>hybrid</b>'));
    check('nothing changed before a tap', await page.evaluate(() => window.__tbl.snapshot().selected.join() === 'bolt,camryh,corolla'));
    await audit(page, '#ai', 'analyst sheet with an answer (390, Ledger)');

    await page.click('#ai [data-act="an-settings"]');
    const pressed = await page.evaluate(() => document.querySelector('#steps [aria-pressed="true"]')?.dataset.val);
    check('applying the suggested path updates Step 1 behind the sheet', pressed === 'trade', `pressed=${pressed}`);
    await page.click('#ai [data-act="an-apply"][data-val="0"]');
    await page.click('#ai [data-act="an-addcar"][data-val="rav4h"]');
    check('applied items show as done', (await page.locator('#ai .an-done').count()) === 3);
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
    check('reopened from the answer: the last answer and its applied marks are kept', (await page.locator('#ai .an-done').count()) === 3);
    check('reopened from the answer: the way out reads "Back to my answer"', (await page.textContent('#ai-answer')) === 'Back to my answer');
    await page.click('#ai [data-act="an-apply"][data-val="1"]');
    const after = await page.evaluate(() => document.querySelector('#answer-screen .ds-change')?.textContent ?? '');
    check('applying from the answer updates the answer behind the sheet', after.includes('Today the tool assumes $6.10'), after.slice(0, 160));
    await page.click('#ai-answer');
    check('"Back to my answer" closes the sheet, stays on #answer, focus returns to the button', await page.evaluate(() => location.hash === '#answer' && document.getElementById('ai').closest('[data-sheet]').hidden && document.activeElement?.id === 'ans-ai'));
    check('back to #answer after closing: history did not grow a duplicate answer entry', await page.evaluate(() => history.state?.prev !== 'answer'));

    // ---------- the old page still gets the panel ----------
    await page.evaluate(() => { location.hash = '#details'; });
    await page.waitForFunction(() => !document.querySelector('main:not(#steps):not(#answer-screen)').hidden);
    check('"All the details": the analyst moves back to the old panel', await page.evaluate(() => !!document.querySelector('#analyst #an-text') && document.querySelectorAll('#an-text').length === 1));
    check('"All the details": the last answer is still shown', (await page.locator('#analyst .an-summary').count()) === 1);
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
    await page.waitForSelector('#ai .an-summary');
    check('progress: status clears when the answer is shown', (await page.textContent('#an-status')) === '');
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
    await page.waitForSelector('#ai .an-summary');
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
