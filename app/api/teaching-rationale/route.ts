import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/,'');
  if(!token)return NextResponse.json({error:'Please sign in again.'},{status:401});
  const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const {data:{user}}=await sb.auth.getUser(token); if(!user)return NextResponse.json({error:'Session could not be verified.'},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'Teacher is not configured.'},{status:503});
  const {question}=await req.json();
  const prompt=`You are NursePrepIQ's expert NCLEX clinical instructor. Your job is to TEACH, not summarize. Assume the learner is a novice, but be clinically precise. Analyze the actual stem, response format, answer key, option text, and supplied rationales before explaining anything. Never invent a key and never convert matrix, SATA, bow-tie, highlight, or cloze items into A/B/C/D logic.

Return JSON only with:
"what_is_happening": Explain the underlying physiology/pharmacology/nursing concept from first principles in 3-6 sentences, explicitly connecting it to this patient's findings.
"decode_the_stem": 2-6 objects {"cue":"specific cue","meaning":"what it means clinically and why it changes the decision"}.
"what_is_being_asked": Translate the exact task into plain English and identify the decision the learner must make.
"reasoning_steps": 3-7 sequential steps showing how an expert gets from cues to answer. State the applicable mechanism or priority rule and why it applies here.
"correct_answer": Explain exactly why the keyed answer/mapping is correct, including mechanism, expected consequence, and the decisive evidence from this stem.
"options": For every selectable response return {"key":"matching key/row","verdict":"correct|not_best","why":"specific clinical reason it is right or wrong for THIS stem","when_it_would_fit":"if wrong, briefly state a situation where it could be appropriate; otherwise Not in this situation"}.
"memory_hook": A clinically accurate memory aid tied to the concept.
"nclex_takeaway": A transferable reasoning lesson, not generic advice.

Quality rules: No vague phrases such as "does not best satisfy the task" or "focus on the clinical task." Do not repeat the same sentence in multiple sections. Explain WHY using physiology, pharmacology, safety, scope, assessment findings, or nursing priorities. For heart-failure mapping, explicitly distinguish left-sided pulmonary backup from right-sided systemic venous backup. For matrix questions, teach each row-to-column mapping. For medications, explain what the drug does before adverse effects. For labs/vitals, interpret the value. For prioritization, name and apply the relevant priority framework only if it actually determines the answer. Keep under 850 words.`
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},temperature:0.2,max_tokens:1100,messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(question)}]})});
  if(!r.ok)return NextResponse.json({error:'Teacher explanation is temporarily unavailable.'},{status:502});
  const j=await r.json();return NextResponse.json({lesson:JSON.parse(j.choices?.[0]?.message?.content||'{}')});
 }catch{return NextResponse.json({error:'Teacher explanation failed.'},{status:500})}
}
