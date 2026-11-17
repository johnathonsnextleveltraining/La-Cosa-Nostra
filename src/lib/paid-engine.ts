import type {Pick} from './engine.ts';
export type PaidRecord={analyst:string;w:number;l:number;push:number;rate:number|null;net:number;risk:number;roi:number|null};
export type PaidPair={names:string[];w:number;l:number;push:number;rate:number;net:number;risk:number;roi:number|null};
export type PaidView={boss:PaidRecord|null;underboss:PaidRecord|null;pair:PaidPair|null;games:(Omit<Pick,'raw'>&{agreementResult:string})[];windowDays:30;from:string;through:string};
type Shared={crew:string[];offset:(date:string,n:number)=>string;eventKey:(p:Pick)=>string;side:(p:Pick)=>string;quote:(p:Pick)=>string};
const markets=new Set(['Spread','Total','ML']);
const stable=(a:string,b:string)=>a.localeCompare(b,'en');
// Boss 11/17: rank by money made, not win % (win % loves chalk moneylines)
const compare=(a:{net:number;roi:number|null;w:number;l:number},b:{net:number;roi:number|null;w:number;l:number})=>b.net-a.net||(b.roi??-1)-(a.roi??-1)||(b.w+b.l)-(a.w+a.l);
const settled=(r:string)=>r==='W'||r==='L'||r==='Push';
export function paidViews(picks:Pick[],asof:string,shared:Shared):Record<string,PaidView>{
 const {crew,offset,eventKey,side,quote}=shared;
 const from=offset(asof,-30),through=offset(asof,-1);
 const historical=picks.filter(p=>p.date>=from&&p.date<asof&&crew.includes(p.analyst)&&markets.has(p.market));
 const current=picks.filter(p=>p.date===asof&&crew.includes(p.analyst)&&markets.has(p.market));
 const group=(rows:Pick[])=>{const groups=new Map<string,Pick[]>();for(const p of rows){const k=eventKey(p)+'|'+p.market;groups.set(k,[...(groups.get(k)||[]),p])}return groups};
 const unique=(rows:Pick[])=>{const by=new Map<string,Pick[]>();for(const p of rows)by.set(p.analyst,[...(by.get(p.analyst)||[]),p]);return new Map([...by].filter(([,ps])=>new Set(ps.map(p=>[side(p),quote(p),p.odds,p.result].join('|'))).size===1).map(([a,ps])=>[a,ps[0]]))};
 const matching=(a:Pick,b:Pick)=>!!side(a)&&!!quote(a)&&side(a)===side(b)&&quote(a)===quote(b)&&a.odds!==null&&a.odds===b.odds;
 const historyGroups=[...group(historical).values()].map(unique);
 const currentGroups=[...group(current).values()].map(unique);
 const result:Record<string,PaidView>={};
 for(const sport of ['All','NBA','NFL','CBB','CFB']){
  const rows=historical.filter(p=>sport==='All'||p.sport===sport);
  const records:PaidRecord[]=crew.map(analyst=>{const own=rows.filter(p=>p.analyst===analyst),w=own.filter(p=>p.result==='W').length,l=own.filter(p=>p.result==='L').length,push=own.filter(p=>p.result==='Push').length;const st=own.filter(p=>settled(p.result));const net=st.reduce((t,p)=>t+(p.net||0),0),risk=st.reduce((t,p)=>t+(p.risk||0),0);return {analyst,w,l,push,rate:w+l?w/(w+l):null,net,risk,roi:risk?net/risk:null}});
  const boss=records.filter(r=>r.w+r.l>=10).sort((a,b)=>compare(a,b)||stable(a.analyst,b.analyst))[0]??null;
  const pairs:PaidPair[]=[];
  if(boss)for(const other of crew.filter(a=>a!==boss.analyst)){
   let w=0,l=0,push=0,net=0,risk=0;
   for(const g of historyGroups){const a=g.get(boss.analyst),b=g.get(other);if(!a||!b||(sport!=='All'&&a.sport!==sport)||!matching(a,b)||a.result!==b.result)continue;if(a.result==='W')w++;else if(a.result==='L')l++;else if(a.result==='Push')push++;if(settled(a.result)){net+=a.net||0;risk+=a.risk||0}}
   if(w+l>=5)pairs.push({names:[boss.analyst,other],w,l,push,rate:w/(w+l),net,risk,roi:risk?net/risk:null});
  }
  const pair=pairs.sort((a,b)=>compare(a,b)||stable(a.names[1],b.names[1]))[0]??null;
  const underboss=pair?records.find(r=>r.analyst===pair.names[1])??null:null;
  const games:(Omit<Pick,'raw'>&{agreementResult:string})[]=[];
  if(boss&&underboss)for(const g of currentGroups){const a=g.get(boss.analyst),b=g.get(underboss.analyst);if(!a||!b||(sport!=='All'&&a.sport!==sport)||!matching(a,b)||(a.market==='ML'&&a.odds!< -300))continue;const {raw,...pick}=a;games.push({...pick,agreementResult:a.result===b.result&&['W','L','Push','Void'].includes(a.result)?a.result:''})}
  games.sort((a,b)=>stable(a.sport,b.sport)||stable(a.matchup,b.matchup)||(['Spread','Total','ML'].indexOf(a.market)-['Spread','Total','ML'].indexOf(b.market))||stable(a.id,b.id));
  result[sport]={boss,underboss,pair,games:games.slice(0,10),windowDays:30,from,through};
 }
 return result;
}
