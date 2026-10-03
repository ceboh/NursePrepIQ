// Derives body system and discipline for every bank item.
// Sets 1-11 take the system from the set title; everything else is classified by
// keyword over topic (weighted x3) and stem. Reviewed via data/bank/taxonomy_review.csv.

export const SYSTEMS = ['Cardiovascular', 'Respiratory', 'Neurologic', 'Renal & Urinary', 'Endocrine', 'Gastrointestinal', 'Musculoskeletal', 'Hematologic', 'Immune', 'Integumentary', 'Sensory', 'Reproductive', 'Fluids & Electrolytes', 'Integrated'];
export const DISCIPLINES = ['Adult Health', 'Fundamentals', 'Pharmacology', 'Mental Health', 'Maternal & Newborn', 'Pediatrics', 'Management of Care', 'Safety & Infection Control', 'NGN Clinical Judgment'];

const SET_SYSTEM = {
  1: 'Cardiovascular', 2: 'Respiratory', 3: 'Neurologic', 4: 'Endocrine', 5: 'Renal & Urinary',
  6: 'Gastrointestinal', 7: 'Musculoskeletal', 8: 'Hematologic', 9: 'Immune', 10: 'Integumentary',
  11: 'Fluids & Electrolytes',
};
const SET_DISCIPLINE = { 12: 'Maternal & Newborn', 13: 'Pediatrics', 14: 'Mental Health', 15: 'Pharmacology', 16: 'Management of Care', 17: 'Safety & Infection Control' };

