# 02 UX specification (Option B: guided steps)

Visual reference: the Option B screens in `docs/ux-options/ux-options.html` (B1 to B4). Palette, fonts and spacing come from that file: ink `#1d2a24`, muted `#5d6a63`, accent `#1f5f4a`, surface `#fffdf8`, page `#f6f3ec`, line `#ddd6c6`; Inter for text, Source Serif 4 for headings. Phone layout first (390 px), then desktop (center a 480 to 560 px column; answer screen may use two columns at 1024 px and up).

## Principles (from research; see planning doc)
- Two disclosure levels only: the answer, and "Fine-tune"/"Why". A third level is not allowed.
- One question and one primary button per screen. Buttons say what happens next ("Continue to cars", "Show my answer").
- Every step shows where you are ("Step 2 of 3") and offers "Back" and "Skip to answer".
- Defaults everywhere, so the answer is reachable in 3 taps. Placeholders are marked.
- Answer first; evidence on demand; plain words.

## Flow
`Step 1 Decision` -> `Step 2 Your car and driving` -> `Step 3 Cars` -> `Answer`. "Skip to answer" jumps from any step using current values. "Describe it in a sentence" (analyst) is a secondary link on Step 1 and a docked "Ask" on the Answer. Editing from the Answer returns to the relevant step and back.

## Screens

### Step 1: Decision
- Heading: "What are you deciding?" Sub: "Pick the closest one. You can change it later."
- Four large buttons (one tap selects and advances):
  - **Sell my car, then buy**: "Sell it yourself and put the money toward the next car" (path `sell`)
  - **Trade my car in**: "A dealer takes it off the price" (path `trade`)
  - **Just buy**: "No car to sell, or I am keeping mine" (path `none`)
  - **Not sure: describe it in a sentence**: opens the analyst sheet (hidden if AI is unavailable)
- Footer: "Back" (disabled) and "Skip to answer".
- Public-site default: nothing preselected (a tap is required). Demo mode may preselect `sell`.

### Step 2: Your car and driving (hidden when path is `none`, except miles)
- Heading: "Your car and your driving". Sub: "Start from a preset. Values marked as placeholders are not sourced."
- "Car you have now": chips for the presets (Lexus LX 470 example, older sedan, older SUV, older hybrid) and "Something else" (opens editable fields: name, value, mpg, repair cost per mile, insurance).
- "What it would sell for" (or "trade-in offer" when path is `trade`): money field.
- "Miles per year": slider with numeric readout (1,000 to 30,000; default 7,500).
- Note: "Not sure of a number? Leave it. Placeholders are marked and you can change them from the answer screen."
- Primary: "Continue to cars". Secondary: "Back", "Skip to answer".

### Step 3: Cars
- Heading: "Which cars should we compare?" Sub: "3 of up to 4 chosen. Each is compared on a loan and, where known, a lease."
- Rows with checkbox, name, type (Electric / Hybrid / Gas). Pre-checked defaults: the three from the current defaults (Tesla Model Y, Chevy Bolt, Rivian R2), as an open decision for the public site.
- Limit 4 on mobile (engine supports 8); at the limit, remaining boxes are disabled with the message "Pick up to 4. Uncheck one first."
- "+ Add my own car" opens a small form (name, type, price, mpg or kWh per 100 mi) using existing custom-car logic.
- Primary: "Show my answer".

### Answer
- Heading: one plain sentence from the verdict generator (see rules below).
- Basis line: path, current car, miles, horizon, e.g. "Sell, then buy · 7,500 miles a year · 8 years, in today's dollars" with an "Edit" link.
- Three option cards plus "Keep your car" if it is not already among the three (when a current car exists). Each card: name, a tag ("Highest overall score", "Lowest carbon", "Lowest cost"), score out of 100, and three numbers: 8-year cost, carbon in tonnes, People score.
- "What would change this": one or two sentences from engine facts (see rules).
- Buttons: **Why this result**, **Fine-tune**, **Table**, **Share** (each opens an inline panel or sheet; never a new page).
- Docked bar: "Ask the analyst" (hidden if AI is unavailable).
- Footer notice (always visible): "Estimates for comparison, not financial or tax advice. Data verified on <date>. Sources."

### Why this result (panel)
Planet, People and Profit tables (current tabs), sourced-versus-assumed badges, the "Does the winner hold up?" sensitivity table, the sources list with links.

### Fine-tune (sheet)
- **Top drivers first (5):** miles per year; gas price; what your car would sell for (or trade-in offer); first-time EV buyer (if any EV selected); trade-in discount (only if path is `trade`). Then "All assumptions" (existing collapsible sections, unchanged), then "Scoring and appearance" (method, scale, weighting, financing shown, theme).
- Edited values show an "edited" mark and a reset control (existing behavior).
- Changes update the answer live behind the sheet; closing returns to the answer.

### Table (panel)
Existing sortable results table with "Copy as spreadsheet text".

### Share (sheet)
"Copy link" (restores the scenario; see `03-architecture.md`). Shows exactly what the link contains. No data leaves the browser.

### Analyst sheet (opt-in)
Textarea with the existing example chips and the existing result cards (summary, questions with Set, suggestions with Apply, add and remove cars, new car, settings, flip factors, caveats). Everything stays opt-in: nothing applies without a tap. After applying, "Back to my answer".

## Verdict sentence rules (pure function, unit-tested)
Inputs: ranked options, keep option or null, cheapest, cleanest.
1. Keep exists, keep is cheapest, top overall is not keep: "Keeping your {car} costs least. The {top} scores highest overall."
2. Keep is top overall: "Keeping your {car} comes out ahead overall."
3. Top overall is also cheapest and not keep: "The {top} wins on cost and overall score."
4. Top two are within 2 points: prefix "It is close. " and name both: "{top} and {second} are within 2 points."
5. No current car: "The {top} scores highest overall; the {cheapest} costs least."
Names come from `optionName`; never exceed two sentences.

## "What would change this" rules
- If the best non-keep option has a finite break-even gas price above today's: "Gas above ${x} a gallon makes {option} cost less than keeping {car}. Today the tool assumes ${gas}."
- If the break-even is `null` (none below $40): "No realistic gas price makes {option} cheaper than keeping {car}."
- Optionally one more line from the what-if table (`sensitivityRows`) when the winner flips (for example "If you drove twice as far, {x} would win").
- Hide the section when there is no keep option.

## Copy and tone
Plain language, short sentences, no jargon without a one-line gloss. Placeholders say "placeholder", sourced values link to the source. Never promise savings.

## Accessibility (acceptance)
- Keyboard-only completes the whole flow; focus moves to the new screen's heading on step change; visible focus ring.
- Touch targets at least 44 px; text contrast at least 4.5:1 in both themes; color is never the only signal.
- Browser Back moves between steps; no keyboard traps in sheets (Escape closes, focus returns).
- `aria-live` announces answer updates after edits.

## Empty, error and edge states
- AI unavailable or rate limited: analyst entry points are hidden or show "The analyst is unavailable right now. The steps work without it."
- Invalid numbers: clamp to the field range and show the allowed range.
- No cars selected: disable "Show my answer" with a reason.
- Path `none`: no keep card, no break-even line, no sale-proceeds fields.
- Very small screens (320 px) and large text (200%): no horizontal scroll, no clipped controls.
