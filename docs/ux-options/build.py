"""Generates the three UX option artboards (.dc.html) and the canvas index for the Design artifact.
Sample numbers come from the app's default scenario (8-year horizon, 7,500 mi/yr, gas $5.50), via scripts/dump.ts."""
import json, os

OUT = os.path.join(os.path.dirname(__file__), 'project')
os.makedirs(OUT, exist_ok=True)

BG, SURF, INK, MUT, LINE, ACC, SOFT, TINT = '#f6f3ec', '#fffdf8', '#1d2a24', '#5d6a63', '#ddd6c6', '#1f5f4a', '#efe9da', '#e3efe9'
SERIF = "'Source Serif 4', Georgia, serif"
SANS = "'Inter', system-ui, sans-serif"

def chip(text, on=False, sub=''):
    bg, col, bd = (ACC, '#ffffff', ACC) if on else (BG, INK, LINE)
    s = f'<small style="display:block;font-size:11px;opacity:.85;font-weight:400">{sub}</small>' if sub else ''
    return f'<button style="font:600 13px {SANS};background:{bg};color:{col};border:1px solid {bd};border-radius:999px;padding:10px 14px;min-height:44px;text-align:left">{text}{s}</button>'

def btn(text, primary=True, full=True, disabled=False):
    bg, col, bd = (ACC, '#ffffff', ACC) if primary else ('transparent', ACC, ACC)
    w = 'width:100%;' if full else ''
    return f'<button style="{w}font:600 15px {SANS};background:{bg};color:{col};border:1px solid {bd};border-radius:12px;padding:12px 16px;min-height:48px">{text}</button>'

def link(text):
    return f'<a href="#" style="font:600 13px {SANS};color:{ACC};padding:12px 0;display:inline-block;min-height:44px;box-sizing:border-box">{text}</a>'

def label(text):
    return f'<div style="font:600 11px {SANS};letter-spacing:.06em;text-transform:uppercase;color:{MUT};margin:0 0 6px">{text}</div>'

def card(inner, accent=False, pad=14, extra=''):
    bd = ACC if accent else LINE
    bg = TINT if accent else SURF
    return f'<div style="background:{bg};border:{2 if accent else 1}px solid {bd};border-radius:14px;padding:{pad}px;box-sizing:border-box;{extra}">{inner}</div>'

def h(text, size=24):
    return f'<h2 style="margin:0;font:600 {size}px/1.2 {SERIF};color:{INK}">{text}</h2>'

def p(text, size=14, col=MUT, mb=0):
    return f'<p style="margin:0 0 {mb}px;font:400 {size}px/1.45 {SANS};color:{col}">{text}</p>'

def wordmark(right=''):
    r = f'<span style="font:600 12px {SANS};color:{MUT}">{right}</span>' if right else ''
    return f'<div style="display:flex;justify-content:space-between;align-items:center;height:28px;margin-bottom:14px"><span style="font:600 13px {SANS};color:{ACC};letter-spacing:.02em">TBL Scorecard</span>{r}</div>'

def progress(n):
    segs = ''.join(f'<i style="flex:1;height:4px;border-radius:2px;background:{ACC if i < n else LINE}"></i>' for i in range(3))
    return f'<div style="display:flex;gap:6px;margin:0 0 18px" aria-hidden="true">{segs}</div>'

def disc(text, meta=''):
    m = f'<span style="font:400 12px {SANS};color:{MUT}">{meta}</span>' if meta else ''
    return f'<div style="display:flex;justify-content:space-between;align-items:center;background:{SURF};border:1px solid {LINE};border-radius:12px;padding:0 14px;min-height:48px"><span style="font:600 14px {SANS};color:{INK}">{text}</span><span style="display:flex;gap:8px;align-items:center">{m}<span style="color:{MUT};font:600 16px {SANS}" aria-hidden="true">+</span></span></div>'

def option_btn(title, sub, on=False, accent=False):
    bg = TINT if on else SURF
    bd = ACC if (on or accent) else LINE
    w = 2 if on else 1
    return f'<button style="display:block;width:100%;text-align:left;background:{bg};border:{w}px solid {bd};border-radius:14px;padding:14px 16px;min-height:64px;font-family:{SANS}"><span style="display:block;font:600 15px {SANS};color:{INK}">{title}</span><span style="display:block;font:400 12.5px/1.4 {SANS};color:{MUT};margin-top:2px">{sub}</span></button>'