const KEYWORDS = {
  'Cardiovascular': ['heart', 'cardiac', 'cardio', 'myocardial', 'angina', 'coronary', 'atrial', 'ventricular', 'dysrhythm', 'arrhythm', 'hypertens', 'blood pressure', 'aortic', 'aneurysm', 'pericard', 'endocarditis', 'digoxin', 'nitroglycerin', 'statin', 'ace inhibitor', 'beta blocker', 'beta-blocker', 'amiodarone', 'adenosine', 'pacemaker', 'torsades', 'sacubitril', 'valsartan', 'carotid', 'mean arterial', 'ivc filter', 'thrombectomy', 'pulse pressure', 'pedal pulse', 'telemetry', 'ecg', 'ekg', 'stemi', 'peripheral arter', 'peripheral vascular', 'venous', 'varicose', 'dvt', 'deep vein', 'thrombophlebitis', 'raynaud', 'cpr', 'cardiac arrest', 'aed', 'cholesterol', 'lipid', 'bnp', 'troponin', 'shock', 'ankle-brachial', 'claudication', 'vasopressor', 'kawasaki', 'tetralogy', 'congenital heart', 'murmur', 'endarterectomy', 'cabg', 'bypass graft', 'antihypertens', 'orthostatic'],
  'Respiratory': ['respirat', 'lung', 'ards', 'nasal cannula', 'nonrebreather', 'hypoxia', 'pulmonary', 'asthma', 'copd', 'pneumon', 'bronch', 'oxygen', 'airway', 'ventilat', 'intubat', 'tracheost', 'chest tube', 'pneumothorax', 'tuberculosis', 'tb', 'cystic fibrosis', 'inhaler', 'spirometer', 'spirometry', 'croup', 'epiglottitis', 'rsv', 'pleural', 'dyspnea', 'pulse oximetry', 'spo2', 'abg', 'arterial blood gas', 'suction', 'influenza', 'sleep apnea', 'cpap', 'nebuliz', 'wheez', 'emphysema', 'thoracentesis', 'apnea', 'laryng', 'aspiration', 'choking', 'pertussis', 'bronchiolitis'],
  'Neurologic': ['neuro', 'stroke', 'seizure', 'epilep', 'brain', 'intracranial', 'head injur', 'concussion', 'spinal cord', 'meningitis', 'parkinson', 'multiple sclerosis', 'myasthenia', 'guillain', 'alzheimer', 'dementia', 'delirium', 'migraine', 'headache', 'glasgow', 'cranial', 'amyotrophic', 'als', 'huntington', 'autonomic dysreflexia', 'tia', 'transient ischemic', 'phenytoin', 'levetiracetam', 'hydrocephalus', 'shunt', 'cerebral palsy', 'spina bifida', 'myelomening', 'neural tube', 'neuropathy', 'bell palsy', 'trigeminal', 'tremor', 'pupil', 'lumbar puncture', 'eeg', 'cauda equina', 'babinski', 'valproate', 'carbamazepine', 'cholinesterase', 'reye', 'febrile seizure', 'vertigo'],
  'Renal & Urinary': ['renal', 'kidney', 'urinary', 'urine', 'bladder', 'dialysis', 'nephr', 'uti', 'catheter', 'prostat', 'bph', 'incontinence', 'urolog', 'creatinine', 'glomerul', 'aki', 'ckd', 'cystitis', 'pyeloneph', 'calculi', 'kidney stone', 'urolithiasis', 'fistula', 'av graft', 'foley', 'voiding', 'hypospadias', 'enuresis', 'wilms', 'urostomy', 'cystoscopy', 'turp', 'diuret'],
  'Endocrine': ['diabet', 'insulin', 'glucose', 'hypoglyc', 'hyperglyc', 'thyroid', 'a1c', 'dka', 'ketoacidosis', 'hhs', 'adrenal', 'addison', 'cushing', 'pituitary', 'siadh', 'diabetes insipidus', 'metformin', 'levothyrox', 'corticosteroid', 'cortisol', 'pheochromocytoma', 'parathyroid', 'endocrin', 'glucagon', 'sulfonylurea', 'acromegaly', 'hyperthyroid', 'hypothyroid', 'graves', 'thyroidectomy', 'adrenalectomy', 'hypophysectomy'],
  'Gastrointestinal': ['gastr', 'bowel', 'colon', 'intestin', 'liver', 'hepat', 'cirrhosis', 'pancrea', 'gallbladder', 'cholecyst', 'cholangitis', 'ulcer', 'gerd', 'reflux', 'crohn', 'colitis', 'diverticul', 'appendic', 'ostomy', 'colostomy', 'ileostomy', 'constipat', 'diarrhea', 'nausea', 'vomit', 'nasogastric', 'ng tube', 'feeding tube', 'enteral', 'tube feeding', 'parenteral nutrition', 'tpn', 'dysphag', 'swallow', 'esophag', 'achalasia', 'hernia', 'abdominal', 'stool', 'rectal', 'hemorrhoid', 'celiac', 'pyloric', 'intussusception', 'hirschsprung', 'cleft', 'nutrition', 'diet', 'enema', 'ascites', 'paracentesis', 'varices', 'lactulose', 'ammonia', 'jaundice', 'biliary', 'peptic', 'h. pylori', 'bariatric', 'obesity', 'teething', 'thrush', 'dental', 'tooth', 'oral care', 'gi bleed', 'melena', 'dumping'],
  'Musculoskeletal': ['fracture', 'bone', 'osteo', 'arthritis', 'joint', 'hip', 'knee', 'cast', 'traction', 'amputat', 'gout', 'musculo', 'slipped capital', 'plantar fasciitis', 'muscle', 'back pain', 'spine', 'scoliosis', 'crutch', 'cane', 'walker', 'mobility', 'compartment syndrome', 'fat embolism', 'sprain', 'strain', 'carpal tunnel', 'lupus', 'fibromyalgia', 'dysplasia', 'clubfoot', 'muscular dystrophy', 'range of motion', 'transfer', 'ambulat', 'fall', 'arthroplasty', 'bisphosphonate', 'rheumatoid', 'immobil', 'orthop'],
  'Hematologic': ['anemia', 'sickle', 'hemophilia', 'bleeding', 'transfusion', 'platelet', 'thrombocytopeni', 'purpura', 'neutropen', 'neutrophil', 'leukemia', 'lymphoma', 'myeloma', 'cancer', 'oncolog', 'chemotherap', 'radiation', 'tumor', 'warfarin', 'heparin', 'anticoagul', 'inr', 'aptt', 'iron', 'hemoglobin', 'hematocrit', 'dic', 'disseminated intravascular', 'bone marrow', 'stem cell', 'mastectomy', 'mucositis', 'tumor lysis', 'vincristine', 'anthracycline', 'blood product', 'polycythemia', 'hemochromatosis', 'g6pd', 'thalassemia', 'hospice', 'palliative', 'vitamin b12', 'pernicious'],
  'Immune': ['immun', 'hiv', 'aids', 'allerg', 'anaphyla', 'vaccin', 'infect', 'sepsis', 'septic', 'antibiotic', 'mrsa', 'c. diff', 'clostridi', 'isolation', 'precaution', 'transplant', 'rejection', 'autoimmune', 'latex', 'fever', 'lyme', 'herpes', 'zoster', 'shingles', 'varicella', 'measles', 'mumps', 'rubella', 'sexually transmitted', 'sti', 'syphilis', 'chlamydia', 'gonorrhea', 'covid', 'tetanus', 'rabies', 'animal bite', 'scarlet fever', 'strep', 'mononucleosis', 'hand hygiene'],
  'Integumentary': ['skin', 'wound', 'burn', 'pressure injur', 'pressure ulcer', 'decubitus', 'dermat', 'eczema', 'psoriasis', 'rash', 'lesion', 'melanoma', 'cellulitis', 'impetigo', 'poison ivy', 'bed bugs', 'lice', 'pediculosis', 'scabies', 'incision', 'dressing', 'debridement', 'graft', 'sunscreen', 'sun protection', 'frostbite', 'acne', 'adhesive', 'tinea', 'ringworm', 'wound vac', 'negative pressure', 'braden'],
  'Sensory': ['eye', 'vision', 'visual', 'glaucoma', 'cataract', 'retina', 'macular', 'ear', 'hearing', 'otitis', 'tinnitus', 'meniere', 'eye drop', 'conjunctivitis', 'ophthalm', 'cochlear', 'cerumen', 'hearing aid', 'tympan', 'myringotomy', 'strabismus'],
  'Reproductive': ['pregnan', 'prenatal', 'antepartum', 'labor', 'postpartum', 'newborn', 'neonat', 'breastfeed', 'lactation', 'contracept', 'menstru', 'menopause', 'fetal', 'fetus', 'gestation', 'preeclampsia', 'eclampsia', 'placenta', 'cesarean', 'umbilical', 'apgar', 'amnio', 'uterine', 'uterus', 'fundal', 'lochia', 'ovarian', 'cervical', 'pap test', 'mammogra', 'erectile', 'testicular', 'epididym', 'external cephalic', 'breast pump', 'infertil', 'ectopic', 'miscarriage', 'rh immune', 'oxytocin', 'magnesium sulfate', 'afterpains', 'circumcision', 'vaginal', 'hysterectomy', 'endometri'],
  'Fluids & Electrolytes': ['fluid', 'electrolyte', 'potassium', 'sodium', 'calcium', 'magnesium', 'phosph', 'acid-base', 'acidosis', 'alkalosis', 'dehydrat', 'hyperkal', 'hypokal', 'hypernat', 'hyponat', 'hypercalc', 'hypocalc', 'iv fluid', 'fluid volume', 'edema', 'intake and output', 'infiltration', 'extravasation', 'iv therapy', 'iv site', 'central line', 'picc'],
};

