// Content revisions: data/bank/revisions/*.json applied in filename order on top of the
// source bank. Each file maps source_id -> { option_key: new_text }; keys starting with "_"
// are comments. Only distractor text may change. Shared by build.mjs and check-revisions.mjs.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

export const BANK_DIR = new URL('../../data/bank/', import.meta.url);
export const REVISIONS_DIR = new URL('revisions/', BANK_DIR);
export const RETAGS_DIR = new URL('retags/', BANK_DIR);
export const BANK_FILES = ['nurseprepiq_rn_bank.json', 'nurseprepiq_pn_bank.json'];

// Client needs from the 2023 NCSBN test plans. PN uses "Coordinated Care", never "Management of Care".
export const CLIENT_NEEDS = {
  rn: ['Management of Care', 'Safety and Infection Control', 'Health Promotion and Maintenance', 'Psychosocial Integrity', 'Basic Care and Comfort', 'Pharmacological and Parenteral Therapies', 'Reduction of Risk Potential', 'Physiological Adaptation'],
  pn: ['Coordinated Care', 'Safety and Infection Control', 'Health Promotion and Maintenance', 'Psychosocial Integrity', 'Basic Care and Comfort', 'Pharmacological Therapies', 'Reduction of Risk Potential', 'Physiological Adaptation'],
};
// Target share of each track's items (percent), same order as CLIENT_NEEDS.
export const NEED_TARGETS = {
  rn: [[15, 21], [10, 16], [6, 12], [6, 12], [6, 12], [13, 19], [9, 15], [11, 17]],
  pn: [[18, 24], [10, 16], [6, 12], [9, 15], [7, 13], [10, 16], [9, 15], [7, 13]],
};

export const loadBanks = () => BANK_FILES.map(file => JSON.parse(readFileSync(new URL(file, BANK_DIR), 'utf8')));

export const revisionFiles = () =>
  existsSync(REVISIONS_DIR) ? readdirSync(REVISIONS_DIR).filter(f => /^content_revisions_.*\.json$/.test(f)).sort() : [];

// Sets a revision file declares it covers, from its name: ..._set01.json, ..._sets04-05.json
export function setsCovered(file) {
  const m = file.match(/_sets?(\d+)(?:-(\d+))?\.json$/);
  if (!m) return [];
  const from = Number(m[1]), to = Number(m[2] ?? m[1]);
  return Array.from({ length: to - from + 1 }, (_, n) => from + n);
}

const norm = s => s.trim().replace(/\s+/g, ' ').toLowerCase();

// Mutates the option text in `banks`. Returns the changes and any errors (callers decide
// whether to stop). An error never leaves a half-applied option behind.
export function applyRevisions(banks) {
  const byId = new Map(banks.flatMap(b => b.questions).map(q => [q.source_id, q]));
  const errors = [], revised = new Map(), files = revisionFiles();
  for (const file of files) {
    const revisions = JSON.parse(readFileSync(new URL(file, REVISIONS_DIR), 'utf8'));
    for (const [sourceId, changes] of Object.entries(revisions)) {
      if (sourceId.startsWith('_')) continue;
      const q = byId.get(sourceId);
      if (!q) { errors.push(`${file}: unknown source_id ${sourceId}`); continue; }
      if (!Array.isArray(q.options)) { errors.push(`${file}: ${sourceId} is a ${q.item_type} item with no options`); continue; }
      for (const [key, text] of Object.entries(changes)) {
        const option = q.options.find(o => o.key === key);
        if (!option) { errors.push(`${file}: ${sourceId} has no option ${key}`); continue; }
        if (option.is_correct) { errors.push(`${file}: ${sourceId} option ${key} is a correct answer; revisions may only change distractors`); continue; }
        if (typeof text !== 'string' || !text.trim()) { errors.push(`${file}: ${sourceId} option ${key} has empty text`); continue; }
        if (option.text === text) continue;
        revised.set(sourceId, [...(revised.get(sourceId) || []), { file, key, from: option.text, to: text }]);
        option.text = text;
      }
    }
  }
  // A rewrite must not collide with another option of the same question.
  for (const id of revised.keys()) {
    const q = byId.get(id), seen = new Map();
    for (const o of q.options) {
      const k = norm(o.text);
      if (seen.has(k)) errors.push(`${id}: options ${seen.get(k)} and ${o.key} are identical after revisions`);
      seen.set(k, o.key);
    }
  }
  return { files, revised, errors };
}

// Client-need re-tags: data/bank/retags/retags_NN.json, applied in filename order after content
// revisions. Each file maps source_id -> { client_need, reason }; keys starting with "_" are comments.
export const retagFiles = () =>
  existsSync(RETAGS_DIR) ? readdirSync(RETAGS_DIR).filter(f => /^retags_\d+\.json$/.test(f)).sort() : [];

// Mutates client_need in `banks`. Returns the re-tags applied and any errors.
export function applyRetags(banks) {
  const byId = new Map(banks.flatMap(b => b.questions).map(q => [q.source_id, q]));
  const errors = [], retagged = new Map(), files = retagFiles();
  for (const file of files) {
    const retags = JSON.parse(readFileSync(new URL(file, RETAGS_DIR), 'utf8'));
    for (const [sourceId, tag] of Object.entries(retags)) {
      if (sourceId.startsWith('_')) continue;
      const q = byId.get(sourceId);
      if (!q) { errors.push(`${file}: unknown source_id ${sourceId}`); continue; }
      if (!CLIENT_NEEDS[q.track]?.includes(tag?.client_need)) { errors.push(`${file}: ${sourceId} "${tag?.client_need}" is not a ${q.track.toUpperCase()} client need`); continue; }
      if (typeof tag.reason !== 'string' || !tag.reason.trim()) { errors.push(`${file}: ${sourceId} needs a reason`); continue; }
      if (tag.client_need === q.client_need) { errors.push(`${file}: ${sourceId} is already tagged ${q.client_need}`); continue; }
      retagged.set(sourceId, { file, from: q.client_need, to: tag.client_need, reason: tag.reason });
      q.client_need = tag.client_need;
    }
  }
  return { files, retagged, errors };
}
