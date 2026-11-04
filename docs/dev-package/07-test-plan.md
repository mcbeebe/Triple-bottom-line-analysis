# 07 Test plan

## Layers
| Layer | Tool | What it covers | Run |
| --- | --- | --- | --- |
| Unit | vitest | Engine math, scoring, incentives, disposal paths, analyst validation, verdict sentences, share encode/decode, step state machine | `npm test` |
| Browser | Playwright | Full flows at 390 px and 1280 px; mocked AI; edits update results; no console errors | `npm run qa` |
| Accessibility | axe (via Playwright) | Each screen and sheet, both themes | add in Phase 5 |
| Performance | Lighthouse | Performance, accessibility, SEO at least 90 | add in Phase 5 |
| Cross-browser | manual | Chrome, Safari on iPhone, Firefox | Phase 5 |
| Usability | people | See protocol below | Phase 5 |

## Rules
- New logic gets tests first. A bug fix gets a regression test that fails before the fix.
- Browser tests mock the AI (`window.claude.use` stub or a local fake for `/api/analyst`) and cover: normal answer, rate limit, budget exhausted, unavailable, garbage JSON, user abort.
- Always check the rendered page: no horizontal overflow, nothing clipped, no console errors.

## New browser suite to add (Phase 2 to 3): `scripts/qa-steps.cjs`
- Fresh load -> Step 1 shows no preselection; one tap advances.
- Defaults reach the answer in at most 3 taps; "Skip to answer" works from every step.
- Back button moves through steps and sheets; focus lands on the new heading.
- Path `none` hides the car fields and the keep card.
- Car limit of 4 on mobile with the stated message.
- Fine-tune edits update the answer live; reset restores defaults.
- Share link round trip restores the scenario; a tampered link is rejected safely.
- Keyboard-only completes the flow.

## Usability test protocol (5 participants, about 20 minutes each)
**Recruit:** adults who own a car and have not seen the tool; mix of phone and laptop; at least one over 55.
**Setup:** prototype build on the participant's own device, think-aloud, no help unless stuck for 60 seconds (record when help was given).
**Tasks**
1. "You're thinking about replacing your car. Find out whether you should." (reach the answer)
2. "Why does it say that?" (find the evidence)
3. "Say you drive twice as much. What changes?" (use Fine-tune)
4. "Send this to your partner." (share)
5. Optional: "Describe your situation in your own words" (analyst shortcut)
**Measure:** time to the answer, taps, errors, where they hesitate, whether they can restate the verdict, whether they notice the not-advice notice.
**Pass:** at least 4 of 5 reach the answer unaided in under 2 minutes and can restate the verdict.
**Optional A/B (open decision):** half the participants use B, half use the chat-first prototype (E); compare time to answer and preference. With 5 people this is directional only.
**Report:** one page: results against the targets, a ranked fix list, and your recommendation.

## Evidence note
The UX direction rests on expert guidance (Nielsen Norman Group on progressive disclosure and wizards) and mixed studies on chat versus forms. The usability test is the check on this product specifically.
