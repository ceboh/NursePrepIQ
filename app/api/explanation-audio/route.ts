import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const voices=new Set(['alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer']);
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/,'');
  if(!token)return NextResponse.json({error:'Please sign in again.'},{status:401});
  const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const {data:{user}}=await supabase.auth.getUser(token);
  if(!user)return NextResponse.json({error:'Your session could not be verified.'},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'Audio teacher is not configured.'},{status:503});
  const {text,voice='coral'}=await req.json();
  if(typeof text!=='string'||!text.trim())return NextResponse.json({error:'Missing explanation.'},{status:400});
  const safeVoice=voices.has(voice)?voice:'coral';
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:safeVoice,input:text.slice(0,12000),instructions:'Speak like a warm, clear nursing instructor teaching an NCLEX student. Use natural pauses and conversational emphasis. Do not sound rushed.',response_format:'mp3'})});
  if(!r.ok)return NextResponse.json({error:'Audio teacher is temporarily unavailable.'},{status:502});
  return new NextResponse(await r.arrayBuffer(),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'private, max-age=3600'}});
 }catch{return NextResponse.json({error:'Audio teacher request failed.'},{status:500})}
}