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
  const prompt=`You are NursePrepIQ's bedside NCLEX teacher. Teach a novice who knows almost nothing. Never shame the learner and never merely restate the stored rationale.
Use plain language first, then the nursing term in parentheses. Build understanding from zero.
Return JSON only with keys:
"what_is_happening": 2-4 sentences explaining the underlying condition/concept in beginner language;
"decode_the_stem": array of 2-5 objects {"cue":"exact/short cue from stem","meaning":"why it matters"};
"what_is_being_asked": one plain-language sentence translating the task;
"reasoning_steps": array of 3-6 short sequential reasoning steps;
"correct_answer": 2-4 sentences explaining why the correct response wins and what could happen if missed;
"options": array for every option {"key":"A","verdict":"correct|not_best","why":"specific beginner-friendly explanation","when_it_would_fit":"briefly say when this choice could be appropriate, or 'Not in this situation'"};
"memory_hook": one memorable rule/analogy;
"nclex_takeaway": one transferable test-taking/clinical rule.
For prioritization questions explicitly teach ABCs, unstable-vs-stable, acute-vs-chronic, safety, or nursing process only when relevant. For medications explain the drug purpose before the answer. For labs/vitals explain what the abnormal value means. For alternate-format items explain why each selected element belongs. Do not invent patient facts. Keep the whole lesson under 650 words.`;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},temperature:0.2,max_tokens:1100,messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(question)}]})});
  if(!r.ok)return NextResponse.json({error:'Teacher explanation is temporarily unavailable.'},{status:502});
  const j=await r.json();return NextResponse.json({lesson:JSON.parse(j.choices?.[0]?.message?.content||'{}')});
 }catch{return NextResponse.json({error:'Teacher explanation failed.'},{status:500})}
}