def field(lbl, val, unit=''):
    u = f'<span style="color:{MUT};font:400 13px {SANS};margin-left:6px">{unit}</span>' if unit else ''
    return f'<div style="margin-bottom:14px"><label style="display:block;font:600 13px {SANS};color:{INK};margin-bottom:6px">{lbl}</label><div style="display:flex;align-items:center;background:{SURF};border:1px solid {LINE};border-radius:10px;padding:0 12px;min-height:48px"><span style="font:600 16px {SANS};color:{INK}">{val}</span>{u}</div></div>'

def phone(caption, inner, docked=''):
    return f'''<div style="display:flex;flex-direction:column;gap:12px;width:390px;flex:none">
<div style="font:600 14px {SANS};color:{INK}">{caption}</div>
<div style="width:390px;height:844px;box-sizing:border-box;background:{BG};border:1px solid {LINE};border-radius:40px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 28px rgba(60,50,20,.10)">
<div style="flex:1;padding:22px 20px 16px;box-sizing:border-box;overflow:hidden">{inner}</div>{docked}</div></div>'''

def verdict_cards():
    def oc(name, tag, score, cost, co2, people, top=False):
        t = f'<span style="font:600 11px {SANS};color:{ACC};background:{TINT};border-radius:999px;padding:3px 9px">{tag}</span>'
        nums = ''.join(f'<div style="flex:1"><div style="font:400 11px {SANS};color:{MUT}">{k}</div><div style="font:600 15px {SANS};color:{INK}">{v}</div></div>' for k, v in (('8-year cost', cost), ('Carbon', co2), ('People', people)))
        return card(f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font:600 15px {SANS};color:{INK}">{name}</div><div style="margin-top:6px">{t}</div></div><div style="text-align:right"><span style="font:600 28px {SERIF};color:{INK}">{score}</span><span style="font:400 12px {SANS};color:{MUT}">/100</span></div></div><div style="display:flex;gap:10px;margin-top:10px;border-top:1px dashed {LINE};padding-top:10px">{nums}</div>', accent=top, pad=12)
    return f'<div style="display:flex;flex-direction:column;gap:10px">{oc("Tesla Model Y (loan)", "Highest score", "57", "$59,400", "37 t", "80", True)}{oc("Chevy Bolt (loan)", "Lowest carbon", "53", "$41,600", "36 t", "55")}{oc("Keep your Lexus", "Lowest cost", "50", "$34,700", "54 t", "45")}</div>'

def change_card():
    return card(f'{label("What would change this")}{p("Gas above <b>$7.21 a gallon</b> makes the Chevy Bolt cost less than keeping the Lexus. Today the tool assumes $5.50.", 13.5, INK)}', pad=14)

def ask_dock(text='Ask the analyst: what if gas hits $8?'):
    return f'<div style="border-top:1px solid {LINE};background:{SURF};padding:10px 14px;display:flex;gap:8px;align-items:center;box-sizing:border-box"><div style="flex:1;font:400 13px {SANS};color:{MUT};background:{BG};border:1px solid {LINE};border-radius:999px;padding:0 14px;min-height:44px;display:flex;align-items:center">{text}</div><button style="font:600 14px {SANS};background:{ACC};color:#fff;border:0;border-radius:999px;min-height:44px;padding:0 16px">Ask</button></div>'

def bars():
    def row(name, val, w, col):
        return f'<div style="display:grid;grid-template-columns:96px 1fr 64px;gap:8px;align-items:center;margin-bottom:8px"><span style="font:400 12.5px {SANS};color:{INK}">{name}</span><span style="background:{SOFT};border-radius:6px;height:12px;display:block"><i style="display:block;height:12px;width:{w}%;background:{col};border-radius:6px"></i></span><span style="font:600 12.5px {SANS};color:{INK};text-align:right">{val}</span></div>'
    return row('Keep Lexus', '$34,700', 46, ACC) + row('Chevy Bolt', '$41,600', 55, '#8fb8a5') + row('Tesla Model Y', '$59,400', 78, '#8fb8a5')

# ---------------------------------------------------------------- Option A
def screen_a1():
    sit = card(
        f'''{label("Your situation")}
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">{chip("Sell, then buy", True)}{chip("Trade it in")}{chip("Just buy")}</div>
<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed {LINE};padding:8px 0;font:400 13.5px {SANS};color:{INK}"><span><b>Lexus LX 470</b> · worth $7,000</span>{link("Edit")}</div>
<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed {LINE};padding:8px 0;font:400 13.5px {SANS};color:{INK}"><span><b>7,500</b> miles a year</span>{link("Edit")}</div>
<div style="border-top:1px dashed {LINE};padding-top:10px;display:flex;flex-wrap:wrap;gap:6px"><span style="font:600 12px {SANS};background:{SOFT};border-radius:999px;padding:7px 11px;color:{INK}">Tesla Model Y</span><span style="font:600 12px {SANS};background:{SOFT};border-radius:999px;padding:7px 11px;color:{INK}">Chevy Bolt</span><span style="font:600 12px {SANS};background:{SOFT};border-radius:999px;padding:7px 11px;color:{INK}">Rivian R2</span><span style="font:600 12px {SANS};border:1px dashed {ACC};border-radius:999px;padding:7px 11px;color:{ACC}">+ Add</span></div>''', pad=14)
    ans = card(f'{label("Answer")}{h("Keeping your Lexus costs least. The Tesla Model Y scores highest overall.", 19)}<div style="margin-top:14px">{bars()}</div>{p("Cost over 8 years, in today’s dollars.", 11.5)}', accent=True)
    inner = f'{wordmark()}{h("Should I replace my car?", 26)}<div style="margin:6px 0 14px">{p("Your situation first, then the answer. Everything else is folded away.", 13.5)}</div><div style="display:flex;flex-direction:column;gap:12px">{sit}{ans}</div>'
    return phone('A1 · Top of the page', inner)

def screen_a2():
    inner = f'''{wordmark("Scrolled down")}{label("All options")}{verdict_cards()}<div style="margin:8px 0">{change_card()}</div>
<div style="display:flex;flex-direction:column;gap:6px">{disc("Why this result", "tables, sources")}{disc("Fine-tune assumptions", "35 inputs")}{disc("Scoring and appearance")}{disc("Ask the analyst")}</div>'''
    return phone('A2 · Same page, scrolled', inner)

# ---------------------------------------------------------------- Option B
def screen_b1():
    inner = f'''{wordmark("Step 1 of 3")}{progress(1)}{h("What are you deciding?", 26)}<div style="margin:6px 0 16px">{p("Pick the closest one. You can change it later.", 13.5)}</div>
<div style="display:flex;flex-direction:column;gap:10px">{option_btn("Sell my car, then buy", "Sell it yourself and put the money toward the next car", True)}{option_btn("Trade my car in", "A dealer takes it off the price")}{option_btn("Just buy", "No car to sell, or I am keeping mine")}{option_btn("Not sure: ask the analyst", "Describe it in one sentence and it fills the steps", False, True)}</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span style="font:600 13px {SANS};color:#8a948e">Back</span>{link("Skip to answer")}</div>'''
    return phone('B1 · Decision', inner)

def screen_b2():
    presets = f'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">{chip("Lexus LX 470", True, "example")}{chip("Older sedan")}{chip("Older SUV")}{chip("Older hybrid")}</div>'
    slider = f'<div style="margin-bottom:14px"><label style="display:flex;justify-content:space-between;font:600 13px {SANS};color:{INK};margin-bottom:10px"><span>Miles per year</span><span>7,500</span></label><div style="position:relative;height:6px;background:{LINE};border-radius:3px"><i style="position:absolute;left:0;top:0;height:6px;width:38%;background:{ACC};border-radius:3px"></i><i style="position:absolute;left:38%;top:-9px;width:24px;height:24px;margin-left:-12px;background:{SURF};border:2px solid {ACC};border-radius:50%"></i></div></div>'
    inner = f'''{wordmark("Step 2 of 3")}{progress(2)}{h("Your car and your driving", 26)}<div style="margin:6px 0 16px">{p("Start from a preset. Only the Lexus values are sourced; the others are placeholders.", 13.5)}</div>
{label("Car you have now")}{presets}{field("What it would sell for", "$7,000")}{slider}
{card(p("Not sure of a number? Leave it. Placeholders are marked and you can change them from the answer screen.", 12.5), pad=12)}
<div style="display:flex;flex-direction:column;gap:6px;margin-top:16px">{btn("Continue to cars")}<div style="display:flex;justify-content:space-between"><span style="font:600 13px {SANS};color:{MUT};padding:12px 0">Back</span>{link("Skip to answer")}</div></div>'''
    return phone('B2 · Car and driving', inner)

def screen_b3():
    def row(name, kind, on):
        box = f'<span style="width:22px;height:22px;border-radius:6px;border:2px solid {ACC};background:{ACC if on else SURF};display:inline-flex;align-items:center;justify-content:center;color:#fff;font:600 14px {SANS}">{"✓" if on else ""}</span>'
        return f'<div style="display:flex;align-items:center;gap:12px;background:{SURF};border:1px solid {LINE};border-radius:12px;padding:0 14px;min-height:52px">{box}<span style="flex:1;font:600 14.5px {SANS};color:{INK}">{name}</span><span style="font:400 12px {SANS};color:{MUT}">{kind}</span></div>'
    rows = ''.join(row(*r) for r in (('Tesla Model Y', 'Electric', True), ('Chevy Bolt', 'Electric', True), ('Rivian R2', 'Electric', True), ('Toyota RAV4 Hybrid', 'Hybrid', False), ('Honda CR-V Hybrid', 'Hybrid', False), ('Toyota Corolla', 'Gas', False)))
    inner = f'''{wordmark("Step 3 of 3")}{progress(3)}{h("Which cars should we compare?", 26)}<div style="margin:6px 0 14px">{p("3 of up to 4 chosen. Each is compared on a loan and, where known, a lease.", 13.5)}</div>
<div style="display:flex;flex-direction:column;gap:8px">{rows}<div style="display:flex;align-items:center;min-height:48px;border:1px dashed {ACC};border-radius:12px;padding:0 14px;font:600 14px {SANS};color:{ACC}">+ Add my own car</div></div>
<div style="margin-top:14px">{btn("Show my answer")}<div style="padding-top:2px"><span style="font:600 13px {SANS};color:{MUT};display:inline-block;padding:12px 0">Back</span></div></div>'''
    return phone('B3 · Cars', inner)

def screen_b4():
    pills = ''.join(f'<button style="flex:1;font:600 13px {SANS};background:{SURF};color:{INK};border:1px solid {LINE};border-radius:10px;min-height:44px">{t}</button>' for t in ('Why', 'Fine-tune', 'Table', 'Share'))
    inner = f'''{wordmark("Your answer")}{h("Keeping your Lexus costs least. The Tesla Model Y scores highest overall.", 21)}<div style="margin:12px 0 10px">{verdict_cards()}</div>{change_card()}<div style="display:flex;gap:8px;margin-top:10px">{pills}</div>'''
    return phone('B4 · Answer', inner, ask_dock())

# ---------------------------------------------------------------- Option C
def screen_c1():
    ta = f'<div style="background:{SURF};border:2px solid {ACC};border-radius:14px;padding:14px;min-height:150px;box-sizing:border-box;font:400 15px/1.5 {SANS};color:{INK}">I am deciding whether to sell my 1999 Lexus LX 470 and get an EV. I drive about 7,500 miles a year and live in Oakland.</div>'
    ex = ''.join(f'<span style="font:400 12.5px {SANS};color:{INK};background:{SURF};border:1px solid {LINE};border-radius:999px;padding:9px 12px;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center">{t}</span>' for t in ('I tow a trailer and have two kids', 'Money is tight', 'Is trading in better than selling?'))
    inner = f'''{wordmark()}{h("Describe your decision", 28)}<div style="margin:6px 0 16px">{p("In your own words. The analyst sets everything up for you to confirm.", 13.5)}</div>
{ta}<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px">{ex}</div>{btn("Set it up for me")}
<div style="text-align:center;margin-top:6px">{link("Or answer 3 quick steps instead")}</div>'''
    return phone('C1 · Say it in a sentence', inner)

def screen_c2():
    def line(k, v, edit=True):
        e = link('Edit') if edit else ''
        return f'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px dashed {LINE};padding:6px 0"><div><div style="font:400 11.5px {SANS};color:{MUT}">{k}</div><div style="font:600 14px {SANS};color:{INK}">{v}</div></div>{e}</div>'
    setup = card(f'{label("Here is what I understood")}{line("Decision", "Sell, then buy")}{line("Your car", "Lexus LX 470 · $7,000 (example value)")}{line("Cars to compare", "Tesla Model Y, Chevy Bolt, Rivian R2")}{line("Driving", "7,500 miles a year")}', pad=14)
    q = card(f'{label("Two quick questions")}<div style="font:600 14px {SANS};color:{INK};margin-bottom:4px">Is this your first EV?</div><div style="font:400 12.5px {SANS};color:{MUT};margin-bottom:8px">It decides whether a $3,500 California rebate counts.</div><div style="display:flex;gap:8px;margin-bottom:14px">{chip("Yes", True)}{chip("No")}</div><div style="font:600 14px {SANS};color:{INK};margin-bottom:4px">Do you have an offer for the Lexus?</div><div style="font:400 12.5px {SANS};color:{MUT};margin-bottom:8px">Skip it and I will use the example value.</div><div style="display:flex;align-items:center;background:{BG};border:1px solid {LINE};border-radius:10px;padding:0 12px;min-height:48px;font:400 15px {SANS};color:{MUT}">$ amount (optional)</div>', pad=14)
    inner = f'''{wordmark()}{h("Does this look right?", 24)}<div style="margin:12px 0;display:flex;flex-direction:column;gap:12px">{setup}{q}</div>{btn("Looks right, show me")}<div style="text-align:center;margin-top:2px">{link("Change something first")}</div>'''
    return phone('C2 · The analyst proposes a setup', inner)

def screen_c3():
    chips = f'<div style="display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 8px;background:{SURF}">' + ''.join(f'<span style="font:400 12px {SANS};color:{INK};border:1px solid {LINE};border-radius:999px;padding:0 12px;min-height:44px;display:inline-flex;align-items:center;background:{BG}">{t}</span>' for t in ('What if gas hits $8?', 'Add a hybrid')) + '</div>'
    inner = f'''{wordmark("Your answer")}{h("Keeping your Lexus costs least. The Tesla Model Y scores highest overall.", 21)}<div style="margin:12px 0 10px">{verdict_cards()}</div>{change_card()}'''
    return phone('C3 · Answer, refine by asking', inner, chips + ask_dock('Ask or change anything…'))

# ---------------------------------------------------------------- boards
def board(file, title, tag, blurb, screens, w, h_, best, tradeoff):
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{tag}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;family=Source+Serif+4:wght@600&amp;display=swap">
<style>
body{{margin:0}}
a{{color:{ACC}}}a:hover{{color:{INK}}}
</style>
</helmet>
<div style="width:{w}px;height:{h_}px;box-sizing:border-box;padding:40px;background:{SOFT};display:flex;flex-direction:column;gap:24px;font-family:{SANS}">
<div><div style="font:600 12px {SANS};letter-spacing:.08em;text-transform:uppercase;color:{ACC}">{tag}</div>
<h1 style="margin:4px 0 6px;font:600 34px/1.15 {SERIF};color:{INK}">{title}</h1>
<p style="margin:0;max-width:760px;font:400 15px/1.5 {SANS};color:{MUT}">{blurb}</p></div>
<div style="display:flex;gap:32px;align-items:flex-start">{''.join(screens)}</div>
<div style="display:flex;gap:32px;max-width:1100px"><div style="flex:1;font:400 14px/1.5 {SANS};color:{INK}"><b>Best for:</b> {best}</div><div style="flex:1;font:400 14px/1.5 {SANS};color:{INK}"><b>Trade-off:</b> {tradeoff}</div></div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h_}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
    with open(os.path.join(OUT, file), 'w') as f:
        f.write(html)

