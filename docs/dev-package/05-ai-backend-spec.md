# 05 AI backend specification (public website)

## Why it is needed
The artifact build uses the viewer's own Claude permission. A public website has none, so it needs a server route that holds the Anthropic API key. **Never put the key in browser code.**

## Endpoint
`POST /api/analyst`
- **Request (JSON, at most 64 KB):** `{ "task": "guide" | "explain", "scenarioText": string (at most 1,500 chars), "snapshot": { settings, currentCar, selectedCars, fields[], results[], cars[] } }`.
- **Response:** `{ "ok": true, "answer": <raw JSON object> }` or `{ "ok": false, "code": "rate_limited" | "budget_exhausted" | "bad_request" | "unavailable" }`.
- The client still runs `sanitizeAnswer`; the server also validates the shape and drops anything oversized.

## Server behavior
1. **Build the prompt on the server** with the shared `buildPrompt` from `src/analyst.ts` so a client cannot send its own system instructions. User-supplied text is placed only in the data section.
2. **Fixed system prompt** and fixed `max_tokens`; model from the `ANTHROPIC_MODEL` environment variable (default `claude-sonnet-5-5`). Test a smaller tier on 20 saved scenarios to cut cost; check current prices at https://docs.claude.com before choosing.
3. **Validate** the payload (type, length, counts); reject with `bad_request`.
4. **Rate limit** by IP and by a per-session token, and keep a **global daily budget counter**; when exhausted return `budget_exhausted` (the UI shows the "unavailable" note). IP-only limits are easy to bypass, so do not rely on them alone.
5. **Bot check** on the analyst button (a lightweight challenge) before the first call per session.
6. **Logging:** counts and error codes only. Never log `scenarioText` or the snapshot.
7. **Timeouts:** abort the upstream call after about 30 seconds; return `unavailable`.

## Starting limits (proposals; tune during the beta)
| Control | Starting value |
| --- | --- |
| Analyses per IP per day | 10 |
| Analyses per session per hour | 5 |
| Global daily budget | set from a dollar cap you choose before launch |
| Request body | 64 KB |
| Output tokens | fixed cap sized to the JSON schema |

## Configuration (environment variables)
`ANTHROPIC_API_KEY` (server only, never `NEXT_PUBLIC_`-style), `ANTHROPIC_MODEL`, `DAILY_BUDGET_USD`, `RATE_LIMIT_IP_PER_DAY`, `RATE_LIMIT_SESSION_PER_HOUR`. Counters need a small shared store (for example a key-value service; confirm current offerings and plan terms when choosing).

## Console and key hygiene
- Use a **dedicated Anthropic workspace** for this site with a **hard monthly spend limit** and alerts. Workspace limits may not exist on the default workspace; confirm in the Anthropic console.
- Separate keys for development, staging and production. Rotate if a key may have leaked.

## Prompt-injection and misuse
- Output is only ever displayed as escaped text or applied through typed, range-checked fields after a user tap; there is no code execution, no URL fetching and no HTML rendering of model output.
- Refuse requests that are not about the decision (the prompt already tells the model to stay on task); the UI shows nothing for unusable answers.

## Tests
Unit-test the validator and limit counters; integration-test the route with the Anthropic call mocked: oversized body, missing fields, rate limit, budget exhausted, upstream timeout, malformed model JSON. A load test of 200 requests must stay under the budget and reject the rest politely.

## Sources
- Keys belong server-side: https://dev.to/claudeguide/claude-api-security-api-key-protection-integration-patterns-445f
- Spend limits and per-customer controls: https://www.requesty.ai/blog/llm-spend-limits-per-api-key-and-customer
- Rate limiting beyond IP: https://www.flowhunt.io/blog/llm-api-security-rate-limiting-auth-abuse-prevention/
