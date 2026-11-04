import type { Disposal } from '../../engine';
import { GLOBAL_META } from '../../data';
import { addCustomCar, canAddCar, priceFromOffer, removeCustomCar, selectCarPreset, setPath, togglePick } from '../../app/mutations';
import { state } from '../../app/state';
import { canShowAnswer } from '../../app/steps';
import type { DsNumberDetail } from '../components/field';
import { dsStatusLabel } from '../components/statusLabel';
import { countText, newAddCarForm } from './cars';
import { globalStatus, ownedStatus } from './status';
import { addCarForm, currentRoute, goBack, navigate, renderStep } from './router';

const owned = () => state.vehicles.find((v) => v.owned);

/** Update Step 3 in place after a pick, so focus and the live status line are kept (no re-render). */
function patchCars(announce?: string): void {
  const room = canAddCar(state);
  const ok = canShowAnswer(state);
  const count = document.getElementById('st-count');
  if (count) count.textContent = announce ? `${announce} ${countText(state)}` : countText(state);
  document.querySelectorAll<HTMLInputElement>('input[data-act="st-pick"]').forEach((box) => {
    const on = state.selected.includes(box.value);
    box.checked = on;
    box.closest('.ds-check')?.classList.toggle('ds-check-on', on);
    const off = !on && !room;
    box.disabled = off;
    box.setAttribute('aria-describedby', off ? `${box.id}-detail st-count` : `${box.id}-detail`);
  });
  const setDisabled = (b: HTMLButtonElement | null, disabled: boolean) => {
    if (!b) return;
    b.disabled = disabled;
    if (disabled) b.setAttribute('aria-describedby', 'st-count');
    else b.removeAttribute('aria-describedby');
  };
  setDisabled(document.querySelector<HTMLButtonElement>('#st-addopen'), !room);
  setDisabled(document.querySelector<HTMLButtonElement>('#st-show'), !ok);
  setDisabled(document.querySelector<HTMLButtonElement>('#steps [data-act="st-skip"]'), !ok);
}

function setStatus(slot: string, html: string): void {
  const el = document.getElementById(slot);
  if (el) el.innerHTML = html;
}

function onNumber(d: DsNumberDetail): void {
  const v = owned() as unknown as Record<string, number> | undefined;
  const clampOwned = (key: string, x: number) => {
    const m = state.meta.lx[key];
    return Math.min(m.max, Math.max(m.min, x));
  };
  switch (d.name) {
    case 'g.milesPerYear':
      state.g.milesPerYear = Math.min(GLOBAL_META.milesPerYear.max, Math.max(GLOBAL_META.milesPerYear.min, d.value));
      setStatus('st-miles-status', dsStatusLabel(globalStatus(state, 'milesPerYear', GLOBAL_META.milesPerYear)));
      return;
    case 'owned.price':
    case 'owned.offer':
      if (!v) return;
      v.price = clampOwned('price', d.name === 'owned.offer' ? priceFromOffer(d.value, state.g.tradeInDiscount) : d.value);
      setStatus('st-value-status', dsStatusLabel(ownedStatus(state, 'price')));
      return;
    case 'owned.mpg':
    case 'owned.maintPerMile':
    case 'owned.insurancePerYear': {
      if (!v) return;
      const key = d.name.slice(6);
      v[key] = clampOwned(key, d.value);
      setStatus({ mpg: 'st-mpg-status', maintPerMile: 'st-maint-status', insurancePerYear: 'st-ins-status' }[key] as string, dsStatusLabel(ownedStatus(state, key)));
      return;
    }
    case 'new.price':
      addCarForm.value.price = d.value;
      return;
    case 'new.efficiency':
      addCarForm.value.efficiency = d.value;
      return;
  }
}

function onClick(el: HTMLElement): void {
  const act = el.dataset.act;
  const val = el.dataset.val ?? '';
  switch (act) {
    case 'st-path':
      setPath(state, val as Disposal);
      navigate('step-2');
      return;
    case 'st-back':
      goBack();
      return;
    case 'st-next':
      navigate('step-3');
      return;
    case 'st-skip':
    case 'st-answer':
      if (canShowAnswer(state)) navigate('answer');
      return;
    case 'st-toanswer':
      navigate('answer');
      return;
    case 'st-edit':
      navigate(state.pathChosen ? 'step-3' : 'step-1');
      return;
    case 'st-preset':
      if (state.carPreset !== val) {
        selectCarPreset(state, val);
        renderStep(`[data-act="st-preset"][data-val="${val}"]`);
      }
      return;
    case 'st-addopen':
      if (!canAddCar(state)) return;
      addCarForm.value = newAddCarForm(addCarForm.value.kind, true);
      renderStep('#st-new-name');
      return;
    case 'st-cancel':
      addCarForm.value = newAddCarForm(addCarForm.value.kind, false);
      renderStep('#st-addopen');
      return;
    case 'st-remove': {
      const rows = [...document.querySelectorAll<HTMLInputElement>('input[data-act="st-pick"]')];
      const i = rows.findIndex((r) => r.value === val);
      const next = rows[i + 1]?.closest('.ds-check-wrap') ? rows[i + 1].id : '';
      const name = state.vehicles.find((x) => x.id === val)?.short ?? 'the car';
      removeCustomCar(state, val);
      renderStep(next ? `#${next}` : '#st-addopen');
      patchCars(`Removed ${name}.`);
      return;
    }
  }
}

let bound = false;

/** Install the step listeners once: clicks on st-* actions, checkbox and radio changes, typed names, number commits and the add-car form. */
export function bindStepActions(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="st-"]');
    if (!el || el instanceof HTMLInputElement) return;
    onClick(el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement)) return;
    if (el.dataset.act === 'st-pick') {
      if (togglePick(state, el.value) === 'limit') el.checked = false;
      patchCars();
    } else if (el.dataset.act === 'st-kind') {
      const name = addCarForm.value.name;
      addCarForm.value = { ...newAddCarForm(el.value as 'ev' | 'hybrid' | 'ice', true), name };
      renderStep(`input[data-act="st-kind"][value="${el.value}"]`);
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (!(el instanceof HTMLInputElement) || el.dataset.stName === undefined) return;
    if (el.dataset.stName === 'new') addCarForm.value.name = el.value;
    else {
      const v = owned();
      if (v) {
        const name = el.value.trim() || 'My car';
        v.name = name;
        v.short = name;
      }
    }
  });
  document.addEventListener('ds:number', (e) => {
    if (currentRoute() === 'step-2' || currentRoute() === 'step-3') onNumber((e as CustomEvent<DsNumberDetail>).detail);
  });
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (form.id !== 'st-addcar') return;
    e.preventDefault();
    const f = addCarForm.value;
    const id = addCustomCar(state, { kind: f.kind, name: f.name.trim() || undefined, price: f.price, efficiency: f.efficiency });
    if (!id) {
      patchCars();
      return;
    }
    const name = state.vehicles.find((v) => v.id === id)?.short ?? 'your car';
    addCarForm.value = newAddCarForm(f.kind, false);
    renderStep(`#st-pick-${id}`);
    patchCars(`Added ${name}.`);
  });
}
