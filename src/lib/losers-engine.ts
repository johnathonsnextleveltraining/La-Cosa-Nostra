import type {Pick} from './engine.ts';
type DuoSport={sport:string;w:number;l:number;push:number};
export type WorstDuo={bySport:DuoSport[];names:string[];w:number;l:number;push:number;rate:number;net:number;count:number;from:string;through:string};
type Shared={crew:string[];offset:(date:string,n:number)=>string;eventKey:(p:Pick)=>string;side:(p:Pick)=>string;quote:(p:Pick)=>string};
/** Descriptive agreement record only: no paired dollars, predictions or invented outcomes. */
export function worstDuoView(picks:Pick[],asof:string,{crew,offset,eventKey,side,quote}:Shared):WorstDuo|null{
 const from=offset(asof,-13),active=new Set(crew) // Boss 11/17: the Boss doesn't go in the fade file,events=new Map<string,Pick[]>();
 for(const p of picks){if(p.date<from||p.date>asof||!active.has(p.analyst)||!['NBA','NFL','CBB','CFB'].includes(p.sport)||!['Spread','Total','ML'].includes(p.market))continue;const key=eventKey(p)+'|'+p.market;events.set(key,[...(events.get(key)||[]),p])}
 const totals=new Map<string,{names:string[];w:number;l:number;push:number;net:number;bySport:DuoSport[]}>();
 for(const rows of events.values()){
  const byAnalyst=new Map<string,Pick[]>();for(const p of rows)byAnalyst.set(p.analyst,[...(byAnalyst.get(p.analyst)||[]),p]);
  // Inspect pending/contradictory copies before settlement filtering, so they cannot silently endorse a result.
  const unique=[...byAnalyst.values()].filter(ps=>new Set(ps.map(p=>[side(p),quote(p),p.odds,p.result].join('|'))).size===1).map(ps=>ps[0]).filter(p=>!!side(p)&&!!quote(p)&&p.odds!==null&&Number.isInteger(p.odds)&&Math.abs(p.odds)>=100&&['W','L','Push'].includes(p.result)).sort((a,b)=>a.analyst.localeCompare(b.analyst,'en'));
  for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){
   const a=unique[i],b=unique[j];if(side(a)!==side(b)||quote(a)!==quote(b)||a.odds!==b.odds||a.result!==b.result)continue;
   const names=[a.analyst,b.analyst],key=JSON.stringify(names),record=totals.get(key)??{names,w:0,l:0,push:0,net:0,bySport:[]};record.net+=a.net||0;
   let sportRecord=record.bySport.find(r=>r.sport===a.sport);if(!sportRecord){sportRecord={sport:a.sport,w:0,l:0,push:0};record.bySport.push(sportRecord)}if(a.result==='W')sportRecord.w++;else if(a.result==='L')sportRecord.l++;else sportRecord.push++;
   if(a.result==='W')record.w++;else if(a.result==='L')record.l++;else record.push++;totals.set(key,record);
  }
 }
 const ranked=[...totals.values()].filter(r=>r.w+r.l>=5).map(r=>({...r,rate:r.w/(r.w+r.l),count:r.w+r.l+r.push,from,through:asof}))// Boss 11/17: worst duo = most money lost together
  .sort((a,b)=>a.net-b.net||a.rate-b.rate||(b.w+b.l)-(a.w+a.l)||JSON.stringify(a.names).localeCompare(JSON.stringify(b.names),'en'));
 return ranked[0]??null;
}
