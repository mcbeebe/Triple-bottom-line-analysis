"""Simplified blend: one chat thread. The guided steps are quick-reply buttons inside the conversation,
so there is a single place to look and one thing to do at a time. Typing works at any point."""
import build as b

SANS, SERIF, INK, MUT, LINE, ACC, SURF, BG, SOFT, TINT = b.SANS, b.SERIF, b.INK, b.MUT, b.LINE, b.ACC, b.SURF, b.BG, b.SOFT, b.TINT

def header(right):
    return f'<div style="display:flex;justify-content:space-between;align-items:center;min-height:44px;margin-bottom:6px"><span style="font:600 13px {SANS};color:{ACC}">TBL Scorecard</span><span style="font:600 12px {SANS};color:{MUT}">{right}</span></div>'

def analyst(text):
    return f'<div style="align-self:flex-start;max-width:90%;background:{SURF};border:1px solid {LINE};border-radius:16px 16px 16px 4px;padding:12px 14px;font:400 15px/1.45 {SANS};color:{INK}">{text}</div>'

def user(text):
    return f'<div style="align-self:flex-end;max-width:88%;background:{ACC};color:#fff;border-radius:16px 16px 4px 16px;padding:12px 14px;font:400 15px/1.45 {SANS}">{text}</div>'

def replies(items, sub=None):
    out = ''
    for i, t in enumerate(items):
        s = f'<span style="display:block;font:400 12px {SANS};color:{MUT};margin-top:1px">{sub[i]}</span>' if sub and sub[i] else ''
        out += f'<button style="display:block;width:100%;text-align:left;background:transparent;border:1.5px solid {ACC};border-radius:12px;padding:10px 14px;min-height:48px;font:600 14.5px {SANS};color:{ACC}">{t}{s}</button>'
    return f'<div style="display:flex;flex-direction:column;gap:8px">{out}</div>'

def dock(placeholder='Or tell me in your own words…'):
    return f'<div style="border-top:1px solid {LINE};background:{SURF};padding:10px 14px;display:flex;gap:8px;align-items:center"><div style="flex:1;font:400 14px {SANS};color:{MUT};background:{BG};border:1px solid {LINE};border-radius:999px;padding:0 16px;min-height:44px;display:flex;align-items:center">{placeholder}</div><button aria-label="Send" style="width:44px;height:44px;border-radius:50%;background:{ACC};color:#fff;border:0;font:600 18px {SANS}">↑</button></div>'

def thread(inner):
    return f'<div style="display:flex;flex-direction:column;gap:12px">{inner}</div>'

def screen_e1():
    inner = header('Skip to answer') + thread(analyst('Hi! I’ll help you decide whether to replace your car. What are you deciding?') + replies(['Sell my car, then buy', 'Trade my car in', 'Just buy'], ['Sell it yourself and put the money toward the next car', 'A dealer takes it off the price', 'No car to sell, or I’m keeping mine']) + f'<div style="font:400 12.5px/1.4 {SANS};color:{MUT};padding:2px 4px">Tap an answer, or type it in your own words below.</div>')
    return b.phone('E1 · Start: one question, tap or type', inner, dock())

def screen_e2():
    inner = header('Question 2 of 4') + thread(user('Sell my car, then buy') + analyst('Got it. What car do you have now?') + replies(['Lexus LX 470 (example)', 'Older sedan', 'Older SUV', 'Older hybrid', 'Something else']))
    return b.phone('E2 · Next question, same thread', inner, dock())

def screen_e3():
    summary = f'<div style="background:{SURF};border:1px solid {LINE};border-radius:14px;padding:12px 14px;max-width:100%"><div style="font:600 11px {SANS};letter-spacing:.06em;text-transform:uppercase;color:{MUT};margin-bottom:6px">What I understood</div>' + ''.join(f'<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px dashed {LINE};font:400 14px {SANS};color:{INK}"><span><span style="color:{MUT}">{k}</span> {v}</span></div>' for k, v in (('Decision', '<b>Sell, then buy</b>'), ('Your car', '<b>Lexus LX 470</b>, about $7,000'), ('Driving', '<b>7,500</b> miles a year'), ('Compare', '<b>Tesla, Bolt, Rivian</b>'))) + f'<div style="padding-top:4px">{b.link("Change something")}</div></div>'
    inner = header('1 of 3 questions') + thread(user('I’m deciding whether to sell my 1999 Lexus LX 470 and get an EV. I drive about 7,500 miles a year and live in Oakland.') + analyst('Thanks, that’s enough to start.') + summary + analyst('One thing would change the cost: is this your first EV? It decides whether a $3,500 California rebate counts.') + replies(['Yes, my first', 'No, I’ve had one']) + f'<div style="text-align:center">{b.link("Skip and use defaults")}</div>')
    return b.phone('E3 · Typed instead: confirm, then ask', inner, dock('Add detail or change anything…'))

def screen_e4():
    def card(name, tag, score, cost, co2, top=False):
        bd, bg, w = (ACC, TINT, 2) if top else (LINE, SURF, 1)
        return f'<div style="background:{bg};border:{w}px solid {bd};border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div style="font:600 15px {SANS};color:{INK}">{name}</div><div style="font:400 12.5px {SANS};color:{MUT};margin-top:2px">{tag}</div><div style="font:600 13.5px {SANS};color:{INK};margin-top:6px">{cost} · {co2}</div></div><div style="text-align:right;flex:none"><span style="font:600 30px {SERIF};color:{INK}">{score}</span><span style="font:400 12px {SANS};color:{MUT}">/100</span></div></div>'
    cards = card('Tesla Model Y (loan)', 'Highest overall score', 57, '$59,400', '37 t CO2e', True) + card('Chevy Bolt (loan)', 'Lowest carbon', 53, '$41,600', '36 t CO2e') + card('Keep your Lexus', 'Lowest cost', 50, '$34,700', '54 t CO2e')
    inner = header('Your answer') + f'<h2 style="margin:4px 0 4px;font:600 22px/1.2 {SERIF};color:{INK}">Keeping your Lexus costs least. The Tesla Model Y scores highest overall.</h2><div style="font:400 12.5px {SANS};color:{MUT};margin-bottom:12px">Sell, then buy · 7,500 miles a year · 8 years, in today’s dollars</div><div style="display:flex;flex-direction:column;gap:10px">{cards}</div><div style="margin-top:12px;font:400 13.5px/1.45 {SANS};color:{INK};background:{SURF};border:1px solid {LINE};border-radius:12px;padding:10px 14px">Gas above <b>$7.21 a gallon</b> makes the Bolt cost less than keeping the Lexus.</div><div style="display:flex;gap:8px;margin-top:10px"><button style="flex:1;font:600 13px {SANS};background:{SURF};color:{INK};border:1px solid {LINE};border-radius:10px;min-height:44px">Why this result</button><button style="flex:1;font:600 13px {SANS};background:{SURF};color:{INK};border:1px solid {LINE};border-radius:10px;min-height:44px">Fine-tune</button></div>'
    return b.phone('E4 · Answer: three cards, one next step', inner, dock('Ask or change anything…'))
