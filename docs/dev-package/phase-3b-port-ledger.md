# Phase 3b port ledger

Every check in the three old-page suites (`qa.cjs` 79, `qa-path.cjs` 43, `qa-analyst.cjs` 33; 155 in all) and where it lives now.
`scripts/qa-ledger.cjs` (part of `npm run qa`) enforces it:
- every old check has exactly one row;
- **ported** rows name a check that exists word for word in a new suite (`suite.cjs: check name`);
- **retired** rows give the reason;
- **pending** is allowed only while the old suite still exists. Phase 3b deletes the old suites, so nothing can stay pending.

| # | Old suite | Old check | Status | New check, or why it is retired |
| --- | --- | --- | --- | --- |
| 1 | qa.cjs | mobile: scoring options start collapsed | ported | qa-answer.cjs: fine-tune: Scoring and appearance starts closed |
| 2 | qa.cjs | assumptions panel is visible without opening anything | ported | qa-answer.cjs: fine-tune: the top drivers are visible as soon as it opens |
| 3 | qa.cjs | assumption inputs are visible (key drivers) | ported | qa-answer.cjs: fine-tune: Key drivers has its inputs (horizon, charging price, discount rate) |
| 4 | qa.cjs | the "please confirm" box is visible with the MyFirstEV switch | ported | qa-answer.cjs: fine-tune: Please confirm starts open with the first-time EV buyer switch |
| 5 | qa.cjs | assumptions sit between the verdict and the detail results | retired | Order of the old single page. The assumptions now live in the Fine-tune panel, opened from the answer (spec; owner decision Q1). |
| 6 | qa.cjs | live scoreboard is present inside the assumptions panel | ported | qa-answer.cjs: fine-tune: the answer behind updates and the change is announced |
| 7 | qa.cjs | car matrix has one column per active car (Lexus + 3 selected) | ported | qa-answer.cjs: fine-tune: one car chip per car you can edit (yours and the 3 compared) |
| 8 | qa.cjs | matrix cell exists for Tesla loan APR | ported | qa-answer.cjs: fine-tune: a compared car shows its loan APR (Tesla) |
| 9 | qa.cjs | page renders 7 option cards by default | ported | qa-answer.cjs: table: lists every option (7 on the Lexus test case) |
| 10 | qa.cjs | ranks are 1..7 and unique | ported | qa-answer.cjs: table: ranks are 1 to 7, each once |
| 11 | qa.cjs | repro: Lexus net cost goes negative with a high resale value | ported | qa-answer.cjs: fine-tune: a high sale value makes keeping cost less than zero |
| 12 | qa.cjs | profit scores still differ across options when the Lexus NPV is negative | ported | qa-answer.cjs: fine-tune: profit scores still differ when keeping costs less than zero |
| 13 | qa.cjs | ...and the Lexus profit score falls when gas gets expensive | ported | qa-answer.cjs: fine-tune: ...and keeping's profit score falls when gas gets expensive |
| 14 | qa.cjs | edited markers appear on the three changed inputs | ported | qa-answer.cjs: fine-tune: edited values are marked "Your number" (3 or more) |
| 15 | qa.cjs | edit counter reports the edits | ported | qa-answer.cjs: fine-tune: the edit count reports the edits |
| 16 | qa.cjs | per-field reset restores the gas price input | ported | qa-answer.cjs: fine-tune: a field's Reset puts the default back and keeps focus on the field |
| 17 | qa.cjs | reset all restores default Lexus NPV | ported | qa-answer.cjs: fine-tune: Reset all puts every default back |
| 18 | qa.cjs | ...and clears the edited markers | ported | qa-answer.cjs: fine-tune: ...and clears every "Your number" mark |
| 19 | qa.cjs | the confirm section starts expanded | ported | qa-answer.cjs: fine-tune: the Please confirm section starts open |
| 20 | qa.cjs | tapping the confirm heading collapses it | ported | qa-answer.cjs: fine-tune: tapping the Please confirm heading closes it |
| 21 | qa.cjs | tapping again expands it | ported | qa-answer.cjs: fine-tune: tapping again opens it |
| 22 | qa.cjs | Collapse all closes every assumption section | ported | qa-answer.cjs: fine-tune: Close all closes every section |
| 23 | qa.cjs | ...but the live scoreboard and header stay visible | ported | qa-answer.cjs: fine-tune: ...but the edit count and its tools stay visible |
| 24 | qa.cjs | Expand all opens every section | ported | qa-answer.cjs: fine-tune: Open all opens every section |
| 25 | qa.cjs | a collapsed section stays collapsed after the page re-renders (picking a car) | ported | qa-answer.cjs: fine-tune: a closed section stays closed when the panel is opened again |
| 26 | qa.cjs | section headers show how many values were edited | ported | qa-answer.cjs: fine-tune: section headings show how many values were edited |
| 27 | qa.cjs | the confirm box stays inside the screen width | ported | qa-answer.cjs: fine-tune: the Please confirm box stays inside the screen width |
| 28 | qa.cjs | default scale is "typical new car" | ported | qa-answer.cjs: fine-tune: the default scale is "a typical new car" |
| 29 | qa.cjs | Lexus Profit score RISES when its running costs fall | ported | qa-answer.cjs: fine-tune: keeping's Profit score rises when its running costs fall |
| 30 | qa.cjs | Lexus Planet score RISES when its fuel economy improves | ported | qa-answer.cjs: fine-tune: keeping's Planet score rises when its fuel economy improves |
| 31 | qa.cjs | the verdict panel has a one-tap shortcut to the table | ported | qa-answer.cjs: table: one tap on "Table" opens it from the answer |
| 32 | qa.cjs | results default to cards | retired | The old page switched between cards and a table. The answer screen always shows its cards (spec: top 3 plus keep); the table is its own panel. |
| 33 | qa.cjs | table view replaces the cards | retired | Same: there is no cards/table switch any more. The Table panel opens over the answer (covered by 'table: one tap on "Table" opens it from the answer'). |
| 34 | qa.cjs | table has one row per option | ported | qa-answer.cjs: table: one row per option |
| 35 | qa.cjs | table has the key columns | ported | qa-answer.cjs: table: has the key columns in plain words |
| 36 | qa.cjs | sorting by net cost puts the cheapest option first | ported | qa-answer.cjs: table: sorting by cost puts the cheapest option first |
| 37 | qa.cjs | clicking again reverses the sort | ported | qa-answer.cjs: table: choosing the column again reverses the sort |
| 38 | qa.cjs | sorting by overall score descending is monotone | ported | qa-answer.cjs: table: sorting by overall score runs highest first |
| 39 | qa.cjs | copy button gives feedback (copied, or a clear message if the browser blocks it) | ported | qa-answer.cjs: table: Copy gives feedback (copied, or a clear message if the browser blocks it) |
| 40 | qa.cjs | table view causes no page-level horizontal overflow | ported | qa-answer.cjs: table: no horizontal page overflow |
| 41 | qa.cjs | switching back restores the cards | retired | No cards/table switch any more; closing the Table panel returns to the answer (covered by 'table: Escape closes it and focus returns to "Table"'). |
| 42 | qa.cjs | picker lists electric, hybrid and gas groups | ported | qa-steps.cjs: Step 3 lists electric, hybrid and gas cars in groups |
| 43 | qa.cjs | selecting a hybrid and a gas car adds their options (rav4h loan+lease, corolla loan) | ported | qa-steps.cjs: the default answer: Keep your gas sedan plus Bolt, Camry Hybrid and Corolla |
| 44 | qa.cjs | the matrix gained columns for the new cars | ported | qa-answer.cjs: fine-tune: one car chip per car you can edit (yours and the 3 compared) |
| 45 | qa.cjs | a gas-only car has no lease option | ported | qa-steps.cjs: the default answer: Keep your gas sedan plus Bolt, Camry Hybrid and Corolla |
| 46 | qa.cjs | deselecting a car removes its options | ported | qa-steps.cjs: unticking a car takes its options out of the answer |
| 47 | qa.cjs | selection is capped at 4 cars | ported | qa-steps.cjs: at 4 cars the other boxes and "+ Add my own car" are disabled with the reason |
| 48 | qa.cjs | a notice explains the cap | ported | qa-steps.cjs: at 4 cars the status line states the limit |
| 49 | qa.cjs | card list collapses to top 8 with a Show-all button | retired | The answer shows the top 3 plus keep by design (spec); every option is in the Table panel (covered by 'table: lists every option (7 on the Lexus test case)'). |
| 50 | qa.cjs | Show all reveals every option | ported | qa-answer.cjs: table: lists every option (7 on the Lexus test case) |
| 51 | qa.cjs | clear selection leaves only the Lexus | ported | qa-steps.cjs: with no cars, Show my answer and Skip are disabled with the reason |
| 52 | qa.cjs | adding a custom hybrid selects it and offers a loan option | ported | qa-steps.cjs: Enter adds the car, checks it and focuses it |
| 53 | qa.cjs | custom car can be renamed | ported | qa-answer.cjs: fine-tune: your car can be renamed and the cards use the name |
| 54 | qa.cjs | lease terms can be added to a custom car | ported | qa-answer.cjs: fine-tune: a lease can be added to a car without one |
| 55 | qa.cjs | a custom car can be removed | ported | qa-steps.cjs: Remove takes it out and moves focus to "+ Add my own car" |
| 56 | qa.cjs | turning off MyFirstEV raises the Bolt net cost by about $3,500 | ported | qa-answer.cjs: fine-tune: turning off MyFirstEV raises the Bolt net cost by about $3,500 |
| 57 | qa.cjs | Tesla is unaffected by MyFirstEV (funding closed) | ported | qa-answer.cjs: fine-tune: Tesla is unaffected by MyFirstEV (funding closed) |
| 58 | qa.cjs | turning off the loan-interest deduction raises the Tesla loan cost | ported | qa-answer.cjs: fine-tune: turning off the loan-interest deduction raises the Tesla loan cost |
| 59 | qa.cjs | ...but not the Tesla lease (leases do not qualify) | ported | qa-answer.cjs: fine-tune: ...but not the Tesla lease (leases do not qualify) |
| 60 | qa.cjs | income above the phase-out removes the deduction | ported | qa-answer.cjs: fine-tune: income above the phase-out removes the deduction |
| 61 | qa.cjs | Clean Cars 4 All changes the replacement scores (scrapping removes the sold Lexus emissions) | ported | qa-answer.cjs: fine-tune: Clean Cars 4 All changes the replacement scores (scrapping ends the sold car's emissions) |
| 62 | qa.cjs | upstream gasoline input affects emissions only (NPV unchanged) | ported | qa-answer.cjs: fine-tune: upstream gasoline input affects emissions only (cost unchanged) |
| 63 | qa.cjs | theme ${t} applied | ported | qa-answer.cjs: fine-tune: theme ${t} applied |
| 64 | qa.cjs | theme ${t}: no horizontal page overflow at 390px | ported | qa-answer.cjs: fine-tune: theme ${t}: no horizontal page overflow at 390px |
| 65 | qa.cjs | mode ${m} selected and scores finite | ported | qa-answer.cjs: fine-tune: mode ${m} selected and scores finite |
| 66 | qa.cjs | relative scale: cheapest option shows profit 100 | ported | qa-answer.cjs: fine-tune: relative scale: the cheapest option scores Profit 100 |
| 67 | qa.cjs | anchored scale: keep profit = 50 | ported | qa-answer.cjs: fine-tune: anchored scale: keeping scores Profit 50 |
| 68 | qa.cjs | weakest-link aggregation still ranks | ported | qa-answer.cjs: fine-tune: weakest-link combining still ranks |
| 69 | qa.cjs | loan-only view shows 4 cards | ported | qa-answer.cjs: fine-tune: loans only shows 4 options |
| 70 | qa.cjs | lease-only view shows 4 cards | ported | qa-answer.cjs: fine-tune: leases only shows 4 options |
| 71 | qa.cjs | wallet-first winner has a profit score at least as high as the planet-first winner | ported | qa-answer.cjs: fine-tune: wallet-first winner has a profit score at least as high as the planet-first winner |
| 72 | qa.cjs | tab ${t} renders a table | ported | qa-answer.cjs: why: tab ${t} renders a table |
| 73 | qa.cjs | raising the Lexus safety rating raises its People score | ported | qa-answer.cjs: why: raising a safety rating raises that car's People score |
| 74 | qa.cjs | strict embodied mode still renders | ported | qa-answer.cjs: fine-tune: counting all the factory carbon still ranks every option |
| 75 | qa.cjs | every link is an https URL | ported | qa-answer.cjs: why: every source link is an https URL |
| 76 | qa.cjs | external links use rel=noopener | ported | qa-answer.cjs: why: source links open a new tab with rel=noopener |
| 77 | qa.cjs | sources list is populated | ported | qa-answer.cjs: why: the sources list is populated |
| 78 | qa.cjs | desktop: scoring options start open | retired | One behavior at every width now: Scoring and appearance starts closed (mockup 3a, covered by 'fine-tune: Scoring and appearance starts closed'); on desktop the panel opens beside the answer (decision D2). |
| 79 | qa.cjs | no page or console errors | ported | qa-answer.cjs: fine-tune: no console errors |
| 80 | qa-path.cjs | path panel sits between analyst and design bar | retired | Order of the old single page. The path is now Step 1 of the guided steps (covered by 'fresh load shows Step 1'). |
| 81 | qa-path.cjs | default path is sell-then-buy | ported | qa-steps.cjs: Skip from Step 1 (no path chosen) shows the answer with the sell assumption stated |
| 82 | qa-path.cjs | Keep option present by default | ported | qa-answer.cjs: three cards: keep, Bolt (loan), Camry Hybrid (loan) |
| 83 | qa-path.cjs | trade-in costs more than selling (15% below value) | ported | qa-answer.cjs: paths: trade-in costs more than selling (15% below value) |
| 84 | qa-path.cjs | trade-in discount input appears in Key drivers | ported | qa-answer.cjs: trade path: Fine-tune shows the trade-in offer and the discount |
| 85 | qa-path.cjs | blurb says California gives no tax credit | ported | qa-answer.cjs: trade path: Fine-tune says a trade-in saves no sales tax in California |
| 86 | qa-path.cjs | 0% discount trade-in equals selling | ported | qa-answer.cjs: paths: a 0% trade-in discount costs the same as selling |
| 87 | qa-path.cjs | bigger discount costs more | ported | qa-answer.cjs: paths: a bigger trade-in discount costs more |
| 88 | qa-path.cjs | just buy removes the Keep option | ported | qa-answer.cjs: just buy: no keep card and no "What would change this" |
| 89 | qa-path.cjs | just buy: no trade-in discount row, no leakage row | ported | qa-answer.cjs: just buy: Fine-tune has no trade-in discount, sale value or sold-car emissions |
| 90 | qa-path.cjs | just buy: current-car presets hidden | ported | qa-steps.cjs: Just buy: Step 2 is "Your driving" with miles only |
| 91 | qa-path.cjs | just buy: no sale proceeds, so Bolt costs more | ported | qa-answer.cjs: just buy: no sale money, so the Bolt costs more |
| 92 | qa-path.cjs | just buy: verdict explains no keep option | ported | qa-answer.cjs: just buy: the verdict names the top option without a current car |
| 93 | qa-path.cjs | just buy: live bar has no Keep cost | ported | qa-answer.cjs: just buy: no keep card and no "What would change this" |
| 94 | qa-path.cjs | table renders without Keep row | ported | qa-answer.cjs: just buy: the table has no keep row |
| 95 | qa-path.cjs | scales all work without Keep (no errors yet) | ported | qa-answer.cjs: just buy: every scale still scores (no keep to compare with) |
| 96 | qa-path.cjs | cars matrix has no owned column in just-buy mode | ported | qa-answer.cjs: just buy: Fine-tune offers no car of yours |
| 97 | qa-path.cjs | back to sell restores Keep | ported | qa-answer.cjs: paths: going back to Sell brings back the keep option |
| 98 | qa-path.cjs | sedan preset changes the current car value and mpg | ported | qa-steps.cjs: choosing a preset sets its value and mpg |
| 99 | qa-path.cjs | preset is not flagged as edited | ported | qa-steps.cjs: sedan value is marked Placeholder |
| 100 | qa-path.cjs | Keep card renamed from the preset | ported | qa-steps.cjs: the keep card takes its name from the preset |
| 101 | qa-path.cjs | rename updates cards | ported | qa-answer.cjs: fine-tune: your car can be renamed and the cards use the name |
| 102 | qa-path.cjs | hybrid preset renders with a Keep option | ported | qa-steps.cjs: the hybrid preset still has a keep option |
| 103 | qa-path.cjs | Lexus preset restores sourced notes | ported | qa-steps.cjs: Lexus example: the value shows Source with an https link |
| 104 | qa-path.cjs | prompt carries path, current car, selected cars | ported | qa-ai.cjs: analyst (path): the prompt carries the path, your car and the compared cars |
| 105 | qa-path.cjs | prompt lists current-car input ids | ported | qa-ai.cjs: analyst (path): the prompt lists your car's input ids |
| 106 | qa-path.cjs | prompt includes trade-in what-if | ported | qa-ai.cjs: analyst (path): the prompt includes the trade-in what-if |
| 107 | qa-path.cjs | invalid new car (no price) dropped; only 1 new car button | ported | qa-ai.cjs: analyst (path): a new car without a price is dropped (1 offered) |
| 108 | qa-path.cjs | owned car cannot be removed; only tesla offered | ported | qa-ai.cjs: analyst (path): your own car is never offered for removal (only Tesla) |
| 109 | qa-path.cjs | analyst name applied | ported | qa-ai.cjs: analyst (path): the suggested name is used on the keep card |
| 110 | qa-path.cjs | analyst set current car value and mpg | ported | qa-ai.cjs: analyst (path): your car's value and mpg are set |
| 111 | qa-path.cjs | new car added and selected with the given price and mpg | ported | qa-ai.cjs: analyst (path): the new car is added and chosen with the price and mpg given |
| 112 | qa-path.cjs | new car inputs match what the person said | ported | qa-ai.cjs: analyst (path): the new car is added and chosen with the price and mpg given |
| 113 | qa-path.cjs | new car is not flagged edited | ported | qa-ai.cjs: analyst (path): the new car's numbers are not marked as edited |
| 114 | qa-path.cjs | tesla removed from comparison | ported | qa-ai.cjs: analyst (path): Tesla is removed from the comparison |
| 115 | qa-path.cjs | analyst set path to trade-in | ported | qa-ai.cjs: analyst (path): the suggested path (trade-in) is applied |
| 116 | qa-path.cjs | path sync: trade-in discount row present | ported | qa-ai.cjs: analyst (path): after the path changes, Fine-tune shows the trade-in discount |
| 117 | qa-path.cjs | Not sure focuses the analyst box | ported | qa-ai.cjs: focus goes to the text box |
| 118 | qa-path.cjs | reset returns to sell path | retired | Deliberate change: the path is chosen on Step 1, so Reset all in Fine-tune now keeps it (covered by 'fine-tune: Reset all keeps the path you chose'). Change the path with Edit. |
| 119 | qa-path.cjs | no console errors | ported | qa-answer.cjs: paths: no console errors |
| 120 | qa-path.cjs | mobile: no horizontal overflow | ported | qa-answer.cjs: ${label}: no horizontal overflow |
| 121 | qa-path.cjs | mobile: no overflow in just-buy mode | ported | qa-answer.cjs: ${label}: no horizontal overflow |
| 122 | qa-path.cjs | without analyst: path chips work | ported | qa-ai.cjs: no AI: Step 1 still shows the three choices |
| 123 | qa-analyst.cjs | panel visible when sample available | ported | qa-ai.cjs: answer screen offers "Ask the analyst" |
| 124 | qa-analyst.cjs | panel is above the design bar | retired | Order of the old single page. The analyst now opens in its own panel from Step 1 and the answer (owner reversed P8; covered by 'Step 1: the option sits after the three choices, outside their group'). |
| 125 | qa-analyst.cjs | empty analyze asks for input, no call | ported | qa-ai.cjs: analyst: Analyze with an empty box asks for a description and calls nothing |
| 126 | qa-analyst.cjs | example fills textarea | ported | qa-ai.cjs: analyst: an example fills the text box |
| 127 | qa-analyst.cjs | shows thinking + disables buttons | ported | qa-ai.cjs: analyst: shows Thinking and disables the buttons while it works |
| 128 | qa-analyst.cjs | call used cache:false | ported | qa-ai.cjs: analyst: every call asks afresh (cache off) |
| 129 | qa-analyst.cjs | prompt has scenario, field ids, results | ported | qa-ai.cjs: analyst: the prompt carries the situation, the field ids and the results |
| 130 | qa-analyst.cjs | summary rendered as text, not HTML | ported | qa-ai.cjs: AI text is shown as text, not HTML |
| 131 | qa-analyst.cjs | only 2 valid input suggestions (unknown dropped) | ported | qa-ai.cjs: analyst: only valid suggestions are offered (2; the unknown field is dropped) |
| 132 | qa-analyst.cjs | lx owned car not offered | ported | qa-ai.cjs: analyst: your own car is never offered as a car to add |
| 133 | qa-analyst.cjs | out-of-range value clamped on apply | ported | qa-ai.cjs: analyst: an out-of-range suggestion is clamped when applied |
| 134 | qa-analyst.cjs | edited marker set | ported | qa-ai.cjs: analyst: an applied value is marked "Your number" in Fine-tune |
| 135 | qa-analyst.cjs | results changed after apply | ported | qa-ai.cjs: analyst: applying changes the results |
| 136 | qa-analyst.cjs | Apply replaced by Applied | ported | qa-ai.cjs: analyst: Apply turns into "Applied" |
| 137 | qa-analyst.cjs | question Set updates miles | ported | qa-ai.cjs: analyst: a question's Set updates the value (miles) |
| 138 | qa-analyst.cjs | elec price applied | ported | qa-ai.cjs: analyst: the other suggestion applies too (charging price) |
| 139 | qa-analyst.cjs | add car selects rav4h | ported | qa-ai.cjs: analyst: adding a suggested car puts it in the comparison |
| 140 | qa-analyst.cjs | answer persists after refreshAll | ported | qa-ai.cjs: analyst: the answer stays after the screen behind is redrawn |
| 141 | qa-analyst.cjs | settings applied (mode metrics) | ported | qa-ai.cjs: analyst: suggested scoring settings apply (Numbers only) |
| 142 | qa-analyst.cjs | preset planet applied | ported | qa-ai.cjs: analyst: ...and the Planet-first weighting |
| 143 | qa-analyst.cjs | second prompt carries history + explain task | ported | qa-ai.cjs: analyst: a second question carries the first and the explain task |
| 144 | qa-analyst.cjs | textarea text preserved across renders | ported | qa-ai.cjs: typed text is kept after closing and reopening |
| 145 | qa-analyst.cjs | no console errors (normal flow) | ported | qa-ai.cjs: analyst: no console errors |
| 146 | qa-analyst.cjs | mobile: no horizontal overflow | ported | qa-ai.cjs: ${label}: no horizontal overflow |
| 147 | qa-analyst.cjs | mobile: no console errors | ported | qa-ai.cjs: ${tag}: no console errors |
| 148 | qa-analyst.cjs | ${code}: friendly message | ported | qa-ai.cjs: analyst ${code}: friendly message |
| 149 | qa-analyst.cjs | ${code}: buttons re-enabled | ported | qa-ai.cjs: analyst ${code}: buttons re-enabled |
| 150 | qa-analyst.cjs | not_granted hides panel | ported | qa-ai.cjs: not_granted: Step 1 drops the analyst option |
| 151 | qa-analyst.cjs | garbage answer -> unusable message | ported | qa-ai.cjs: analyst: an answer with nothing usable says so |
| 152 | qa-analyst.cjs | Stop button visible while busy | ported | qa-ai.cjs: Stop shows while thinking |
| 153 | qa-analyst.cjs | Stop aborts cleanly | ported | qa-ai.cjs: analyst: Stop ends the call cleanly and frees the buttons |
| 154 | qa-analyst.cjs | sample null hides panel | ported | qa-ai.cjs: sample unavailable: no analyst option anywhere, and the answer still works |
| 155 | qa-analyst.cjs | no window.claude hides panel, rest of page works | ported | qa-ai.cjs: no AI: the answer screen has no "Ask the analyst" |
