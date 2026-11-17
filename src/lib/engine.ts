import {verifiedLockGrades} from './verified-lock-grades.ts';
import {worstDuoView} from './losers-engine.ts';
import {pifViews} from './pif-engine.ts';
import {paidViews} from './paid-engine.ts';
export const engineVersion='2026-11-09-frozen-positive-odds-v7';
export type Pick={id:string;date:string;analyst:string;matchup:string;pick:string;odds:number|null;risk:number|null;toWin:number|null;market:string;sport:string;net:number|null;result:string;status:string;grade:string;source:string;raw?:unknown;classification?:string};
export const crew=['Hova Da God','Nino Brown',"G' Money",'Sharp Syndicate','Paulie Publix','Rithmm'];
export const art:Record<string,string>={'Hova Da God':'hova','Nino Brown':'nino',"G' Money":'g','Sharp Syndicate':'sharps','Paulie Publix':'paulie',Rithmm:'rithmm','Johnny Biz':'johnny'};
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function offset(date:string,n:number){return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)}
export function norm(s:string){return s.toLowerCase().replace(/[’‘]/g,"'").replace(/\bnorth dakota state\b/g,'ndsu').replace(/\bphiladelphia 76ers\b/g,'76ers').replace(/\bst[.]?\s/g,'saint ').replace(/[^a-z0-9]/g,'')}
export function eventKey(p:Pick){
  const matchup=p.matchup.replace(/\(([^)]*)\)/g,(_full,inner)=>{
    // Game/leg/round identifiers are identity, never disposable venue metadata.
    if(/\b(?:game|match|leg|round)\s*#?\s*\d+/i.test(inner))return ' '+inner+' ';
    const venue=/\b(?:madrid|london|neutral|munich|berlin|paris|mexico|s[aã]o paulo)\b|^N$/i.test(inner);
    const time=/\b\d{1,2}:\d{2}\s*(?:[AP]M)?\b|\b(?:[AP]M|[CEMP][DS]?T|UTC|GMT)\b/i.test(inner);
    return venue||time?'':' '+inner+' ';
  });
  return [p.date,p.sport,...matchup.split(/\s+(?:at|vs\.?|@)\s+/i).map(norm)].join('|');
}

export function side(p:Pick){if(p.market==='Total')return /^(under|u)\s*\d/i.test(p.pick)?'Under':/^(over|o)\s*\d/i.test(p.pick)?'Over':'';return norm(p.pick.replace(/\s+(?:[+−-]?\d+(?:\.\d+)?|ML|moneyline|PK|pick.?em).*$/i,''))}
export function quote(p:Pick){if(p.market==='ML')return 'ML';const m=p.pick.replace(/−/g,'-').match(/[+\-]?\d+(?:\.\d+)?\s*$/);return m?String(Number(m[0])):/\bpk\b|pick.?em/i.test(p.pick)?'0':''}
export function summarize(rows:any[]){let w=0,l=0,push=0,pending=0,net=0,risk=0,pricedNet=0,count=0;for(const p of rows){if(p._aggregate){w+=p.w;l+=p.l;push+=p.push;pending+=p.pending;net+=p.net;risk+=p.risk;pricedNet+=p.pricedNet;count+=p.count;continue}count++;if(p.result==='W')w++;else if(p.result==='L')l++;else if(/^push$/i.test(p.result))push++;else if(!p.result)pending++;net+=p.net||0;if(['W','L','Push'].includes(p.result)&&p.risk!=null&&p.net!=null){risk+=p.risk;pricedNet+=p.net}}return {w,l,push,pending,net,risk,pricedNet,rate:w+l?w/(w+l):null,roi:risk?pricedNet/risk:null,count}}
function performanceSummary(picks:Pick[]){const groups=new Map<string,Pick[]>();for(const p of picks){const key=[p.date,p.analyst,p.sport,p.market,p.grade].join('|');groups.set(key,[...(groups.get(key)||[]),p])}return [...groups.values()].map(ps=>({_aggregate:true,date:ps[0].date,analyst:ps[0].analyst,sport:ps[0].sport,market:ps[0].market,grade:ps[0].grade,...summarize(ps)}))}

