import { describe, expect, it } from 'vitest';
import { isEmptyResponse, sanitizeResponse } from '@/lib/exam/response';
import { bowtie, cloze, highlight, matrix, mc, sata } from './fixtures';

describe('sanitizing exam responses', () => {
  it('single best answer keeps exactly one known option, or none', () => {
    expect(sanitizeResponse(mc, { selected: ['o2'] })).toEqual({ selected: ['o2'] });
    expect(sanitizeResponse(mc, { selected: ['o1', 'o2'] })).toEqual({ selected: [] });
    expect(sanitizeResponse(mc, { selected: ['zzz'] })).toEqual({ selected: [] });
    expect(sanitizeResponse(mc, 'nonsense')).toEqual({ selected: [] });
  });
  it('SATA drops duplicates and unknown ids', () => {
    expect(sanitizeResponse(sata, { selected: ['s1', 's1', 'o2', 's4'] })).toEqual({ selected: ['s1', 's4'] });
  });
  it('matrix keeps only known rows answered with known columns', () => {
    expect(sanitizeResponse(matrix, { matrix: { r1: 'Expected', r9: 'Report', r2: 'Maybe' } })).toEqual({ matrix: { r1: 'Expected' } });
  });
  it('cloze keeps only options offered for each blank', () => {
    expect(sanitizeResponse(cloze, { blanks: { '1': 'dehydration', '2': 'made up' } })).toEqual({ blanks: { '1': 'dehydration' } });
  });
  it('highlight keeps known segments', () => {
    expect(sanitizeResponse(highlight, { highlights: ['h1', 'h9', 'h1'] })).toEqual({ highlights: ['h1'] });
  });
  it('bow-tie keeps at most the allowed number of picks per group', () => {
    expect(sanitizeResponse(bowtie, { groups: { actions: ['a1', 'a2', 'a3', 'a4'], condition: ['c1', 'c2'] } }).groups)
      .toEqual({ condition: ['c1'], actions: ['a1', 'a2'], monitor: [] });
  });
  it('detects empty answers for every item type', () => {
    for (const q of [mc, sata, matrix, cloze, highlight, bowtie]) expect(isEmptyResponse(sanitizeResponse(q, {}))).toBe(true);
    expect(isEmptyResponse({ selected: ['o1'] })).toBe(false);
    expect(isEmptyResponse({ blanks: { '1': 'sepsis' } })).toBe(false);
    expect(isEmptyResponse({ groups: { condition: ['c1'] } })).toBe(false);
  });
});
