import { R } from './ranks.tsx';
// "Get Money" (Boss 11/17): live sweat board for every game on tonight's card.
// Scores from ESPN every 5 minutes. Results here are unofficial until the 1:30 AM grader writes them.
import { useMemo, useState } from 'react';
import { art, crew } from '../src/lib/engine';
// Boss 11/17: gold crown + BOSS under it marks his tickets (same crown as Locked & Loaded)
function DenCrown({size=24}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 240 200" fill="currentColor" aria-hidden="true" focusable="false"><defs><path id="den-fleur" d="M0-35C-13-23-16-12-8-4C-19-14-31-7-27 4C-24 13-13 14-10 6C-11 18-5 21 0 22C5 21 11 18 10 6C13 14 24 13 27 4C31-7 19-14 8-4C16-12 13-23 0-35ZM-10 26H10V32H-10Z"/></defs><use href="#den-fleur" transform="translate(120 37) scale(.95)"/><use href="#den-fleur" transform="translate(62 65) scale(.7)"/><use href="#den-fleur" transform="translate(178 65) scale(.7)"/><use href="#den-fleur" transform="translate(18 72) rotate(-22) scale(.58)"/><use href="#den-fleur" transform="translate(222 72) rotate(22) scale(.58)"/><path d="M17 88Q34 126 59 130L59 88Q77 124 97 126L120 69L143 126Q163 124 181 88L181 130Q206 126 223 88L200 157Q120 134 40 157Z"/><path d="M41 164Q120 141 199 164L196 176Q120 156 44 176Z"/><path d="M44 183Q120 163 196 183L194 193Q120 175 46 193Z"/><path d="M120 137L124 143L120 149L116 143Z" fill="#0b0e12"/></svg>}
import { useLiveData, findGame, evalPick, type Game } from './live';

const SHORT: Record<string, string> = { 'Hova Da God': 'Hova', 'Nino Brown': 'Nino', "G' Money": 'G’ Money', 'Sharp Syndicate': 'Sharps', 'Paulie Publix': 'Paulie', Rithmm: 'Rithmm', 'Johnny Biz': 'Johnny Biz' };
const pic = (n: string) => 'art/jail-' + art[n] + (n === 'Nino Brown' ? '-diesel' : '') + '.webp';
const money = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '') + '$' + Math.round(Math.abs(c) / 100).toLocaleString('en-US');
const winOf = (p: any) => { if (p.toWin != null) return Number(p.toWin); const o = Number(p.odds), r = Number(p.risk ?? 20000); return !o ? 0 : o < 0 ? r * 100 / -o : r * o / 100 };
const riskOf = (p: any) => Number(p.risk ?? 20000);
const oddsText = (o: any) => o == null ? '' : Number(o) > 0 ? '+' + o : String(o);
const timeText = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) } catch { return '' } };
const MK = ['Spread', 'Total', 'ML'];
const STATUS: Record<string, string> = { W: '✓', L: '✕', Push: '∞', up: '▲', down: '▼', even: '=' };

