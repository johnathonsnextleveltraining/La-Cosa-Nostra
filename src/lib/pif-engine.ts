import type {Pick} from './engine.ts';
export type PifBetType='Favorite'|'Underdog'|'Over'|'Under'|'Parlay'|'Other';
export type PifSummary={w:number;l:number;push:number;pending:number;net:number;risk:number;pricedNet:number;rate:number|null;roi:number|null;count:number};
export type PifAgreement=PifSummary&{names:string[]};
export type PifData={byDay:(PifSummary&{analyst:string;date:string;sport:string;market:string})[];byBetType:(PifSummary&{analyst:string;date:string;sport:string;market:string;betType:PifBetType})[];agreements:{analyst:string;sport:string;window:'30'|'60'|'All';duo:PifAgreement|null;trio:PifAgreement|null}[]};
type Shared={crew:string[];offset:(date:string,n:number)=>string;eventKey:(p:Pick)=>string;side:(p:Pick)=>string;quote:(p:Pick)=>string;summarize:(rows:any[])=>PifSummary};
export function pifBetType(p:Pick):PifBetType{
 if(p.analyst==='Johnny Biz'&&p.market==='Other'&&/\b(?:parlay|teaser)\b/i.test(p.pick))return 'Parlay';
 if(p.market==='Total'){if(/^(?:over|o)\s*\d/i.test(p.pick))return 'Over';if(/^(?:under|u)\s*\d/i.test(p.pick))return 'Under'}
 if(p.market==='ML'&&p.odds!=null)return p.odds<0?'Favorite':'Underdog';
 if(p.market==='Spread'){const line=p.pick.replace(/−/g,'-').match(/([+-]?\d+(?:\.\d+)?)\s*$/);if(line&&Number(line[1])!==0)return Number(line[1])<0?'Favorite':'Underdog'}
 const source=Array.isArray(p.raw)?String(p.raw[9]??'').trim().toLowerCase():'';
 if(p.market==='Spread'||p.market==='ML'){if(/^(?:fav|favorite)$/.test(source))return 'Favorite';if(/^(?:dog|underdog)$/.test(source))return 'Underdog'}
 return 'Other';
}
export function pifViews(picks:Pick[],asof:string,shared:Shared):PifData{
 const {crew,offset,eventKey,side,quote,summarize}=shared,names=[...crew,'Johnny Biz'];
 const settled=picks.filter(p=>p.date<=asof&&names.includes(p.analyst));
 const aggregate=(betType:boolean)=>{const groups=new Map<string,Pick[]>();for(const p of settled){const key=JSON.stringify([p.analyst,p.date,p.sport,p.market,...(betType?[pifBetType(p)]:[])]);groups.set(key,[...(groups.get(key)||[]),p])}return [...groups.values()].map(ps=>({_aggregate:true,analyst:ps[0].analyst,date:ps[0].date,sport:ps[0].sport,market:ps[0].market,...(betType?{betType:pifBetType(ps[0])}:{}),...summarize(ps)}))};
 // Include unsettled submissions when testing ambiguity: a pending conflicting copy cannot validate a settled agreement.
 const events=new Map<string,Pick[]>();for(const p of picks){if(p.date>asof||!names.includes(p.analyst)||!['Spread','Total','ML'].includes(p.market))continue;const key=eventKey(p)+'|'+p.market;events.set(key,[...(events.get(key)||[]),p])}
 const cohorts=new Map<string,{sport:string;names:string[];own:Map<string,Pick[]>}>();
 const combos=(a:Pick[],n:number):Pick[][]=>n===0?[[]]:a.flatMap((v,i)=>combos(a.slice(i+1),n-1).map(t=>[v,...t]));
 for(const ps of events.values()){
  const analysts=new Map<string,Pick[]>();for(const p of ps)analysts.set(p.analyst,[...(analysts.get(p.analyst)||[]),p]);
  const unique=[...analysts.values()].filter(rows=>new Set(rows.map(p=>[side(p),quote(p),p.odds,p.result,p.risk,p.net].join('|'))).size===1).map(rows=>rows[0]).filter(p=>['W','L','Push'].includes(p.result)&&!!side(p)&&!!quote(p)&&p.odds!==null).sort((a,b)=>a.analyst.localeCompare(b.analyst));
  for(const size of [2,3])for(const group of combos(unique,size)){
   if(new Set(group.map(p=>[side(p),quote(p),p.odds,p.result].join('|'))).size!==1)continue;
   const ns=group.map(p=>p.analyst),key=JSON.stringify([group[0].sport,ns]);
   let c=cohorts.get(key);if(!c){c={sport:group[0].sport,names:ns,own:new Map(ns.map(n=>[n,[]]))};cohorts.set(key,c)}
   for(const p of group)c.own.get(p.analyst)!.push(p);
  }
 }
 const agreements:PifData['agreements']=[];
 for(const analyst of names)for(const sport of ['All','NBA','NFL','CBB','CFB'])for(const window of ['30','60','All'] as const){
  const from=window==='All'?'':offset(asof,window==='30'?-29:-59),candidates=new Map<string,{names:string[];rows:Pick[]}>();
  for(const c of cohorts.values())if(c.names.includes(analyst)&&(sport==='All'||sport===c.sport)){
   const key=JSON.stringify(c.names),target=candidates.get(key)??{names:c.names,rows:[]};target.rows.push(...c.own.get(analyst)!.filter(p=>p.date>=from));candidates.set(key,target);
  }
  const eligible=[...candidates.values()].filter(c=>c.rows.every(p=>p.net!==null)).map(c=>({names:c.names,...summarize(c.rows)})).filter(c=>c.w+c.l>=1).sort((a,b)=>b.net-a.net||b.w-a.w||JSON.stringify(a.names).localeCompare(JSON.stringify(b.names)));
  agreements.push({analyst,sport,window,duo:eligible.find(c=>c.names.length===2)??null,trio:eligible.find(c=>c.names.length===3)??null});
 }
 return {byDay:aggregate(false),byBetType:aggregate(true) as PifData['byBetType'],agreements};
}
