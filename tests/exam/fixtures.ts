import type { BankQuestion, ResponseConfig } from '@/lib/questions/bank';

const base = (over: Partial<BankQuestion> & { item_type: BankQuestion['item_type']; response: ResponseConfig }): BankQuestion => ({
  id: over.source_id ?? 'q', source_id: 'T-01', track: 'rn', set_number: 1, client_need: 'Physiological Adaptation', topic: 't',
  system: 'Cardiovascular', discipline: 'Adult Health', stem: 'Stem', rationale: 'Because.', answer_summary: 'A',
  scoring: 'zero_one', case_id: null, case_sequence: null, clinical_judgment_step: null, status: 'pilot', ...over,
});

export const mc = base({
  source_id: 'T-MC', item_type: 'single_best_answer',
  response: { shuffle: true, options: [
    { id: 'o1', text: 'Alpha', correct: false }, { id: 'o2', text: 'Bravo', correct: true },
    { id: 'o3', text: 'Charlie', correct: false }, { id: 'o4', text: 'Delta', correct: false },
  ] },
});

export const sata = base({
  source_id: 'T-SATA', item_type: 'multiple_response', scoring: 'plus_minus',
  response: { shuffle: true, options: [
    { id: 's1', text: 'One', correct: true }, { id: 's2', text: 'Two', correct: true }, { id: 's3', text: 'Three', correct: false },
    { id: 's4', text: 'Four', correct: true }, { id: 's5', text: 'Five', correct: false }, { id: 's6', text: 'Six', correct: false },
  ] },
});

export const matrix = base({
  source_id: 'T-MX', item_type: 'matrix_grid', scoring: 'zero_one_per_row',
  response: { columns: ['Expected', 'Report'], rows: [
    { id: 'r1', text: 'Row one', correct: 'Expected' }, { id: 'r2', text: 'Row two', correct: 'Report' },
    { id: 'r3', text: 'Row three', correct: 'Report' }, { id: 'r4', text: 'Row four', correct: 'Expected' },
  ] },
});

export const cloze = base({
  source_id: 'T-CZ', item_type: 'drop_down_cloze', scoring: 'zero_one_per_blank',
  response: { template: 'The client has ___1___ caused by ___2___.', blanks: [
    { id: '1', options: ['sepsis', 'dehydration', 'anemia'], correct: 'dehydration' },
    { id: '2', options: ['vomiting', 'bleeding', 'fever'], correct: 'vomiting' },
  ] },
});

export const highlight = base({
  source_id: 'T-HL', item_type: 'highlight', scoring: 'plus_minus',
  response: { segments: [
    { id: 'h1', text: 'HR 128', correct: true }, { id: 'h2', text: 'BP 84/50', correct: true },
    { id: 'h3', text: 'T 98.6', correct: false }, { id: 'h4', text: 'SpO2 97%', correct: false }, { id: 'h5', text: 'Cool skin', correct: true },
  ] },
});

export const bowtie = base({
  source_id: 'T-BT', item_type: 'bow_tie', scoring: 'zero_one_per_selection',
  response: { groups: [
    { id: 'condition', label: 'Condition (choose 1)', pick: 1, options: [
      { id: 'c1', text: 'Shock', correct: true }, { id: 'c2', text: 'Anxiety', correct: false }, { id: 'c3', text: 'Sepsis', correct: false },
    ] },
    { id: 'actions', label: 'Actions (choose 2)', pick: 2, options: [
      { id: 'a1', text: 'Call for help', correct: true }, { id: 'a2', text: 'Lie flat', correct: true },
      { id: 'a3', text: 'Walk', correct: false }, { id: 'a4', text: 'Give water', correct: false },
    ] },
    { id: 'monitor', label: 'Monitor (choose 2)', pick: 2, options: [
      { id: 'm1', text: 'Heart rate', correct: true }, { id: 'm2', text: 'Level of consciousness', correct: true },
      { id: 'm3', text: 'Bowel sounds', correct: false }, { id: 'm4', text: 'Hearing', correct: false },
    ] },
  ] },
});

export const allTypes = [mc, sata, matrix, cloze, highlight, bowtie];
