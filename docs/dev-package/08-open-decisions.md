# 08 Open decisions (owner)

| # | Decision | Options | Recommended default | Needed by |
| --- | --- | --- | --- | --- |
| 1 | UX direction | A, B, C, blend | **B (decided Nov 2, 2026)** with the analyst as opt-in | done |
| 2 | Launch audience | California only, or US-wide with a generic mode | California first: the incentives and trade-in rule are sourced for California | before Phase 3 copy |
| 3 | AI access on the public site | Free with daily limits, or sign-in | Free with strict limits; no accounts in v1 | before L2 |
| 4 | Interface framework | Plain TypeScript, or Preact | Plain TypeScript through launch (smaller, no rewrite risk) | **decided Nov 4, 2026: plain TypeScript** |
| 5 | Site name and domain | open | ask Claude to check availability for names you like | before L1 |
| 6 | Revenue plans | none, or ads/affiliate/leads later | none at launch (fits Vercel Hobby); revisit later | before L1 |
| 7 | Default current-car preset on the public site | Lexus example, or a generic older sedan | Generic older sedan with a clearly labeled placeholder; keep the Lexus as a "see an example" option | **decided Nov 4, 2026: older gas sedan; Lexus kept as "Lexus LX 470 (example)"** |
| 8 | Default compared cars | the current three (Tesla, Bolt, Rivian), or a broader mix of EV, hybrid and gas | One EV, one hybrid, one gas car, so the tool does not look EV-biased | **decided Nov 4, 2026: Chevy Bolt, Toyota Camry Hybrid, Toyota Corolla (P1), data fact-checked first (P2)** |
| 9 | Car limit on mobile | 4 or 8 | 4 | **decided Nov 4, 2026: 4 at every width and everywhere (P3)** |
| 10 | Run the chat-first versus B prototype comparison | yes or no | yes, at the Phase 5 test, if time allows | before Phase 5 |
| 11 | Dollar cap for AI spend | owner chooses | start low and raise from beta data | before L2 |
| 12 | Who reviews the privacy page and terms | a person with legal knowledge | owner to arrange | before L3 |

## Phase 2 decisions (owner approved Nov 4, 2026, "go with your recommendations, add commas"; then "Approved" for P1 to P11)
Details and trade-offs: `phase-2-plan.md`.
- Commas: number fields show thousands separators (text inputs with strict parsing).
- P1 default cars Bolt, Camry Hybrid, Corolla. P2 fix their data first. P3 limit 4 everywhere. P4 trade path asks for the trade-in offer. P5 miles is one slider, 1,000 to 25,000. P6 Skip before a path assumes sell and says so. P7 no cars: Show my answer and Skip disabled with the reason. P8 analyst option hidden until Phase 4 (**reversed by the owner Nov 4, 2026**, "add option for AI chat in first page": see Phase 3a addendum below). P9 just-buy Step 2 copy. P10 old page top lines follow the current car. P11 tests written right after approval.

## Phase 3a addendum (owner, Nov 4, 2026): AI chat on the first page
- **P8 reversed.** Step 1 shows a fourth choice, "Not sure? Describe it in a sentence", after the three paths and outside their group, only when the AI is available. It appears once the AI check finishes, without moving focus.
- It opens today's analyst in a bottom sheet ("Ask the analyst"). Suggestions still apply only on a tap; the screen behind updates; "See my answer" goes to the answer.
- **Q5 pulled forward:** the answer screen has an "Ask the analyst" button that opens the same sheet ("Back to my answer" closes it).
- Phase 4 still rebuilds the analyst (filling the steps from one sentence, the new design for its answer).
