# Phase 3b port ledger

Every check in the three old-page suites (`qa.cjs` 79, `qa-path.cjs` 43, `qa-analyst.cjs` 33; 155 in all) and where it lives now.
`scripts/qa-ledger.cjs` (part of `npm run qa`) enforces it:
- every old check has exactly one row;
- **ported** rows name a check that exists word for word in a new suite (`suite.cjs: check name`);
- **retired** rows give the reason;
- **pending** is allowed only while the old suite still exists. Phase 3b deletes the old suites, so nothing can stay pending.

| # | Old suite | Old check | Status | New check, or why it is retired |
| --- | --- | --- | --- | --- |
| 1 | qa.cjs | mobile: scoring options start collapsed | pending | |
| 2 | qa.cjs | assumptions panel is visible without opening anything | pending | |
| 3 | qa.cjs | assumption inputs are visible (key drivers) | pending | |
| 4 | qa.cjs | the "please confirm" box is visible with the MyFirstEV switch | pending | |
| 5 | qa.cjs | assumptions sit between the verdict and the detail results | pending | |
| 6 | qa.cjs | live scoreboard is present inside the assumptions panel | pending | |
| 7 | qa.cjs | car matrix has one column per active car (Lexus + 3 selected) | pending | |
| 8 | qa.cjs | matrix cell exists for Tesla loan APR | pending | |
| 9 | qa.cjs | page renders 7 option cards by default | pending | |
| 10 | qa.cjs | ranks are 1..7 and unique | pending | |
| 11 | qa.cjs | repro: Lexus net cost goes negative with a high resale value | pending | |
| 12 | qa.cjs | profit scores still differ across options when the Lexus NPV is negative | pending | |
| 13 | qa.cjs | ...and the Lexus profit score falls when gas gets expensive | pending | |
| 14 | qa.cjs | edited markers appear on the three changed inputs | pending | |
| 15 | qa.cjs | edit counter reports the edits | pending | |
| 16 | qa.cjs | per-field reset restores the gas price input | pending | |
| 17 | qa.cjs | reset all restores default Lexus NPV | pending | |
| 18 | qa.cjs | ...and clears the edited markers | pending | |
| 19 | qa.cjs | the confirm section starts expanded | pending | |
| 20 | qa.cjs | tapping the confirm heading collapses it | pending | |
| 21 | qa.cjs | tapping again expands it | pending | |
| 22 | qa.cjs | Collapse all closes every assumption section | pending | |
| 23 | qa.cjs | ...but the live scoreboard and header stay visible | pending | |
| 24 | qa.cjs | Expand all opens every section | pending | |
| 25 | qa.cjs | a collapsed section stays collapsed after the page re-renders (picking a car) | pending | |
| 26 | qa.cjs | section headers show how many values were edited | pending | |
| 27 | qa.cjs | the confirm box stays inside the screen width | pending | |
| 28 | qa.cjs | default scale is "typical new car" | pending | |
| 29 | qa.cjs | Lexus Profit score RISES when its running costs fall | pending | |
| 30 | qa.cjs | Lexus Planet score RISES when its fuel economy improves | pending | |
| 31 | qa.cjs | the verdict panel has a one-tap shortcut to the table | pending | |
| 32 | qa.cjs | results default to cards | pending | |
| 33 | qa.cjs | table view replaces the cards | pending | |
| 34 | qa.cjs | table has one row per option | pending | |
| 35 | qa.cjs | table has the key columns | pending | |
| 36 | qa.cjs | sorting by net cost puts the cheapest option first | pending | |
| 37 | qa.cjs | clicking again reverses the sort | pending | |
| 38 | qa.cjs | sorting by overall score descending is monotone | pending | |
| 39 | qa.cjs | copy button gives feedback (copied, or a clear message if the browser blocks it) | pending | |
| 40 | qa.cjs | table view causes no page-level horizontal overflow | pending | |
| 41 | qa.cjs | switching back restores the cards | pending | |
| 42 | qa.cjs | picker lists electric, hybrid and gas groups | pending | |
| 43 | qa.cjs | selecting a hybrid and a gas car adds their options (rav4h loan+lease, corolla loan) | pending | |
| 44 | qa.cjs | the matrix gained columns for the new cars | pending | |
| 45 | qa.cjs | a gas-only car has no lease option | pending | |
| 46 | qa.cjs | deselecting a car removes its options | pending | |
| 47 | qa.cjs | selection is capped at 4 cars | pending | |
| 48 | qa.cjs | a notice explains the cap | pending | |
| 49 | qa.cjs | card list collapses to top 8 with a Show-all button | pending | |
| 50 | qa.cjs | Show all reveals every option | pending | |
| 51 | qa.cjs | clear selection leaves only the Lexus | pending | |
| 52 | qa.cjs | adding a custom hybrid selects it and offers a loan option | pending | |
| 53 | qa.cjs | custom car can be renamed | pending | |
| 54 | qa.cjs | lease terms can be added to a custom car | pending | |
| 55 | qa.cjs | a custom car can be removed | pending | |
| 56 | qa.cjs | turning off MyFirstEV raises the Bolt net cost by about $3,500 | pending | |
| 57 | qa.cjs | Tesla is unaffected by MyFirstEV (funding closed) | pending | |
| 58 | qa.cjs | turning off the loan-interest deduction raises the Tesla loan cost | pending | |
| 59 | qa.cjs | ...but not the Tesla lease (leases do not qualify) | pending | |
| 60 | qa.cjs | income above the phase-out removes the deduction | pending | |
| 61 | qa.cjs | Clean Cars 4 All changes the replacement scores (scrapping removes the sold Lexus emissions) | pending | |
| 62 | qa.cjs | upstream gasoline input affects emissions only (NPV unchanged) | pending | |
| 63 | qa.cjs | theme ${t} applied | pending | |
| 64 | qa.cjs | theme ${t}: no horizontal page overflow at 390px | pending | |
| 65 | qa.cjs | mode ${m} selected and scores finite | pending | |
| 66 | qa.cjs | relative scale: cheapest option shows profit 100 | pending | |
| 67 | qa.cjs | anchored scale: keep profit = 50 | pending | |
| 68 | qa.cjs | weakest-link aggregation still ranks | pending | |
| 69 | qa.cjs | loan-only view shows 4 cards | pending | |
| 70 | qa.cjs | lease-only view shows 4 cards | pending | |
| 71 | qa.cjs | wallet-first winner has a profit score at least as high as the planet-first winner | pending | |
| 72 | qa.cjs | tab ${t} renders a table | pending | |
| 73 | qa.cjs | raising the Lexus safety rating raises its People score | pending | |
| 74 | qa.cjs | strict embodied mode still renders | pending | |
| 75 | qa.cjs | every link is an https URL | pending | |
| 76 | qa.cjs | external links use rel=noopener | pending | |
| 77 | qa.cjs | sources list is populated | pending | |
| 78 | qa.cjs | desktop: scoring options start open | pending | |
| 79 | qa.cjs | no page or console errors | pending | |
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