HB = 1160
board('Main.dc.html', 'A: Single page, cleaned up', 'Option A', 'The same single page, reordered so the situation and the answer come first. Everything else folds away. Sample numbers are the tool’s default scenario.', [screen_a1(), screen_a2()], 900, HB, 'the smallest change and for people who like seeing everything on one page.', 'newcomers still face every control on one long page; about 2 days to build.')
board('OptionB.dc.html', 'B: Guided steps (recommended)', 'Option B', 'Three short questions, then one answer screen you can edit live. “Skip to answer” is always available, and the analyst can fill the steps from one sentence.', [screen_b1(), screen_b2(), screen_b3(), screen_b4()], 1736, HB, 'first-time visitors; it keeps every feature but shows one decision at a time.', 'more build work (about 5 days) and experts need the skip link.')
board('OptionC.dc.html', 'C: Analyst first', 'Option C', 'One box: describe the decision. The analyst proposes the whole setup, you confirm it, and you land on the answer screen with a docked ask bar for follow-ups.', [screen_c1(), screen_c2(), screen_c3()], 1320, HB, 'people who like to type, and the fastest route to a first answer.', 'needs the AI on every visit, so it costs money per visitor and fails when AI is unavailable.')

canvas = {
  "v": 3,
  "createdOnFiles": {"v": 1, "at": "2026-11-02T05:30:00Z"},
  "title": "TBL Scorecard: three UX options",
  "launch": {"view": "canvas"},
  "pages": [],
  "boards": {
    "Main.dc.html": {"x": 0, "y": 0, "w": 900, "h": HB, "title": "Option A: Single page, cleaned up"},
    "OptionB.dc.html": {"x": 1020, "y": 0, "w": 1736, "h": HB, "title": "Option B: Guided steps (recommended)"},
    "OptionC.dc.html": {"x": 2876, "y": 0, "w": 1320, "h": HB, "title": "Option C: Analyst first"}
  },
  "order": ["Main.dc.html", "OptionB.dc.html", "OptionC.dc.html"],
  "notes": {"t1": {"x": 0, "y": -280, "text": "Three ways to simplify the scorecard", "kind": "title1", "maxW": 4196}},
  "designSystems": []
}
with open(os.path.join(OUT, 'canvas.json'), 'w') as f:
    json.dump(canvas, f, indent=1)
print('ok')
