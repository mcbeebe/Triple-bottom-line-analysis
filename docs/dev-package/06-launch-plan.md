# 06 Website launch plan

## Hosting
Static site plus one serverless function on Vercel (the owner has the Vercel connector in Claude). **Vercel's free Hobby plan is restricted to non-commercial, personal use; commercial use needs Pro** (https://vercel.com/docs/plans/hobby-plan). A free tool with no revenue fits Hobby; ads, affiliate links or paid leads would not. Decide before launch (open decision 6).

## Phases
| Phase | Work | Done when |
| --- | --- | --- |
| L1 Foundations | Pick a name and domain; create the production repo and Vercel project; staging and production environments; HTTPS. | A staging URL serves the current build. |
| L2 AI backend | Build `/api/analyst` per `05-ai-backend-spec.md`; spend cap; limits; bot check; counts-only logging. | A 200-request load test stays inside the daily budget and rejects the rest politely. |
| L3 Trust and content | Landing copy; "estimates, not financial or tax advice" notice; privacy page stating exactly what is sent to the AI (the typed sentence and scenario numbers) and what is stored (nothing); "data verified on" date; sources page; contact. | A reader who has not seen the code can correctly say what is stored. |
| L4 Findability | Title, description, social preview image, sitemap, structured data; 3 to 5 static explainer pages (for example "EV vs keeping an old SUV in California"). | Lighthouse SEO and accessibility at least 90. |
| L5 Private beta | 10 to 20 invited users; cookie-free analytics (counts of events in the list below); feedback link. | At least 60% reach the answer; every blocker fixed or logged. |
| L6 Public launch | Announce in relevant communities; watch cost and errors daily for two weeks. | AI spend under the cap every day; no unresolved severity-1 bug. |

## Analytics events (counts only, no free text, no identifiers)
`step_view(step)`, `answer_view`, `edit_from_answer(field_group)`, `sheet_open(name)`, `share_copy`, `analyst_open`, `analyst_answer_ok`, `analyst_apply(kind)`, `analyst_error(code)`, `skip_to_answer(from_step)`.

## Content and compliance checklist
- [ ] Not-advice notice on the answer screen and footer.
- [ ] Privacy page and terms (have a person with legal knowledge review; I am not a lawyer).
- [ ] Every number links to its source (existing `SRC` list) and shows a retrieval date.
- [ ] Incentive notes say what to confirm and with whom (tax advisor, DMV, program site).
- [ ] No accounts, no cookies required; if analytics sets cookies, add consent.
- [ ] Accessibility statement and contact for problems.

## Keeping data fresh (quarterly checklist)
Prices and rebates move fast (some California first-time-EV rebate funding has already closed for certain brands). Each quarter: re-check every `SRC` link, each car's price and lease terms, gas and electricity prices, incentive status and amounts, and the grid carbon figure; update `DEFAULT_GLOBALS`, `CATALOG` and the "verified on" date; run `npm run verify`; commit with the sources listed in the message.

## Monitoring and incident runbook
- Alerts on: AI spend at 50% and 90% of the daily budget, error rate, function timeouts.
- If a key leaks: rotate immediately in the Anthropic console, redeploy, review usage, confirm the cap held.
- If cost spikes: lower the global budget variable (no redeploy needed if it is read at runtime), tighten limits, check logs for patterns.

## Rollout
Private beta link first, then a soft launch to a few communities, then wider announcement. Collect feedback in one place and triage weekly.
