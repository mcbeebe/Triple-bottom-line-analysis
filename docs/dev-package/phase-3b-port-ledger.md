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
| 42 | qa.cjs | picker lists electric, hybrid and gas groups | pending | |
| 43 | qa.cjs | selecting a hybrid and a gas car adds their options (rav4h loan+lease, corolla loan) | pending | |
| 44 | qa.cjs | the matrix gained columns for the new cars | pending | |
| 45 | qa.cjs | a gas-only car has no lease option | pending | |
| 46 | qa.cjs | deselecting a car removes its options | pending | |
| 47 | qa.cjs | selection is capped at 4 cars | pending | |
| 48 | qa.cjs | a notice explains the cap | pending | |
| 49 | qa.cjs | card list collapses to top 8 with a Show-all button | retired | The answer shows the top 3 plus keep by design (spec); every option is in the Table panel (covered by 'table: lists every option (7 on the Lexus test case)'). |
| 50 | qa.cjs | Show all reveals every option | ported | qa-answer.cjs: table: lists every option (7 on the Lexus test case) |
| 51 | qa.cjs | clear selection leaves only the Lexus | pending | |
| 52 | qa.cjs | adding a custom hybrid selects it and offers a loan option | pending | |
| 53 | qa.cjs | custom car can be renamed | ported | qa-answer.cjs: fine-tune: your car can be renamed and the cards use the name |
| 54 | qa.cjs | lease terms can be added to a custom car | ported | qa-answer.cjs: fine-tune: a lease can be added to a car without one |
| 55 | qa.cjs | a custom car can be removed | pending | |
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
| 80 | qa-path.cjs | path panel sits between analyst and design bar | pending | |
| 81 | qa-path.cjs | default path is sell-then-buy | pending | |
| 82 | qa-path.cjs | Keep option present by default | pending | |
| 83 | qa-path.cjs | trade-in costs more than selling (15% below value) | pending | |
| 84 | qa-path.cjs | trade-in discount input appears in Key drivers | pending | |
| 85 | qa-path.cjs | blurb says California gives no tax credit | pending | |
| 86 | qa-path.cjs | 0% discount trade-in equals selling | pending | |
| 87 | qa-path.cjs | bigger discount costs more | pending | |
| 88 | qa-path.cjs | just buy removes the Keep option | pending | |
| 89 | qa-path.cjs | just buy: no trade-in discount row, no leakage row | pending | |
| 90 | qa-path.cjs | just buy: current-car presets hidden | pending | |
| 91 | qa-path.cjs | just buy: no sale proceeds, so Bolt costs more | pending | |
| 92 | qa-path.cjs | just buy: verdict explains no keep option | pending | |
| 93 | qa-path.cjs | just buy: live bar has no Keep cost | pending | |
| 94 | qa-path.cjs | table renders without Keep row | pending | |
| 95 | qa-path.cjs | scales all work without Keep (no errors yet) | pending | |
| 96 | qa-path.cjs | cars matrix has no owned column in just-buy mode | pending | |
| 97 | qa-path.cjs | back to sell restores Keep | pending | |
| 98 | qa-path.cjs | sedan preset changes the current car value and mpg | pending | |
| 99 | qa-path.cjs | preset is not flagged as edited | pending | |
| 100 | qa-path.cjs | Keep card renamed from the preset | pending | |
| 101 | qa-path.cjs | rename updates cards | pending | |
| 102 | qa-path.cjs | hybrid preset renders with a Keep option | pending | |
| 103 | qa-path.cjs | Lexus preset restores sourced notes | pending | |
| 104 | qa-path.cjs | prompt carries path, current car, selected cars | pending | |
| 105 | qa-path.cjs | prompt lists current-car input ids | pending | |
| 106 | qa-path.cjs | prompt includes trade-in what-if | pending | |
| 107 | qa-path.cjs | invalid new car (no price) dropped; only 1 new car button | pending | |
| 108 | qa-path.cjs | owned car cannot be removed; only tesla offered | pending | |
| 109 | qa-path.cjs | analyst name applied | pending | |
| 110 | qa-path.cjs | analyst set current car value and mpg | pending | |
| 111 | qa-path.cjs | new car added and selected with the given price and mpg | pending | |
| 112 | qa-path.cjs | new car inputs match what the person said | pending | |
| 113 | qa-path.cjs | new car is not flagged edited | pending | |
| 114 | qa-path.cjs | tesla removed from comparison | pending | |
| 115 | qa-path.cjs | analyst set path to trade-in | pending | |
| 116 | qa-path.cjs | path sync: trade-in discount row present | pending | |
| 117 | qa-path.cjs | Not sure focuses the analyst box | pending | |
| 118 | qa-path.cjs | reset returns to sell path | pending | |
| 119 | qa-path.cjs | no console errors | pending | |
| 120 | qa-path.cjs | mobile: no horizontal overflow | pending | |
| 121 | qa-path.cjs | mobile: no overflow in just-buy mode | pending | |
| 122 | qa-path.cjs | without analyst: path chips work | pending | |
| 123 | qa-analyst.cjs | panel visible when sample available | pending | |
| 124 | qa-analyst.cjs | panel is above the design bar | pending | |
| 125 | qa-analyst.cjs | empty analyze asks for input, no call | pending | |
| 126 | qa-analyst.cjs | example fills textarea | pending | |
| 127 | qa-analyst.cjs | shows thinking + disables buttons | pending | |
| 128 | qa-analyst.cjs | call used cache:false | pending | |
| 129 | qa-analyst.cjs | prompt has scenario, field ids, results | pending | |
| 130 | qa-analyst.cjs | summary rendered as text, not HTML | pending | |
| 131 | qa-analyst.cjs | only 2 valid input suggestions (unknown dropped) | pending | |
| 132 | qa-analyst.cjs | lx owned car not offered | pending | |
| 133 | qa-analyst.cjs | out-of-range value clamped on apply | pending | |
| 134 | qa-analyst.cjs | edited marker set | pending | |
| 135 | qa-analyst.cjs | results changed after apply | pending | |
| 136 | qa-analyst.cjs | Apply replaced by Applied | pending | |
| 137 | qa-analyst.cjs | question Set updates miles | pending | |
| 138 | qa-analyst.cjs | elec price applied | pending | |
| 139 | qa-analyst.cjs | add car selects rav4h | pending | |
| 140 | qa-analyst.cjs | answer persists after refreshAll | pending | |
| 141 | qa-analyst.cjs | settings applied (mode metrics) | pending | |
| 142 | qa-analyst.cjs | preset planet applied | pending | |
| 143 | qa-analyst.cjs | second prompt carries history + explain task | pending | |
| 144 | qa-analyst.cjs | textarea text preserved across renders | pending | |
| 145 | qa-analyst.cjs | no console errors (normal flow) | pending | |
| 146 | qa-analyst.cjs | mobile: no horizontal overflow | pending | |
| 147 | qa-analyst.cjs | mobile: no console errors | pending | |
| 148 | qa-analyst.cjs | ${code}: friendly message | pending | |
| 149 | qa-analyst.cjs | ${code}: buttons re-enabled | pending | |
| 150 | qa-analyst.cjs | not_granted hides panel | pending | |
| 151 | qa-analyst.cjs | garbage answer -> unusable message | pending | |
| 152 | qa-analyst.cjs | Stop button visible while busy | pending | |
| 153 | qa-analyst.cjs | Stop aborts cleanly | pending | |
| 154 | qa-analyst.cjs | sample null hides panel | pending | |
| 155 | qa-analyst.cjs | no window.claude hides panel, rest of page works | pending | |
