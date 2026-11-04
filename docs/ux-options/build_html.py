"""Builds one standalone HTML page that shows the three UX options (reuses the screens from build.py)."""
import os, build as b, build_chat as d

def section(sid, tag, title, blurb, screens, best, trade, rec=False):
    badge = f'<span class="rec">Your direction</span>' if rec else ''
    return f'''<section id="{sid}" aria-labelledby="{sid}-h">
<div class="tag">{tag}{badge}</div>
<h2 id="{sid}-h">{title}</h2>
<p class="blurb">{blurb}</p>
<div class="row" tabindex="0" role="group" aria-label="{tag} screens, scroll sideways on a small screen">{''.join(screens)}</div>
<div class="notes"><p><b>Best for:</b> {best}</p><p><b>Trade-off:</b> {trade}</p></div>
</section>'''

blend = section('blend','Updated concept · simpler blend','One conversation: tap or type','A single chat thread. The guided steps are quick-reply buttons inside the conversation, so there is one question and one thing to do at a time. Typing a sentence works at any point and jumps ahead: the analyst summarizes what it understood, asks the one question that changes the cost, and shows the answer.',[d.screen_e1(),d.screen_e2(),d.screen_e3(),d.screen_e4()],'everyone: tappers never type, typers skip the questions, and each screen has one job.','the tap-only path must work without the AI (the scripted questions do). About 6 days to build, my estimate.',True)
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TBL Scorecard: three UX options</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;family=Source+Serif+4:wght@600&amp;display=swap">
<style>
*{{box-sizing:border-box}}
body{{margin:0;background:{b.SOFT};color:{b.INK};font:15px/1.5 {b.SANS}}}
main{{max-width:1200px;margin:0 auto;padding:24px 16px 64px}}
h1{{margin:0 0 6px;font:600 clamp(26px,5vw,38px)/1.15 {b.SERIF}}}
h2{{margin:4px 0 6px;font:600 clamp(22px,4vw,32px)/1.15 {b.SERIF}}}
.lead{{margin:0 0 16px;max-width:70ch;color:{b.MUT}}}
nav{{position:sticky;top:0;z-index:5;background:{b.SOFT};padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid {b.LINE};margin-bottom:8px}}
nav a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid {b.LINE};background:{b.SURF};border-radius:999px;color:{b.INK};font-weight:600;text-decoration:none}}
nav a:hover,nav a:focus-visible{{border-color:{b.ACC};outline:none;box-shadow:0 0 0 2px {b.ACC}}}
section{{margin:36px 0 0;scroll-margin-top:72px}}
.tag{{font:600 12px {b.SANS};letter-spacing:.08em;text-transform:uppercase;color:{b.ACC}}}
.earlier{{margin:56px 0 0;padding-top:24px;border-top:2px solid {b.LINE}}}
.rec{{margin-left:10px;background:{b.ACC};color:#fff;border-radius:999px;padding:3px 10px;letter-spacing:.02em;text-transform:none}}
.blurb{{margin:0 0 18px;max-width:70ch;color:{b.MUT}}}
.row{{display:flex;gap:32px;align-items:flex-start;overflow-x:auto;padding:4px 4px 18px}}
.row:focus-visible{{outline:2px solid {b.ACC};outline-offset:2px}}
.notes{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 32px;max-width:900px}}
.notes p{{margin:0}}
footer{{margin-top:40px;color:{b.MUT};font-size:13px;max-width:70ch}}
</style>
</head>
<body>
<main>
<h1>Three ways to simplify the scorecard</h1>
<p class="lead">Phone-sized mockups. Your direction (a blend of B and C) is first; the three earlier options are below it. Answer screens use the tool's real default results (8-year horizon, 7,500 miles a year, gas at $5.50 a gallon). Mockups are static.</p>
<nav aria-label="Options"><a href="#blend">Your pick: B + C</a><a href="#a">A</a><a href="#b">B</a><a href="#c">C</a></nav>
{blend}
<h2 class="earlier">Earlier options, for reference</h2>
{section('a','Option A','Single page, cleaned up','The same single page, reordered so your situation and the answer come first. Everything else folds away.',[b.screen_a1(),b.screen_a2()],'the smallest change, and people who like to see everything on one page.','newcomers still face every control on one long page. About 2 days to build.')}
{section('b','Option B','Guided steps','Three short questions, then one answer screen you can edit live. Skip to answer is always available, and the analyst can fill the steps from one sentence.',[b.screen_b1(),b.screen_b2(),b.screen_b3(),b.screen_b4()],'first-time visitors. It keeps every feature but shows one decision at a time.','more build work (about 5 days), and experts need the skip link.')}
{section('c','Option C','Analyst first','One box: describe the decision. The analyst proposes the whole setup, you confirm it, and you land on the answer with a docked ask bar for follow-ups.',[b.screen_c1(),b.screen_c2(),b.screen_c3()],'people who like to type, and the fastest route to a first answer.','needs the AI on every visit, so it costs money per visitor and fails when the AI is unavailable.')}
<footer>Build estimates are my own, not measured. Example prompts and the two quick questions in Option C are illustrative.</footer>
</main>
</body>
</html>
'''
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ux-options.html')
open(out, 'w').write(html)
print(out, len(html))