function combos(a:string[],n:number):string[][]{if(n===0)return [[]];return a.flatMap((v,i)=>combos(a.slice(i+1),n-1).map(t=>[v,...t]))}
export function history(rows:Pick[],asof:string){const groups=new Map<string,Pick[]>();for(const p of rows){if(p.date>=asof||p.date<offset(asof,-60)||!crew.includes(p.analyst)||!side(p)||!quote(p))continue;const k=eventKey(p)+'|'+p.market+'|'+side(p);groups.set(k,[...(groups.get(k)||[]),p])}const stats:Record<string,any>={};let conflicts=0;for(const ps of groups.values()){const unique=new Map<string,Pick>();let bad=false;for(const p of ps){const old=unique.get(p.analyst);if(old&&(old.pick!==p.pick||old.result!==p.result))bad=true;unique.set(p.analyst,p)}if(bad){conflicts++;continue}const list=[...unique.values()];for(const n of [2,3,4])for(const names of combos([...unique.keys()].sort(),n)){const subset=names.map(a=>unique.get(a)!);if(new Set(subset.map(quote)).size!==1||new Set(subset.map(p=>p.result)).size!==1){conflicts++;continue}const result=subset[0].result;if(!['W','L','Push'].includes(result))continue;const k=[list[0].sport,list[0].market,...names].join('|');const s=stats[k]??={names,sport:list[0].sport,market:list[0].market,w:0,l:0,push:0};if(result==='W')s.w++;else if(result==='L')s.l++;else s.push++}}
return {stats,conflicts}}
export function boards(rows:Pick[],asof:string,h=history(rows,asof)){const groups=new Map<string,Pick[]>();for(const p of rows){if(p.date!==asof||!crew.includes(p.analyst)||!['Spread','Total','ML'].includes(p.market)||!side(p))continue;if(p.market==='ML'&&(p.odds===null||p.odds< -300))continue;const k=eventKey(p)+'|'+p.market+'|'+side(p);groups.set(k,[...(groups.get(k)||[]),p])}return [...groups.values()].flatMap(ps=>{const unique=new Map(ps.map(p=>[p.analyst,p]));const all=[...unique.keys()].sort();if(all.length<3)return [];const candidates=combos(all,3).map(names=>h.stats[[ps[0].sport,ps[0].market,...names].join('|')]).filter(s=>s&&s.w+s.l>0&&(ps[0].sport==='CBB'||s.w+s.l>=5)).sort((a,b)=>b.w/(b.w+b.l)-a.w/(a.w+a.l)||(b.w+b.l)-(a.w+a.l));if(!candidates.length)return [];const s=candidates[0],selected=s.names.map((n:string)=>unique.get(n)!);const conflict=new Set(selected.map(quote)).size!==1||new Set(selected.map((p:Pick)=>p.odds)).size!==1||selected.some((p:Pick)=>!quote(p));return [{id:eventKey(ps[0])+'|'+ps[0].market+'|'+side(ps[0]),sport:ps[0].sport,market:ps[0].market,matchup:ps[0].matchup,pick:selected[0].pick,odds:selected[0].odds,all,names:s.names,w:s.w,l:s.l,push:s.push,rate:s.w/(s.w+s.l),quoteConflict:conflict,submissions:ps.map(p=>({id:p.id,analyst:p.analyst,pick:p.pick,odds:p.odds})),result:new Set(selected.map((p:Pick)=>p.result)).size===1?selected[0].result:'Unresolved'}]}).sort((a,b)=>b.rate-a.rate||(b.w+b.l)-(a.w+a.l))}
export function settlement(risk:number,odds:number,result:string){if(!Number.isInteger(risk)||risk<=0||!Number.isInteger(odds)||Math.abs(odds)<100)throw Error('Valid stake in cents and American odds required');return result==='W'?Math.round(odds>0?risk*odds/100:risk*100/-odds):result==='L'?-risk:0}
export function validatePick(p:any){for(const k of ['date','analyst','sport','matchup','pick','market'])if(typeof p[k]!=='string'||!p[k].trim())throw Error('Missing '+k);if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!['Spread','Total','ML','Other'].includes(p.market))throw Error('Invalid date or market');if(p.analyst!=='Johnny Biz'&&!crew.includes(p.analyst))throw Error('Choose a current crew analyst or Johnny Biz');if(!Number.isInteger(p.odds)||Math.abs(p.odds)<100)throw Error('American odds must be an integer of at least ±100');if(!Number.isInteger(p.risk)||p.risk<=0)throw Error('Stake must be positive integer cents');if(p.analyst!=='Johnny Biz'&&p.risk!==20000)throw Error('Crew risk must be $200');if(p.grade&&!/^[ABC][+-]?$/.test(p.grade))throw Error('Grade must be A/B/C with optional +/- or blank');if(p.market==='Other'&&p.analyst!=='Johnny Biz')throw Error('Crew submissions use full-game Spread, Total or ML');if(p.market!=='Other'&&(!side(p)||!quote(p)))throw Error('Selection could not be parsed: use Team -3, Under 52.5 or Team ML')}
export function stateFor(picks:Pick[],locks:any[],revision:number,asof=today()){const pif=pifViews(picks,asof,{crew,offset,eventKey,side,quote,summarize});const resolved=resolveLockHistory(picks,locks);locks=resolved.locks;const h=history(picks,asof);const current=picks.filter(p=>p.date===asof);const yesterday=offset(asof,-1);const previous=boards(picks,yesterday);const oldh=history(picks,yesterday);const lastNight=previous.map(b=>{const s=h.stats[[b.sport,b.market,...b.names].join('|')];return {...b,delta:s&&s.w+s.l?(s.w/(s.w+s.l)-b.rate):null}});return {revision,engineVersion,worstDuo:worstDuoView(picks,asof,{crew,offset,eventKey,side,quote}),paidInFull:{byBetType:pif.byBetType,agreements:pif.agreements},getPaid:paidViews(picks,asof,{crew,offset,eventKey,side,quote}),date:asof,sourceDate:picks.filter(p=>p.date<=asof).reduce((latest,p)=>p.date>latest?p.date:latest,''),count:picks.length,todayCount:current.length,analysts:[...new Set(picks.map(p=>p.analyst))],board:boards(picks,asof,h),lastNight,locks:locks.filter(l=>l.statsEligible&&(l.date===asof||l.date===yesterday)),lockHistory:locks.filter(l=>l.statsEligible).map(l=>({analyst:l.analyst,date:l.date,sport:l.sport,grade:l.grade,result:l.result,net:l.net,risk:l.risk??l.frozen?.risk??null})),performance:performanceSummary(picks),current:current.map(({raw,...p})=>p),cohorts:Object.values(h.stats).filter((s:any)=>s.w+s.l>=5).sort((a:any,b:any)=>b.w/(b.w+b.l)-a.w/(a.w+a.l)),pairs:Object.values(h.stats).filter((s:any)=>s.names.length===2&&s.w+s.l>=5).sort((a:any,b:any)=>b.w/(b.w+b.l)-a.w/(a.w+a.l)),health:{lockHistory:resolved.health,conflictingAgreementSamples:h.conflicts,unpriced:picks.filter(p=>p.odds===null).length,missingStake:picks.filter(p=>p.risk===null).length,legacyRisk:picks.filter(p=>crew.includes(p.analyst)&&p.risk!==null&&p.risk!==20000).length,preservedNet:picks.reduce((s,p)=>s+(p.net||0),0)},crew:crew.map(analyst=>({analyst,today:current.filter(p=>p.analyst===analyst).length,...summarize(picks.filter(p=>p.analyst===analyst&&p.date<asof&&p.date>=offset(asof,-60)))}))}}

