#!/usr/bin/env node
/**
 * NursePrepIQ question inventory reporter.
 * Reads a Supabase REST endpoint with the service role key and reports lifecycle
 * counts without ever mutating/publishing content.
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');process.exit(2)}
const headers={apikey:key,Authorization:`Bearer ${key}`};
async function get(path){const r=await fetch(`${url}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return r.json()}
const versions=await get('question_versions?select=question_id,version,validation_status,item_type,exam_tracks,difficulty');
const questions=await get('questions?select=id,lifecycle_status,current_version');
const current=new Map(questions.map(q=>[q.id,q]));
const rows=versions.filter(v=>current.get(v.question_id)?.current_version===v.version);
const count=(fn)=>rows.filter(fn).length;
const status={
  generated: count(v=>v.validation_status==='generated'),
  pilot: count(v=>v.validation_status==='pilot'),
  validated: count(v=>['validated','production_validated'].includes(v.validation_status)),
  production_active: count(v=>v.validation_status==='production_validated'&&current.get(v.question_id)?.lifecycle_status==='active'),
  total_current_versions: rows.length,
};
const byTrack={rn:count(v=>v.exam_tracks?.includes('rn')),pn:count(v=>v.exam_tracks?.includes('pn'))};
const ngnTypes=new Set(['case_study','bow_tie','matrix','matrix_grid','cloze','drop_down','multiple_response','highlight','trend']);
const ngn=count(v=>ngnTypes.has(v.item_type));
const difficulty=Object.fromEntries(['easy','medium','hard'].map(d=>[d,count(v=>v.difficulty===d)]));
console.log(JSON.stringify({as_of:new Date().toISOString(),status,by_track:byTrack,item_mix:{ngn,total:rows.length,ngn_pct:rows.length?Math.round(1000*ngn/rows.length)/10:0},difficulty},null,2));
