// Runs inside the app iframe origin (ESPN + Supabase reachable). Builds power ratings from ESPN finals
// and backtests "model line vs market line" against the crew's stored lines. Returns a compact summary.
const SB='https://nnwnaskgkugxfunxmllc.supabase.co',KEY='sb_publishable_aqT2OLxm-2CqOW6QRPZnEg_K8-qFfsd';
const pass=localStorage.getItem('lcn-pass');
const rpc=async(op,args={})=>(await fetch(SB+'/rest/v1/rpc/lcn_api2',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({pass,op,args})})).json();
const norm=s=>String(s).toLowerCase().replace(/[’']/g,'').replace(/\bst[.]?\s/g,'saint ').replace(/[^a-z0-9]/g,'');
const ESPN='https://site.api.espn.com/apis/site/v2/sports/';
const PATHS={NBA:'basketball/nba/scoreboard?limit=100',CBB:'basketball/mens-college-basketball/scoreboard?groups=50&limit=400',CFB:'football/college-football/scoreboard?groups=80&limit=400'};
const START={NBA:'2026-10-20',CBB:'2026-11-02',CFB:'2026-08-27'};
const day=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const END='2026-11-18';
const games={NBA:[],CBB:[],CFB:[]};
for(const sp of Object.keys(PATHS)){const ds=[];for(let d=START[sp];d<=END;d=day(d,1))ds.push(d);
  for(let i=0;i<ds.length;i+=12){await Promise.all(ds.slice(i,i+12).map(async d=>{try{const j=await (await fetch(ESPN+PATHS[sp]+'&dates='+d.replace(/-/g,''))).json();
    for(const e of j.events||[]){const c=e.competitions?.[0];if(e.status?.type?.state!=='post')continue;const h=c.competitors.find(x=>x.homeAway==='home'),a=c.competitors.find(x=>x.homeAway==='away');
      games[sp].push({d,h:norm(h.team.displayName),a:norm(a.team.displayName),hs:+h.score,as:+a.score,neutral:!!c.neutralSite})}}catch(e){}}))}}
// lines from the crew's stored picks
const sig=await rpc('sig');const n=+sig.count;let rows=[];for(let off=0;off<n;off+=2500)rows=rows.concat(await rpc('picks',{off,lim:2500}));
const lines={};
for(const r of rows){const [id,date,analyst,matchup,pick,odds,,,market,sport]=r;if(!games[sport]||date<'2026-08-27'||!matchup)continue;const [A,H]=String(matchup).split(/\s+at\s+/);if(!A||!H)continue;
  const k=sport+'|'+date+'|'+norm(A)+'|'+norm(H);const L=lines[k]=lines[k]||{sport,date,a:norm(A),h:norm(H),sp:{},tot:{}};
  if(market==='Spread'){const m=String(pick).match(/^(.*?)\s*([+-]\d+(?:\.\d+)?)$/);if(!m)continue;const team=norm(m[1]);const v=+m[2];const isH=team&&(L.h.startsWith(team)||team.startsWith(L.h));const isA=team&&(L.a.startsWith(team)||team.startsWith(L.a));if(isH===isA)continue;const hl=isH?v:-v;L.sp[hl]=(L.sp[hl]||0)+1}
  if(market==='Total'){const m=String(pick).match(/^(over|under)\s+([\d.]+)/i);if(m)L.tot[+m[2]]=(L.tot[+m[2]]||0)+1}}
const mode=o=>{let b=null,c=0;for(const[k,v]of Object.entries(o))if(v>c){c=v;b=+k}return b};
const same=(x,y)=>x===y||x.startsWith(y)||y.startsWith(x);
const findG=(sp,d,a,h)=>games[sp].find(g=>(g.d===d||g.d===day(d,1)||g.d===day(d,-1))&&same(g.h,h)&&same(g.a,a));
// ratings fit on games before date: margin = r_h - r_a + hca ; points: score_h = mu + o_h - d_a + hca/2
function fit(list,cap,lam){const R={},O={},D={};let hca=0,mu=0;for(const g of list){R[g.h]??=0;R[g.a]??=0;O[g.h]??=0;O[g.a]??=0;D[g.h]??=0;D[g.a]??=0}
  const pts=list.flatMap(g=>[g.hs,g.as]);mu=pts.reduce((s,x)=>s+x,0)/(pts.length||1);
  for(let it=0;it<40;it++){const sr={},cnt={};let hs=0,hn=0;for(const g of list){const m=Math.max(-cap,Math.min(cap,g.hs-g.as));const H=g.neutral?0:1;const e=m-(R[g.h]-R[g.a]+H*hca);sr[g.h]=(sr[g.h]||0)+e;sr[g.a]=(sr[g.a]||0)-e;cnt[g.h]=(cnt[g.h]||0)+1;cnt[g.a]=(cnt[g.a]||0)+1;if(H){hs+=e;hn++}}
    for(const t in R)R[t]+=sr[t]/((cnt[t]||0)+lam)*0.9;hca+=hn?hs/hn*0.5:0;
    const so={},sd={};for(const g of list){const H=g.neutral?0:1;const eh=g.hs-(mu+O[g.h]-D[g.a]+H*hca/2),ea=g.as-(mu+O[g.a]-D[g.h]-H*hca/2);so[g.h]=(so[g.h]||0)+eh;so[g.a]=(so[g.a]||0)+ea;sd[g.a]=(sd[g.a]||0)-eh;sd[g.h]=(sd[g.h]||0)-ea}
    for(const t in O){O[t]+=(so[t]||0)/((cnt[t]||0)*1+lam)*0.5;D[t]+=(sd[t]||0)/((cnt[t]||0)*1+lam)*0.5}}
  return{R,O,D,hca,mu}}
const CAP={NBA:30,CBB:25,CFB:28},LAM={NBA:3,CBB:3,CFB:2},MINGP={NBA:6,CBB:3,CFB:4};
const out=[];const byDate={};for(const L of Object.values(lines)){(byDate[L.sport+'|'+L.date]??=[]).push(L)}
for(const [key,Ls] of Object.entries(byDate)){const [sp,d]=key.split('|');const prior=games[sp].filter(g=>g.d<d);if(prior.length<50)continue;const M=fit(prior,CAP[sp],LAM[sp]);
  const gp={};for(const g of prior){gp[g.h]=(gp[g.h]||0)+1;gp[g.a]=(gp[g.a]||0)+1}
  const keyOf=t=>Object.keys(M.R).find(x=>same(x,t));
  for(const L of Ls){const G=findG(sp,d,L.a,L.h);if(!G)continue;const th=keyOf(L.h),ta=keyOf(L.a);if(!th||!ta||(gp[th]||0)<MINGP[sp]||(gp[ta]||0)<MINGP[sp])continue;const H=G.neutral?0:1;
    const pm=M.R[th]-M.R[ta]+H*M.hca, pt=2*M.mu+M.O[th]+M.O[ta]-M.D[th]-M.D[ta];const marg=G.hs-G.as,tot=G.hs+G.as;
    const hl=mode(L.sp),tl=mode(L.tot);
    if(hl!=null){const edge=pm+hl;const cov=marg+hl;if(cov!==0)out.push({sp,d,mk:'S',edge,win:Math.sign(edge)===Math.sign(cov),dog:(edge>0?hl>0:hl<0),line:Math.abs(hl),home:edge>0})}
    if(tl!=null){const edge=pt-tl;const res=tot-tl;if(res!==0)out.push({sp,d,mk:'T',edge,win:Math.sign(edge)===Math.sign(res),line:tl})}}}
const sum=(f2)=>{const s={};for(const o of out){const k=f2(o);if(k==null)continue;(s[k]??=[0,0]);s[k][o.win?0:1]++}return Object.fromEntries(Object.entries(s).sort().map(([k,[w,l]])=>[k,w+'-'+l+' '+(100*w/(w+l)).toFixed(1)+'%']))};
const b=e=>{const a=Math.abs(e);return a<2?'0-2':a<4?'2-4':a<6?'4-6':a<9?'6-9':'9+'};
({games:Object.fromEntries(Object.entries(games).map(([k,v])=>[k,v.length])),lines:Object.keys(lines).length,graded:out.length,
 spreadByEdge:sum(o=>o.mk==='S'?o.sp+' '+b(o.edge):null),totalByEdge:sum(o=>o.mk==='T'?o.sp+' '+b(o.edge):null),
 spreadDogFav:sum(o=>o.mk==='S'&&Math.abs(o.edge)>=3?o.sp+(o.dog?' dog':' fav'):null),
 totalOU:sum(o=>o.mk==='T'&&Math.abs(o.edge)>=3?o.sp+(o.edge>0?' over':' under'):null),
 lateOnly:sum(o=>o.d>='2026-11-05'?o.sp+' '+o.mk+' '+(Math.abs(o.edge)>=4?'4+':'<4'):null)})
