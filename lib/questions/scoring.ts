export type QuestionOption={option_key:string;option_text:string;is_correct:boolean;display_order:number};
export type ResponseConfig={rows?:{id:string;label:string;correct?:string|string[]}[];columns?:{id:string;label:string}[];blanks?:{id:string;options:string[];correct:string}[];groups?:{id:string;label:string;choose:number;options:{id:string;label:string;correct:boolean}[]}[];segments?:{id:string;text:string;correct:boolean}[]};
export type StudentResponse={selected?:string[];matrix?:Record<string,string[]>;blanks?:Record<string,string>;groups?:Record<string,string[]>;highlights?:string[]};
export function scoreQuestion(itemType:string,options:QuestionOption[],config:ResponseConfig,response:StudentResponse){
 const type=itemType||'single_best_answer';
 if(type==='single_best_answer'){
  const key=options.find(o=>o.is_correct)?.option_key;const chosen=response.selected?.[0];
  return {isCorrect:!!key&&chosen===key,earned:chosen===key?1:0,possible:1};
 }
 if(type==='multiple_response'){
  const correct=new Set(options.filter(o=>o.is_correct).map(o=>o.option_key));const selected=new Set(response.selected||[]);
  let earned=0;for(const k of selected) earned+=correct.has(k)?1:-1;
  return {isCorrect:correct.size===selected.size&&[...correct].every(k=>selected.has(k)),earned:Math.max(0,earned),possible:correct.size};
 }
 if(type==='matrix_grid'){
  const rows=config.rows||[];let earned=0,possible=rows.length;
  for(const row of rows){const want=Array.isArray(row.correct)?row.correct:[row.correct].filter(Boolean) as string[];const got=response.matrix?.[row.id]||[];if(want.length===got.length&&want.every(x=>got.includes(x)))earned++;}
  return {isCorrect:earned===possible,earned,possible};
 }
 if(type==='cloze_dropdown'){
  const blanks=config.blanks||[];let earned=0;for(const b of blanks)if(response.blanks?.[b.id]===b.correct)earned++;
  return {isCorrect:earned===blanks.length,earned,possible:blanks.length};
 }
 if(type==='highlight'){
  const want=new Set((config.segments||[]).filter(s=>s.correct).map(s=>s.id));const got=new Set(response.highlights||[]);let earned=0;for(const id of got)earned+=want.has(id)?1:-1;
  return {isCorrect:want.size===got.size&&[...want].every(x=>got.has(x)),earned:Math.max(0,earned),possible:want.size};
 }
 if(type==='bow_tie'){
  let earned=0,possible=0;for(const g of config.groups||[]){possible+=g.choose;const correct=new Set(g.options.filter(o=>o.correct).map(o=>o.id));for(const id of response.groups?.[g.id]||[])if(correct.has(id))earned++;}
  return {isCorrect:earned===possible,earned,possible};
 }
 return {isCorrect:false,earned:0,possible:1};
}
