import { R } from './ranks.tsx';
// "Get Money" (Boss 11/17): live sweat board for every game on tonight's card.
// Scores from ESPN every 5 minutes. lcn.auto_grade (pg_cron, every 3 min) writes official results as games go final.
import { useMemo, useState } from 'react';
import { art, crew, offset, summarize } from '../src/lib/engine';
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
// Boss 11/20: his parlay/teaser legs go on the feed (crown + live-first) for sweating only.
// The ticket row stores legs as matchup 'NBA:Away at Home | CFB:...' and pick 'Team -2 | Over 222'.
// Legs never count in the strip money or record; only the whole ticket gets graded.
const legsOf = (p: any): any[] => {
  if (p.analyst !== 'Johnny Biz' || !/^(Parlay|Teaser)$/.test(p.market)) return [];
  const ms = String(p.matchup || '').split(' | '), ks = String(p.pick || '').split(' | ');
  if (ms.length < 2 || ms.length !== ks.length) return [];
  return ms.map((m, i) => {
    const mm = m.match(/^([A-Z]{2,4}):\s*(.+)$/), pk = ks[i].trim();
    return { ...p, id: p.id + '#' + i, sport: mm ? mm[1] : p.sport, matchup: (mm ? mm[2] : m).trim(), pick: pk, market: /^(over|under)\b/i.test(pk) ? 'Total' : /\sML$/i.test(pk) ? 'ML' : 'Spread', odds: null, result: '', leg: ms.length };
  });
};
const STATUS: Record<string, string> = { W: '✓', L: '✕', Push: '∞', up: '▲', down: '▼', even: '=' };

// Boss 11/26: TONIGHT / LAST NIGHT switch. Last night = just the crew's records and money, no games.
export default function GetMoney({ data, sport }: { data: any; sport: string }) {
  const [view, setView] = useState<'tonight' | 'last'>('tonight');
  return <>
    <div className="bb-switch" role="tablist" aria-label="Tonight or last night">
      <button role="tab" aria-selected={view === 'tonight'} className={view === 'tonight' ? 'on' : ''} onClick={() => setView('tonight')}>TONIGHT</button>
      <button role="tab" aria-selected={view === 'last'} className={view === 'last' ? 'on' : ''} onClick={() => setView('last')}>LAST NIGHT</button>
    </div>
    {view === 'tonight' ? <Tonight data={data} sport={sport} /> : <LastNight data={data} sport={sport} />}
  </>;
}

export function LastNight({ data, sport }: { data: any; sport: string }) {
  const yest = offset(data.date, -1);
  const fits = (r: any) => r.date === yest && (sport === 'All' || r.sport === sport);
  const perf = (data.performance || []).filter(fits);
  const lockRows = (data.locks || []).filter(fits);
  const names = [...crew, 'Johnny Biz'];
  const rows = names.map(n => ({ n, s: summarize(perf.filter((p: any) => p.analyst === n)), k: summarize(lockRows.filter((l: any) => l.analyst === n)) }))
    .filter(r => r.s.count).sort((a, b) => b.s.net - a.s.net);
  const crewTot = summarize(perf.filter((p: any) => crew.includes(p.analyst)));
  const rec = (x: any) => x.w + '–' + x.l + (x.push ? '–' + x.push : '');
  const wp = (x: any) => x.w + x.l ? Math.round(100 * x.w / (x.w + x.l)) + '%' : '—';
  const day = new Date(yest + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return <div className="gm gm-last">
    <div className="gm-bar"><div><span>LAST NIGHT</span> <b>{day}</b>{sport !== 'All' ? <> · <b>{sport}</b></> : null}</div></div>
    {rows.length ? <>
      <div className="gm-last-total">
        <div><small>CREW RECORD</small><b>{rec(crewTot)}</b><em>{wp(crewTot)}</em></div>
        <div><small>CREW MONEY</small><strong className={crewTot.net > 0 ? 'green' : crewTot.net < 0 ? 'red' : ''}>{money(crewTot.net)}</strong></div>
      </div>
      <div className="gm-last-list">{rows.map((r, i) => <div key={r.n} className={'gm-last-row' + (r.n === 'Johnny Biz' ? ' boss' : '')}>
        <span className="gm-last-rank">{i + 1}</span>
        <img src={r.n === 'Johnny Biz' ? 'art/johnny-free-face.webp' : pic(r.n)} alt="" />
        <div className="gm-last-name"><b>{SHORT[r.n]}</b><small>{rec(r.s)} · {wp(r.s)}{r.k.w + r.k.l + r.k.push ? ' · locks ' + rec(r.k) : ''}</small></div>
        <strong className={r.s.net > 0 ? 'green' : r.s.net < 0 ? 'red' : ''}>{money(r.s.net)}</strong>
      </div>)}</div>
      {rows.some(r => r.s.pending) && <p className="muted">Some of last night's picks are still pending. The grader settles them as the finals come in.</p>}
    </> : <p className="muted">Nothing settled from last night{sport !== 'All' ? ' in ' + sport : ''}.</p>}
  </div>;
}

function Tonight({ data, sport }: { data: any; sport: string }) {
  const { games, stamp, reload } = useLiveData(data.date, 300000);
  const names = [...crew, 'Johnny Biz'];
  const picks = useMemo(() => (data.current || []).flatMap((p: any) => MK.includes(p.market) ? [p] : legsOf(p)).filter((p: any) => names.includes(p.analyst) && MK.includes(p.market) && (sport === 'All' || p.sport === sport)), [data.current, sport]);

  const rows = picks.map((p: any) => { const g = findGame(games, p.sport, p.matchup); return { p, g, s: p.result || evalPick(p.pick, p.market, g) } });

  // Top strip: each analyst's night so far (finals count, live shown as up/down)
  const strip = names.map(n => {
    const mine = rows.filter((r: any) => r.p.analyst === n && !r.p.leg);
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
  for (const r of x.rows) { const k = r.p.market + '|' + r.p.pick.toLowerCase() + (r.p.leg ? '|leg' : ''); const v = groups.get(k) || { market: r.p.market, pick: r.p.pick, odds: r.p.odds, s: r.s, leg: r.p.leg || 0, who: [] as string[] }; if (!v.who.includes(r.p.analyst)) v.who.push(r.p.analyst); groups.set(k, v) }
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
      <div className="gm-pick"><b><R t={sd.pick} s={x.sport}/></b> <small>{sd.leg ? sd.leg + '-leg ticket · ' : oddsText(sd.odds) + ' · '}{sd.market === 'ML' ? 'Moneyline' : sd.market}</small></div>
      <div className="gm-who">{sd.who.map((n: string) => n === 'Johnny Biz' ? <span key={n} className="gm-boss"><DenCrown size={22}/><small>BOSS</small></span> : <img key={n} src={pic(n)} alt={SHORT[n]} title={SHORT[n]} />)}</div>
    </div>)}</div>}
  </section>;
}
