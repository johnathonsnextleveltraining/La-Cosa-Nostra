import {norm,type Pick} from './engine.ts';
export const sameTeam=(a:string,b:string)=>{a=norm(a.replace(/^\d+\.\s*/,''));b=norm(b);return !!a&&!!b&&(a===b||a.endsWith(b)||b.endsWith(a))};
export function denMatches(picks:Pick[],sport:string,team:string,details:string,date:string){
 const opponent=details.match(/Playing:\s*(?:vs\.?|@)\s*([^\n]+)/i)?.[1];
 if(!opponent)return [];
 const matches:{line:number,result:string,analyst:string}[]=[];
 for(const p of picks){
  if(p.date!==date||p.sport!==sport||p.market!=='Spread')continue;
  const teams=p.matchup.replace(/\([^)]*\)/g,'').split(/\s+(?:at|@|vs\.?)\s+/i);
  if(teams.length!==2||!((sameTeam(team,teams[0])&&sameTeam(opponent,teams[1]))||(sameTeam(team,teams[1])&&sameTeam(opponent,teams[0]))))continue;
  const m=p.pick.match(/^(.*?)\s+([+-]\d+(?:\.\d+)?)\s*$/);
  if(!m)continue;
  if(sameTeam(team,m[1]))matches.push({line:Number(m[2]),result:p.result,analyst:p.analyst});else if(sameTeam(opponent,m[1]))matches.push({line:-Number(m[2]),result:p.result==='W'?'L':p.result==='L'?'W':p.result,analyst:p.analyst});
 }
 return matches;
}
/** Den line = Hova's DraftKings line when he has one, otherwise the line most of the crew used. */
export function denLine(picks:Pick[],sport:string,team:string,details:string,date:string):number|null{
 const ms=denMatches(picks,sport,team,details,date);if(!ms.length)return null;
 const hova=ms.find(m=>m.analyst==='Hova Da God');if(hova)return hova.line;
 const c=new Map<number,number>();for(const m of ms)c.set(m.line,(c.get(m.line)||0)+1);
 return [...c.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
}
export function denSpread(picks:Pick[],sport:string,team:string,details:string,date:string){
 const n=denLine(picks,sport,team,details,date);if(n===null)return null;return n>0?'+'+n:n===0?'PK':String(n);
}
export function denResult(picks:Pick[],sport:string,team:string,details:string,date:string){
 const line=denLine(picks,sport,team,details,date);if(line===null)return 'Unavailable';
 const matches=denMatches(picks,sport,team,details,date).filter(m=>m.line===line);
 const settled=[...new Set(matches.map(p=>p.result))].filter(r=>['W','L','Push'].includes(r));
 if(settled.length>1)return 'Conflicting results';
 return settled[0]||'Pending';
}