const MATERNITY = ['pregnan', 'prenatal', 'antepartum', 'labor', 'postpartum', 'newborn', 'neonat', 'breastfeed', 'lactation', 'fetal', 'fetus', 'gestation', 'preeclampsia', 'eclampsia', 'placenta', 'cesarean', 'umbilical', 'apgar', 'amnio', 'fundal', 'lochia', 'ectopic', 'miscarriage', 'rh immune', 'oxytocin', 'afterpains', 'circumcision'];
const PEDIATRICS = ['child', 'pediatric', 'toddler', 'preschool', 'school-age', 'school age', 'adolescent', 'teen', 'infant', 'month-old', 'kawasaki', 'croup', 'epiglottitis', 'rsv', 'bronchiolitis', 'pyloric', 'intussusception', 'hirschsprung', 'cleft', 'hypospadias', 'wilms', 'cerebral palsy', 'spina bifida', 'myelomening', 'clubfoot', 'muscular dystrophy', 'scoliosis', 'adhd', 'autism', 'enuresis', 'developmental', 'lead poisoning', 'reye', 'febrile seizure', 'tetralogy', 'congenital'];

const norm = s => ' ' + String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9.+\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = new Map();
function hits(text, words) {
  let n = 0;
  for (const w of words) {
    // short keywords match on word boundaries so "ear" doesn't fire on "early"
    if (!matchers.has(w)) matchers.set(w, w.length <= 4 ? new RegExp(`(^|[^a-z])${escape(w)}([^a-z]|$)`) : null);
    const re = matchers.get(w);
    if (re ? re.test(text) : text.includes(w)) n++;
  }
  return n;
}

// `caseText` (scenario + exhibits) stands in for the topic on case-study items, whose topics
// are only the clinical-judgment step; every item in a case then shares one system.
export function classifySystem(q, caseText) {
  if (SET_SYSTEM[q.set_number]) return { system: SET_SYSTEM[q.set_number], basis: 'set_title' };
  const topic = norm(caseText ?? q.topic), stem = caseText ? ' ' : norm(q.stem);
  let best = 'Integrated', bestScore = 0, runnerUp = 0;
  for (const [sys, words] of Object.entries(KEYWORDS)) {
    const s = hits(topic, words) * 3 + hits(stem, words);
    if (s > bestScore) { runnerUp = bestScore; bestScore = s; best = sys; }
    else if (s > runnerUp) runnerUp = s;
  }
  // a single incidental stem word is not enough evidence
  if (bestScore < 2) return { system: 'Integrated', basis: 'no_keyword' };
  return { system: best, basis: bestScore - runnerUp <= 1 ? 'keyword_low_margin' : 'keyword' };
}

export function classifyDiscipline(q) {
  if (q.case_id) return 'NGN Clinical Judgment';
  if (SET_DISCIPLINE[q.set_number]) return SET_DISCIPLINE[q.set_number];
  const topic = norm(q.topic), text = norm(q.topic + ' ' + q.stem);
  if (hits(topic, MATERNITY) > 0) return 'Maternal & Newborn';
  if (hits(text, PEDIATRICS) > 0) return 'Pediatrics';
  if (hits(text, MATERNITY) > 1) return 'Maternal & Newborn';
  const cn = q.client_need;
  if (/Pharmacolog/.test(cn)) return 'Pharmacology';
  if (/Management of Care|Coordinated Care/.test(cn)) return 'Management of Care';
  if (/Safety and Infection Control/.test(cn)) return 'Safety & Infection Control';
  if (/Psychosocial/.test(cn)) return 'Mental Health';
  if (/Basic Care and Comfort|Health Promotion/.test(cn)) return 'Fundamentals';
  return 'Adult Health';
}
