-- NursePrepIQ 0052: promote 0050 batch only after required AI-assisted validation gates pass.
-- This does not claim human review or psychometric validation.
begin;
do $$
declare r record; n int:=0;
begin
 for r in
   select q.id,q.current_version
   from public.questions q
   where q.slug like '0050-%'
     and public.question_ready_for_production(q.id,q.current_version)
 loop
   perform public.promote_question_to_production(r.id,r.current_version);
   n:=n+1;
 end loop;
 if n <> 108 then
   raise exception '0050 promotion aborted: expected 108 validation-ready questions, found %',n;
 end if;
end $$;
commit;