/** Read the original frozen card's quoted odds even when its ledger link is unresolved. */
export function lockTerms(lock:any):{risk:number|null;odds:number|null}{const first=String(lock.card||'').split('\n')[0];const price=first.replace(/−/g,'-').match(/(?:\(|\s)([+-]\d{3,})(?:\))?\s*$/);const stake=String(lock.card||'').match(/Risk\s*[:$]?\s*\$?([0-9]+(?:\.[0-9]{1,2})?)/i);return {risk:lock.frozen?.risk??lock.risk??(stake?Math.round(Number(stake[1])*100):null),odds:lock.frozen?.odds??(price?Number(price[1]):null)}}

export function parseLockCard(lock:any):Pick|null {
  const lines=String(lock.card||'').split('\n').map(s=>s.trim());
  let first=(lines[0]||'').replace(/^[ABC][+−-]?\s*\|\s*/i,'').replace(/^\d+\s*[•.)]?\s*/,'').replace(/−/g,'-');
  // Some generated frozen cards omitted the positive sign. Recover only when
  // their immutable structured odds corroborate the entire unsigned token.
  const signedPrice=first.match(/\s*\(?([+-]\d{3,})\)?\s*$/);
  const unsignedPrice=first.match(/\s+\(?(\d{3,})\)?\s*$/);
  const price=signedPrice||(unsignedPrice&&typeof lock.frozen?.odds==='number'&&lock.frozen.odds>0&&lock.frozen.odds===Number(unsignedPrice[1])?unsignedPrice:null);
  if(!price)return null;
  first=first.slice(0,price.index).trim();
  const matchup=lines.find(s=>/\s(?:at|vs\.?|@)\s/i.test(s));
  if(!matchup)return null;
  const market=/\b(?:moneyline|ML)\b/i.test(lines.slice(1).join(' '))||/\bML$/i.test(first)?'ML':/^(over|under|[ou])\s*\d/i.test(first)?'Total':'Spread';
  if(market==='ML'&&!/\bML$/i.test(first))first+=' ML';
  return {date:lock.date,sport:lock.sport||'',analyst:lock.analyst,market,matchup,pick:first,odds:Number(price[1])} as Pick;
}
function lockMatchKey(p:Pick){return [eventKey({...p,sport:''}),p.analyst,p.market,side(p),quote(p),p.odds].join('|')}
/** Recover display metadata from exact frozen quote matches; raw source rows stay untouched. */
export function resolveLockHistory(picks:Pick[],locks:any[]){
  const index=new Map<string,Pick[]>();
  for(const p of picks){const key=lockMatchKey(p);index.set(key,[...(index.get(key)||[]),p])}
  const archivedGroups=new Set(locks.filter(l=>l.raw?.[5]===true).map(l=>l.date+'|'+l.analyst));
  const gradeCandidates=new Map<string,{grade:string;id:string;sport:string}[]>();
  for(const lock of locks){
    const parsed=parseLockCard(lock);
    const explicit=String(lock.card||'').match(/(?:^|\n)GRADE\s+([ABC][+−-]?)/i)?.[1]||String(lock.card||'').match(/^([ABC][+−-]?)\s*\|/i)?.[1];
    if(parsed&&explicit){const key=lockMatchKey(parsed);gradeCandidates.set(key,[...(gradeCandidates.get(key)||[]),{grade:explicit.toUpperCase().replace('−','-'),id:lock.id,sport:lock.sport||''}])}
  }
  let matched=0,unresolved=0,formulaResults=0,formulaResolved=0,formulaSanityFailures=0,derivedSports=0,derivedRisks=0,derivedNets=0,gradeReviews=0,cardGradeRecoveries=0,evidenceGradeRecoveries=0;
  const resolved=locks.map(original=>{
    const lock={...original};
    lock.statsEligible=original.raw?.[5]===true||!archivedGroups.has(original.date+'|'+original.analyst);
    if(!lock.statsEligible)lock.statsReview='An archived Top 5 exists for this analyst and date; draft retained as source only';
    const recordedResult=String(original.result||'');
    lock.result=['W','L','Push','Void'].includes(recordedResult)?recordedResult:'';
    if(recordedResult.startsWith('=')){formulaResults++;lock.resultReview='Source formula was preserved, not treated as a settled outcome'}
    const cardGrades=[...new Set([...String(lock.card||'').matchAll(/(?:^|\n)\s*GRADE\s+([ABC][+−-]?)\s*(?=\n|$)/gi)].map(m=>m[1].toUpperCase().replace('−','-')))];
    const prefix=String(lock.card||'').match(/^([ABC][+−-]?)\s*\|/i)?.[1]?.toUpperCase().replace('−','-');
    if(prefix&&!cardGrades.includes(prefix))cardGrades.push(prefix);
    if(cardGrades.length===1&&lock.grade!==cardGrades[0]){lock.recordedGrade=lock.grade||'';lock.grade=cardGrades[0];lock.gradeSource='Explicit grade on this original frozen card';lock.gradeRecovery='Recovered original card grade; stored metadata and raw source preserved';cardGradeRecoveries++}
    if(cardGrades.length>1){lock.recordedGrade=lock.grade||'';lock.grade='';lock.gradeReview='Conflicting explicit grades on the same card; excluded from letter-grade records';gradeReviews++}

    const evidence=verifiedLockGrades.find(e=>e.id===lock.id&&e.date===lock.date&&e.analyst===lock.analyst&&e.rank===lock.rank&&e.card===lock.card);
    if(!lock.grade&&cardGrades.length===0&&evidence){lock.recordedGrade=original.grade||'';lock.grade=evidence.grade;lock.gradeSource=evidence.source;lock.gradeEvidence={submittedAt:evidence.submittedAt,note:evidence.note};evidenceGradeRecoveries++}
    if(!lock.sport){
      const matchup=String(lock.card||'').split('\n').find((line:string)=>/\s(?:@|at|vs\.?)\s/i.test(line));
      if(matchup){const key=eventKey({date:lock.date,sport:'',matchup} as Pick);const sports=new Set(picks.filter(p=>p.analyst===lock.analyst&&eventKey({...p,sport:''})===key).map(p=>p.sport).filter(Boolean));if(sports.size===1){lock.sport=[...sports][0];derivedSports++}}
    }
    const parsed=parseLockCard(lock),terms=lockTerms(lock);
    if(lock.risk==null&&lock.frozen?.risk==null&&terms.risk!==null){lock.risk=terms.risk;derivedRisks++}
    const candidates=parsed?(index.get(lockMatchKey(parsed))||[]).filter(p=>(!lock.sport||p.sport===lock.sport)&&(terms.risk===null||p.risk===terms.risk)):[];
    const source=candidates.length===1?candidates[0]:null;
    if(!source){unresolved++;lock.linkStatus=candidates.length>1?'ambiguous':'unresolved';return lock}
    matched++;lock.linkStatus='exact';lock.derivedSource=source.source;
    const ownLookupFormula=/^=IFERROR\(LET\(lines,SPLIT\(D\d+,CHAR\(10\)\)/.test(recordedResult)&&recordedResult.includes('_Analyst Matchups')&&recordedResult.includes('IF(result="","Pending",result)');
    let payoutConsistent=false;
    if(ownLookupFormula&&['W','L','Push','Void'].includes(source.result)&&lock.net!==null&&lock.net===source.net){
      try{payoutConsistent=source.risk!==null&&source.odds!==null&&settlement(source.risk,source.odds,source.result)===source.net}catch{}
      if(!payoutConsistent){formulaSanityFailures++;lock.resultReview='CALCULATION_SANITY_FAILURE: recorded stake, odds, outcome and net disagree';lock.calculationSanityFailure=true}
    }
    if(ownLookupFormula&&payoutConsistent){lock.result=source.result;lock.resultSource=source.source;lock.resultReview='Recovered original lookup result from exact own-analyst quote, matching recorded net and payout arithmetic';formulaResolved++}
    if(!lock.grade&&parsed){
      const grades=(gradeCandidates.get(lockMatchKey(parsed))||[]).filter(g=>g.id!==lock.id&&(!g.sport||g.sport===source.sport));
      if(grades.length){lock.gradeReviewCandidates=grades;lock.gradeReview='Final card has no grade; another edition is a review candidate only';gradeReviews++}
    }
    if(!lock.sport){lock.sport=source.sport;derivedSports++}
    if(lock.risk==null&&lock.frozen?.risk==null&&source.risk!==null){lock.risk=source.risk;derivedRisks++}
    if(lock.net==null&&lock.result&&lock.result===source.result&&source.net!==null&&source.risk===(lock.frozen?.risk??lock.risk)){lock.net=source.net;lock.netSource=source.source;derivedNets++}
    lock.pickId=lock.pickId||source.id;
    if(!lock.frozen)lock.frozen={...source,raw:undefined,grade:lock.grade||'',source:'Exact source match for frozen card: '+source.source};
    return lock;
  });
  const archivedRanks=new Map<string,Map<number,any[]>>();
  const archivedRows=new Map<string,any[]>();
  let invalidArchiveRanks=0,duplicateArchiveRows=0,conflictingArchiveRanks=0;
  for(const lock of resolved){
    if(lock.raw?.[5]!==true)continue;
    const groupKey=lock.date+'|'+lock.analyst;
    archivedRows.set(groupKey,[...(archivedRows.get(groupKey)||[]),lock]);
    if(!archivedRanks.has(groupKey))archivedRanks.set(groupKey,new Map());
    const rank=Number(lock.rank);
    if(!Number.isInteger(rank)||rank<1||rank>5){lock.statsEligible=false;lock.archiveIssue='Invalid archived rank';invalidArchiveRanks++;continue}
    const ranks=archivedRanks.get(groupKey)!;ranks.set(rank,[...(ranks.get(rank)||[]),lock]);
  }
  const archiveReview:any[]=[];
  for(const [groupKey,ranks] of archivedRanks){
    const all=archivedRows.get(groupKey)!;
    const conflicts:number[]=[];
    for(const [rank,rows] of ranks){
      if(rows.length<2)continue;
      const signatures=new Set(rows.map(lock=>{const parsed=parseLockCard(lock);return JSON.stringify({event:parsed?lockMatchKey(parsed):lock.card,sport:lock.sport,grade:lock.grade||'',result:lock.result||'',net:lock.net,risk:lockTerms(lock).risk,sanity:!!lock.calculationSanityFailure})}));
      if(signatures.size>1){
        conflictingArchiveRanks++;conflicts.push(rank);
        for(const lock of rows){lock.statsEligible=false;lock.archiveIssue='Conflicting archived cards for the same rank';lock.conflictingArchiveIds=rows.map(l=>l.id)}
      }else{
        const sorted=[...rows].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
        for(const lock of sorted.slice(1)){lock.statsEligible=false;lock.archiveIssue='Identical archived duplicate retained as source only';lock.duplicateOf=sorted[0].id;duplicateArchiveRows++}
      }
    }
    const present=new Set(all.filter(l=>l.statsEligible).map(l=>Number(l.rank)));
    const missing=[1,2,3,4,5].filter(rank=>!present.has(rank));
    if(missing.length||conflicts.length){
      archiveReview.push({date:all[0].date,analyst:all[0].analyst,missingRanks:missing,conflictingRanks:conflicts,cards:all.map(l=>({id:l.id,rank:l.rank,card:l.card,grade:l.grade,result:l.result,net:l.net,issue:l.archiveIssue||''}))});
      for(const lock of all){lock.archiveSetIncomplete=true;lock.missingArchiveRanks=missing}
    }
  }
  return {locks:resolved,health:{matched,unresolved,formulaResults,formulaResolved,formulaSanityFailures,formulaUnresolved:formulaResults-formulaResolved,sourceOnlyDrafts:resolved.filter(l=>!l.statsEligible&&l.raw?.[5]!==true).length,derivedSports,derivedRisks,derivedNets,gradeReviews,cardGradeRecoveries,evidenceGradeRecoveries,gradeEvidence:resolved.filter(l=>l.gradeEvidence).map(l=>({id:l.id,date:l.date,analyst:l.analyst,rank:l.rank,grade:l.grade,source:l.gradeSource,...l.gradeEvidence})),gradeReview:resolved.filter(l=>l.gradeReview).map(l=>({id:l.id,date:l.date,analyst:l.analyst,rank:l.rank,card:l.card,source:l.source,reason:l.gradeReview,candidates:l.gradeReviewCandidates||[]})),invalidArchiveRanks,duplicateArchiveRows,conflictingArchiveRanks,incompleteArchiveSets:archiveReview.length,archiveReview}};
}