export default function GetMoney({ data, sport }: { data: any; sport: string }) {
  const { games, stamp, reload } = useLiveData(data.date, 300000);
  const names = [...crew, 'Johnny Biz'];
  const picks = useMemo(() => (data.current || []).filter((p: any) => names.includes(p.analyst) && MK.includes(p.market) && (sport === 'All' || p.sport === sport)), [data.current, sport]);

  const rows = picks.map((p: any) => { const g = findGame(games, p.sport, p.matchup); return { p, g, s: p.result || evalPick(p.pick, p.market, g) } });

  // Top strip: each analyst's night so far (finals count, live shown as up/down)
  const strip = names.map(n => {
    const mine = rows.filter((r: any) => r.p.analyst === n);
    const t = { w: 0, l: 0, push: 0, up: 0, down: 0, net: 0, left: 0 };
    for (const r of mine) {
      if (r.s === 'W') { t.w++; t.net += winOf(r.p) } else if (r.s === 'L') { t.l++; t.net -= riskOf(r.p) } else if (r.s === 'Push') t.push++;
      else if (r.s === 'up') t.up++; else if (r.s === 'down') t.down++; else t.left++;
    }
    return { n, ...t, count: mine.length };
  }).filter(x => x.count);

  // Games: live first, then upcoming by tip time, then finals
  const byGame = new Map<string, any>();
  for (const r of rows) { const k = r.p.sport + '|' + r.p.matchup.toLowerCase(); const g = byGame.get(k) || { k, sport: r.p.sport, matchup: r.p.matchup, g: r.g, rows: [] }; g.rows.push(r); if (!g.g && r.g) g.g = r.g; byGame.set(k, g) }
  const isBoss = (x: any) => x.rows.some((r: any) => r.p.analyst === 'Johnny Biz');
  // Boss 11/17: live games with his real tickets go first
  const order = (x: any) => !x.g ? 4 : x.g.state === 'in' ? (isBoss(x) ? 0 : 1) : x.g.state === 'pre' ? 2 : 3;
  const list = [...byGame.values()].sort((a, b) => order(a) - order(b) || String(a.g?.start || '').localeCompare(String(b.g?.start || '')) || a.matchup.localeCompare(b.matchup));
  const live = list.filter(x => x.g?.state === 'in').length, fin = list.filter(x => x.g?.state === 'post').length, pre = list.length - live - fin;

  return <div className="gm">
    <div className="gm-bar">
      <div><span className={live ? 'live-dot' : ''}>{live ? 'LIVE' : 'TONIGHT'}</span> <b>{live} going</b> · <b>{pre} to go</b> · <b>{fin} final</b></div>
      <button onClick={reload}>{stamp ? 'Updated ' + new Date(stamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : 'Loading scores…'} ↻</button>
    </div>
    <div className="gm-strip">{strip.map(x => <div key={x.n} className={'gm-box' + (x.n === 'Johnny Biz' ? ' boss' : '')}>
      <img src={x.n === 'Johnny Biz' ? 'art/johnny-free-face.webp' : pic(x.n)} alt="" />
      <span>{SHORT[x.n]}</span>
      <b>{x.w}–{x.l}{x.push ? '–' + x.push : ''}</b>
      <strong className={x.net > 0 ? 'green' : x.net < 0 ? 'red' : ''}>{money(x.net)}</strong>
      <small>{x.up || x.down ? <><em className="green">{x.up}▲</em> <em className="red">{x.down}▼</em> live</> : x.left ? x.left + ' to go' : 'done'}</small>
    </div>)}</div>
    <div className="gm-games">{list.map(x => <GameCard key={x.k} x={x} />)}</div>
    {!list.length && <p className="muted">No picks on tonight's card for this sport.</p>}
  </div>;
}

function GameCard({ x }: { x: any }) {
  const g: Game | null = x.g;
  const [away, home] = x.matchup.split(/\s+at\s+/);
  const groups = new Map<string, any>();
  for (const r of x.rows) { const k = r.p.market + '|' + r.p.pick.toLowerCase(); const v = groups.get(k) || { market: r.p.market, pick: r.p.pick, odds: r.p.odds, s: r.s, who: [] as string[] }; if (!v.who.includes(r.p.analyst)) v.who.push(r.p.analyst); groups.set(k, v) }
  const [openUser, setOpen] = useState<boolean | null>(null);
  const open = openUser ?? g?.state === 'in';
  const sides = [...groups.values()].sort((a, b) => MK.indexOf(a.market) - MK.indexOf(b.market) || b.who.length - a.who.length);
  const up = sides.filter(sd => sd.s === 'W' || sd.s === 'up').length, dn = sides.filter(sd => sd.s === 'L' || sd.s === 'down').length;
  const boss = x.rows.some((r: any) => r.p.analyst === 'Johnny Biz');
  return <section className={'gm-game ' + (g?.state === 'in' ? 'live' + (boss ? ' gm-mine' : '') : g?.state === 'post' ? 'final' : '')}>
    <div className="gm-head" role="button" tabIndex={0} onClick={() => setOpen(!open)}>
      <small>{x.sport}</small>
      {g?.state === 'in' ? <span className="gm-state"><span className="live-dot">LIVE</span> {g.detail}</span> : g?.state === 'post' ? <span className="gm-state">FINAL</span> : <span className="gm-state">{g?.start ? timeText(g.start) : 'Time TBD'}</span>}
    </div>
    <div className="gm-score" role="button" tabIndex={0} onClick={() => setOpen(!open)}>
      <div><span><R t={g?.away || away} s={x.sport}/></span><b>{g && g.state !== 'pre' ? g.as : ''}</b></div>
      <div><span><R t={g?.home || home} s={x.sport}/></span><b>{g && g.state !== 'pre' ? g.hs : ''}</b></div>
    </div>
    {!open && <button className="gm-more" onClick={() => setOpen(true)}>{sides.length} picks{boss ? ' · 👑 BOSS on it' : ''}{up || dn ? ' · ' + up + ' cashing · ' + dn + ' losing' : ''} ▾</button>}
    {open && <div className="gm-sides">{sides.map(sd => <div key={sd.market + sd.pick} className={'gm-side ' + (sd.s === 'W' || sd.s === 'up' ? 'win' : sd.s === 'L' || sd.s === 'down' ? 'lose' : '')}>
      <span className="gm-mark">{STATUS[sd.s] || '•'}</span>
      <div className="gm-pick"><b><R t={sd.pick} s={x.sport}/></b> <small>{oddsText(sd.odds)} · {sd.market === 'ML' ? 'Moneyline' : sd.market}</small></div>
      <div className="gm-who">{sd.who.map((n: string) => n === 'Johnny Biz' ? <span key={n} className="gm-boss"><DenCrown size={22}/><small>BOSS</small></span> : <img key={n} src={pic(n)} alt={SHORT[n]} title={SHORT[n]} />)}</div>
    </div>)}</div>}
  </section>;
}
