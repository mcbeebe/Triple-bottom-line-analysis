import { describe, expect, it } from 'vitest';
import { freshState } from '../../app/state';
import { PUBLIC_DEFAULTS, applyScenario } from '../../app/scenario';
import { addCustomCar, selectCarPreset, setPath, togglePick } from '../../app/mutations';
import { decisionHtml } from './decision';
import { drivingHtml } from './driving';
import { carsHtml, countText, newAddCarForm } from './cars';

const fresh = () => applyScenario(freshState(), PUBLIC_DEFAULTS);
const count = (h: string, s: string) => h.split(s).length - 1;

describe('Step 1 renderer', () => {
  it('shows the three spec options with nothing pressed until a path is chosen', () => {
    const s = fresh();
    const h = decisionHtml(s);
    expect(h).toContain('What are you deciding?');
    expect(h).toContain('Pick the closest one. You can change it later.');
    expect(count(h, '<button type="button" class="ds-option')).toBe(3);
    expect(h).not.toContain('aria-pressed="true"');
    expect(h).not.toContain('Not sure');
    setPath(s, 'trade');
    expect(decisionHtml(s)).toMatch(/aria-pressed="true" data-act="st-path" data-val="trade"/);
  });
  it('adds "Not sure? Describe it in a sentence" only when the analyst is available, outside the choice group', () => {
    const s = fresh();
    expect(decisionHtml(s, false)).not.toContain('data-act="ai-open"');
    const h = decisionHtml(s, true);
    expect(count(h, 'data-act="ai-open"')).toBe(1);
    expect(h).toContain('Not sure? Describe it in a sentence');
    expect(h).toMatch(/id="st-ai" aria-haspopup="dialog"/);
    const group = h.slice(h.indexOf('role="group"'), h.indexOf('</div>', h.indexOf('role="group"')));
    expect(group).not.toContain('ai-open');
    expect(h.indexOf('ai-open')).toBeLessThan(h.indexOf('st-back'));
  });
});

describe('Step 2 renderer', () => {
  it('labels assumed values Placeholder and orders the presets sedan first, Lexus example, then Something else', () => {
    const h = drivingHtml(fresh());
    expect(h).toContain('Your car and your driving');
    expect(count(h, 'ds-status-ph">Placeholder')).toBe(2);
    const order = [...h.matchAll(/data-act="st-preset" data-val="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['sedan', 'suv', 'hybrid', 'lexus', 'custom']);
    expect(h).toContain('value="9,000"');
    expect(h).toContain('Not sure of a number? Leave it.');
  });

  it('shows Source with a link for the Lexus example and Your number after an edit', () => {
    const s = fresh();
    selectCarPreset(s, 'lexus');
    expect(drivingHtml(s)).toMatch(/<a class="ds-status ds-status-src" href="https:\/\//);
    s.vehicles.find((v) => v.owned)!.price = 8000;
    expect(drivingHtml(s)).toContain('id="st-value-status"><span class="ds-status ds-status-yours">Your number');
  });

  it('asks for the trade-in offer on the trade path and calls the discount a placeholder (P4)', () => {
    const s = fresh();
    setPath(s, 'trade');
    const h = drivingHtml(s);
    expect(h).toContain('>Trade-in offer</label>');
    expect(h).toContain('value="7,650"');
    expect(h).toContain('Placeholder: dealers usually offer about 15% less than a private buyer.');
  });

  it('shows miles only on the just-buy path (P9)', () => {
    const s = fresh();
    setPath(s, 'none');
    const h = drivingHtml(s);
    expect(h).toContain('Your driving');
    expect(h).toContain('Miles change fuel and charging costs.');
    expect(h).not.toContain('st-value');
    expect(h).toContain('type="range" id="st-miles"');
  });

  it('opens name, mpg, repair cost and insurance for Something else, and escapes the name', () => {
    const s = fresh();
    selectCarPreset(s, 'custom');
    s.vehicles.find((v) => v.owned)!.short = '<b>x</b>';
    const h = drivingHtml(s);
    expect(h).toContain('id="st-car-name"');
    expect(h).toContain('value="&lt;b&gt;x&lt;/b&gt;"');
    expect(['st-mpg', 'st-maint', 'st-ins'].every((id) => h.includes(`id="${id}"`))).toBe(true);
    expect(count(h, 'id="st-value"')).toBe(1);
  });
});

describe('Step 3 renderer', () => {
  it('groups real checkboxes with legends, marks loan-only cars and states the count', () => {
    const h = carsHtml(fresh(), newAddCarForm());
    expect([...h.matchAll(/<legend>(\w[\w ]*)<\/legend>/g)].map((m) => m[1])).toEqual(['Electric', 'Hybrid', 'Gas']);
    expect(h).toContain('<p class="ds-count" id="st-count" role="status">3 of up to 4 chosen.</p>');
    expect(h).toMatch(/id="st-pick-corolla" value="corolla"[^>]* checked>/);
    expect(h).toContain('$24,620 · Loan only');
  });

  it('disables the rest, the add button and nothing else at the limit', () => {
    const s = fresh();
    togglePick(s, 'tesla');
    const h = carsHtml(s, newAddCarForm());
    expect(h).toMatch(/id="st-pick-rivian"[^>]*aria-describedby="st-pick-rivian-detail st-count" disabled>/);
    expect(h).toMatch(/id="st-addopen" data-act="st-addopen" aria-describedby="st-count" disabled>/);
    expect(h).not.toMatch(/id="st-show"[^>]*disabled/);
    expect(countText(s)).toBe('4 of 4 chosen. Pick up to 4. Uncheck one first.');
  });

  it('disables Show my answer and Skip with the reason when no car is chosen (P7)', () => {
    const s = fresh();
    s.selected = [];
    const h = carsHtml(s, newAddCarForm());
    expect(h).toMatch(/id="st-show" data-act="st-answer" aria-describedby="st-count" disabled>/);
    expect(h).toMatch(/data-act="st-skip" aria-describedby="st-count" disabled>/);
    expect(countText(s)).toBe('No cars chosen. Pick at least one car to compare.');
  });

  it('lists your own cars with a Remove button named for the car, escaping the name', () => {
    const s = fresh();
    s.selected = [];
    addCustomCar(s, { kind: 'ev', name: 'A<b>' });
    const h = carsHtml(s, newAddCarForm());
    expect(h).toContain('<legend>Your own</legend>');
    expect(h).toContain('aria-label="Remove A&lt;b&gt;"');
    expect(h).not.toContain('A<b>');
  });

  it('renders the add-car form with radios and the efficiency field for the kind', () => {
    const ev = carsHtml(fresh(), newAddCarForm('ev', true));
    expect(ev).toContain('<form class="ds-subform" id="st-addcar" novalidate>');
    expect(count(ev, 'type="radio" name="st-kind"')).toBe(3);
    expect(ev).toContain('Electricity used per 100 miles');
    expect(carsHtml(fresh(), newAddCarForm('ice', true))).toContain('>Fuel economy</label>');
  });
});
