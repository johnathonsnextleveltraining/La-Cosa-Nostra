import {norm,type Pick} from './engine.ts';
const sameTeam=(a:string,b:string)=>{a=norm(a.replace(/^\d+\.\s*/,''));b=norm(b);return !!a&&!!b&&(a===b||a.endsWith(b)||b.endsWith(a))};
function denMatches(picks:Pick[],sport:string,team:string,details:string,date:string){
 const opponent=details.match(/Playing:\s*(?:vs\.?|@)\s*([^\n]+)/i)?.[1];
 if(!opponent)return [];
 const matches:{line:number,result:string}[]=[];
 for(const p of picks){
  if(p.date!==date||p.sport!==sport||p.market!=='Spread')continue;
  const teams=p.matchup.replace(/\([^)]*\)/g,'').split(/\s+(?:at|@|vs\.?)\s+/i);
  if(teams.length!==2||!((sameTeam(team,teams[0])&&sameTeam(opponent,teams[1]))||(sameTeam(team,teams[1])&&sameTeam(opponent,teams[0]))))continue;
  const m=p.pick.match(/^(.*?)\s+([+-]\d+(?:\.\d+)?)\s*$/);
  if(!m)continue;
  if(sameTeam(team,m[1]))matches.push({line:Number(m[2]),result:p.result});else if(sameTeam(opponent,m[1]))matches.push({line:-Number(m[2]),result:p.result==='W'?'L':p.result==='L'?'W':p.result});
 }
 return matches;
}
export function denSpread(picks:Pick[],sport:string,team:string,details:string,date:string){
 const values=new Set(denMatches(picks,sport,team,details,date).map(p=>p.line));
 if(values.size!==1)return null;
 const n=[...values][0];return n>0?'+'+n:String(n);
}
export function denResult(picks:Pick[],sport:string,team:string,details:string,date:string){
 const matches=denMatches(picks,sport,team,details,date);
 if(!matches.length)return 'Unavailable';
 if(new Set(matches.map(p=>p.line)).size!==1)return 'Conflicting lines';
 const results=new Set(matches.map(p=>p.result));
 const settled=[...results].filter(r=>['W','L','Push'].includes(r));
 if(settled.length>1)return 'Conflicting results';
 if([...results].some(r=>!['W','L','Push'].includes(r)))return 'Pending';
 return settled[0]||'Pending';
}
