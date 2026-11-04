import { describe, expect, it } from 'vitest';
import { checkNumberText, decimalsOf, formatNumberText, numberMessage, parseNumberText } from './numberText';

describe('parseNumberText', () => {
  it.each([
    ['7000', 7000],
    ['7,000', 7000],
    ['$7,000', 7000],
    ['  $7,000  ', 7000],
    ['150,000', 150000],
    ['1,234,567', 1234567],
    ['-500', -500],
    ['4.85', 4.85],
    ['$7,000.50', 7000.5]
  ])('reads %s as %d', (text, value) => {
    expect(parseNumberText(text, true)).toEqual({ kind: 'ok', value });
  });

  it.each(['7k', 'abc', '1.2.3', '7,00', '70,00', '1,2345', '$', '-', '.5.', '4,85', '1 000', '7000$', '++7'])('rejects %s', (text) => {
    expect(parseNumberText(text, true).kind).toBe('invalid');
  });

  it('treats blank text as empty, not as zero', () => {
    expect(parseNumberText('', true)).toEqual({ kind: 'empty' });
    expect(parseNumberText('   ', false)).toEqual({ kind: 'empty' });
  });

  it('rejects decimals where the field takes whole numbers only', () => {
    expect(parseNumberText('7000.5', false).kind).toBe('invalid');
    expect(parseNumberText('7,000', false)).toEqual({ kind: 'ok', value: 7000 });
  });
});

describe('formatNumberText and decimalsOf', () => {
  it('adds thousands separators and the step precision', () => {
    expect(formatNumberText(7000, 0)).toBe('7,000');
    expect(formatNumberText(1234567, 0)).toBe('1,234,567');
    expect(formatNumberText(4.85, 2)).toBe('4.85');
    expect(formatNumberText(7000.5, 2)).toBe('7,000.50');
    expect(formatNumberText(0.09, 2)).toBe('0.09');
  });

  it('derives decimals from the step', () => {
    expect(decimalsOf(500)).toBe(0);
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.05)).toBe(2);
    expect(decimalsOf(0.01)).toBe(2);
    expect(decimalsOf(0.001)).toBe(3);
  });
});

describe('checkNumberText', () => {
  const r = { min: 1000, max: 150000, step: 250 };
  it('accepts values in range', () => {
    expect(checkNumberText('9,000', r)).toEqual({ kind: 'ok', value: 9000 });
  });
  it('flags values below and above the range with the clamped value', () => {
    expect(checkNumberText('-500', r)).toEqual({ kind: 'low', value: -500, clamped: 1000 });
    expect(checkNumberText('999,999', r)).toEqual({ kind: 'high', value: 999999, clamped: 150000 });
  });
  it('passes empty and invalid through', () => {
    expect(checkNumberText('', r).kind).toBe('empty');
    expect(checkNumberText('7k', r).kind).toBe('invalid');
  });
});

describe('numberMessage', () => {
  const money = { min: 1000, max: 150000, step: 250, money: true, example: 9000 };
  const miles = { min: 1000, max: 25000, step: 500, unit: 'miles', example: 7500 };
  it('explains invalid text with the range and an example', () => {
    expect(numberMessage({ kind: 'invalid' }, money)).toBe('Enter an amount from $1,000 to $150,000, like 9,000.');
    expect(numberMessage({ kind: 'invalid' }, miles)).toBe('Enter a number from 1,000 to 25,000 miles, like 7,500.');
  });
  it('says what a clamped value was changed to', () => {
    expect(numberMessage({ kind: 'low', value: -5, clamped: 1000 }, money)).toBe('Changed to $1,000, the lowest allowed.');
    expect(numberMessage({ kind: 'high', value: 9e9, clamped: 25000 }, miles)).toBe('Changed to 25,000 miles, the highest allowed.');
  });
  it('is silent for valid and empty text', () => {
    expect(numberMessage({ kind: 'ok', value: 9000 }, money)).toBe('');
    expect(numberMessage({ kind: 'empty' }, money)).toBe('');
  });
});
