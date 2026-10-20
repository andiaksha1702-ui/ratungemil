export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).end();
  const b=req.body||{},role='kasir';
  try{
    if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL belum diatur di Vercel');
    const {neon}=await import('@neondatabase/serverless');
    const sql=neon(process.env.DATABASE_URL);
    await sql`create table if not exists kv(k text primary key,v jsonb)`;
    await sql`create table if not exists tx(id bigint primary key,d jsonb)`;
    if(b.a==='load'){
      const p=await sql`select v from kv where k='p'`;
      const t=await sql`select d from tx order by id`;
      return res.json({role,p:p[0]?p[0].v:[],t:t.map(r=>r.d)});
    }
    if(b.a==='putp')await sql`insert into kv values('p',${JSON.stringify(b.p||[])}::jsonb) on conflict (k) do update set v=excluded.v`;
    else if(b.a==='puttx')await sql`insert into tx values(${b.tx.id},${JSON.stringify(b.tx)}::jsonb) on conflict (id) do update set d=excluded.d`;
    else if(b.a==='deltx')await sql`delete from tx where id=${b.id}`;
    else if(b.a==='import'){
      if((b.p||[]).length)await sql`insert into kv values('p',${JSON.stringify(b.p)}::jsonb) on conflict (k) do update set v=excluded.v`;
      await sql`insert into tx select (x->>'id')::bigint,x from jsonb_array_elements(${JSON.stringify(b.t||[])}::jsonb) x on conflict do nothing`;
    }else return res.status(400).json({error:'bad'});
    res.json({ok:1});
  }catch(e){res.status(500).json({error:'db',msg:String(e.message).slice(0,200)})}
}
