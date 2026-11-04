# 01 Product brief

## Goal
Help an individual decide on a purchase by scoring it on three pillars: **planet** (lifecycle carbon), **people** (safety, health, supply chain, community) and **profit** (cost to the household). First use case: replacing a car. Output is one plain-language answer with the evidence one tap away.

## Users
- **Newcomer:** curious or undecided, no jargon, on a phone, wants an answer in about 90 seconds.
- **Expert:** wants every assumption visible and editable, a table, and a share link.
- Not users in v1: fleets, businesses, non-US buyers.

## Problem with today's page (measured at 390 px wide)
- 15,967 px tall (19 screens). First verdict at 2,605 px; first result card at 8,235 px.
- 61 buttons and 83 form controls. Setup and expert controls come before the answer.
- Jargon (benchmark scale, anchored, PV, CO2e, MAGI, weakest link).

## Scope for this build
**In:** guided steps (decision, car and driving, cars), answer screen, "Why", "Fine-tune", "Table", share link, analyst shortcut, public website with a server AI route, legal and trust content, privacy-friendly analytics.
**Out (v1):** accounts, saved scenarios, other purchase types (home remodel), non-California incentives beyond a generic mode, payments, ads.

## What exists today (do not rebuild)
- **Engine** (`src/engine.ts`): monthly cash-flow simulation to present value; loans and leases; lifecycle CO2e with upstream gasoline and a "continued emissions of the sold car" share; three scoring modes (hybrid, numbers only, 1 to 5 scorecard); three scales (typical new car, keep-your-car, relative); weight presets; sell, trade-in and no-car paths; break-even gas price; payback year; incentives (federal car-loan interest deduction, California MyFirstEV rebate, Clean Cars 4 All grant, charger rebate).
- **Data** (`src/data.ts`): 12 replacement cars (5 EV, 4 hybrid, 3 gas) plus the owned car and custom cars; every default labeled sourced (with link) or assumption; presets for the current car.
- **Analyst** (`src/analyst.ts`): prompt builder, what-if table computed by the real engine, strict validation of AI output (`sanitizeAnswer`); can suggest input values, add or remove cars, build a custom car from user-given numbers, set the path and scoring settings.
- **UI** (`src/ui.ts`, about 1,560 lines): single page with collapsible assumptions, cards and table views.
- **Tests:** 121 unit tests; three Playwright suites (`scripts/qa.cjs`, `qa-analyst.cjs`, `qa-path.cjs`).

## Success metrics (proposed targets, adjust after the beta)
| Metric | Target |
| --- | --- |
| First-time visitor reaches the answer unaided in under 2 minutes | at least 4 of 5 testers |
| Reach the answer screen (beta) | at least 60% of sessions |
| Taps from first screen to answer, using defaults | 3 or fewer |
| Lighthouse performance / accessibility / SEO | each at least 90 |
| AI spend | under the daily cap every day of the first 2 weeks |

## Risks to keep in view
Stale prices and incentives; reading results as financial or tax advice; AI cost spikes; placeholder values (income, first-time-EV status, trade-in discount) shaping results. See `06-launch-plan.md`.
