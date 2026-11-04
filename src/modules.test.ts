import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

/**
 * Structural rules from docs/dev-package/03-architecture.md:
 * - core (engine, data, analyst) imports only core
 * - app imports core and app, never ui
 * - ui may import anything below it
 * - no import cycles anywhere
 */
const SRC = resolve(__dirname);
type Layer = 'core' | 'app' | 'ui';
const ORDER: Record<Layer, number> = { core: 0, app: 1, ui: 2 };

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return listTs(p);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts') ? [p] : [];
  });
}

function layerOf(file: string): Layer {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  if (rel.startsWith('app/')) return 'app';
  if (rel.startsWith('ui/') || rel === 'ui.ts' || rel === 'main.ts') return 'ui';
  return 'core';
}

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const out: string[] = [];
  const re = /^\s*(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const base = resolve(dirname(file), m[1]);
    const target = [base + '.ts', join(base, 'index.ts'), base].find((c) => existsSync(c) && statSync(c).isFile());
    if (target) out.push(target);
  }
  return out;
}

const files = listTs(SRC);
const graph = new Map(files.map((f) => [f, importsOf(f)]));
const name = (f: string) => relative(SRC, f).replace(/\\/g, '/');

describe('module smoke test', () => {
  const importable = files.filter((f) => name(f) !== 'main.ts');
  it.each(importable.map((f) => [name(f), f]))('%s imports in Node without a DOM', async (_n, f) => {
    await expect(import(f)).resolves.toBeTypeOf('object');
  });
});

describe('documentation', () => {
  it('every export in src/app and src/ui has a JSDoc comment', () => {
    const missing: string[] = [];
    for (const f of files.filter((x) => /^(app|ui)\//.test(name(x)))) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (/^export (async function|function|const|let|class|interface|type)\s/.test(l) && !/\*\/\s*$/.test(lines[i - 1] ?? '')) missing.push(`${name(f)}:${i + 1}`);
      });
    }
    expect(missing).toEqual([]);
  });
});

describe('module layering', () => {
  it('finds the source modules', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('never imports upward (core -> app -> ui)', () => {
    const bad: string[] = [];
    graph.forEach((deps, f) => {
      for (const d of deps) if (ORDER[layerOf(d)] > ORDER[layerOf(f)]) bad.push(`${name(f)} -> ${name(d)}`);
    });
    expect(bad).toEqual([]);
  });

  it('has no import cycles', () => {
    const state = new Map<string, 'visiting' | 'done'>();
    const cycles: string[] = [];
    const visit = (f: string, stack: string[]) => {
      const s = state.get(f);
      if (s === 'done') return;
      if (s === 'visiting') {
        cycles.push([...stack.slice(stack.indexOf(f)), f].map(name).join(' -> '));
        return;
      }
      state.set(f, 'visiting');
      for (const d of graph.get(f) ?? []) visit(d, [...stack, f]);
      state.set(f, 'done');
    };
    files.forEach((f) => visit(f, []));
    expect(cycles).toEqual([]);
  });
});
