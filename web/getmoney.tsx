import { R } from './ranks.tsx';
// "Get Money" (Boss 11/17): live sweat board for every game on tonight's card.
// Scores from ESPN every 5 minutes. lcn.auto_grade (pg_cron, every 3 min) writes official results as games go final.
import { useEffect, useMemo, useState } from 'react';
import { api } from './adapter.ts';
import { art, crew, offset, summarize } from '../src/lib/engine';
// Boss 11/17: gold crown + BOSS under it marks his tickets (same crown as Locked & Loaded)
function DenCrown({size=24}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 240 200" fill="currentColor" aria-hidden="true" focusable="false"><defs><path id="den-fleur" d="M0-35C-13-23-16-12-8-4C-19-14-31-7-27 4C-24 13-13 14-10 6C-11 18-5 21 0 22C5 21 11 18 10 6C13 14 24 13 27 4C31-7 19-14 8-4C16-12 13-23 0-35ZM-10 26H10V32H-10Z"/></defs><use href="#den-fleur" transform="translate(120 37) scale(.95)"/><use href="#den-fleur" transform="translate(62 65) scale(.7)"/><use href="#den-fleur" transform="translate(178 65) scale(.7)"/><use href="#den-fleur" transform="translate(18 72) rotate(-22) scale(.58)"/><use href="#den-fleur" transform="translate(222 72) rotate(22) scale(.58)"/><path d="M17 88Q34 126 59 130L59 88Q77 124 97 126L120 69L143 126Q163 124 181 88L181 130Q206 126 223 88L200 157Q120 134 40 157Z"/><path d="M41 164Q120 141 199 164L196 176Q120 156 44 176Z"/><path d="M44 183Q120 163 196 183L194 193Q120 175 46 193Z"/><path d="M120 137L124 143L120 149L116 143Z" fill="#0b0e12"/></svg>}
import { useLiveData, findGame, evalPick, fetchGames, type Game } from './live';

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
export default function GetMoney({ data, sport, den }: { data: any; sport: string; den?: { w: number; l: number; p: number } }) {
  const [view, setView] = useState<'tonight' | 'last'>('tonight');
  return <>
    <div className="bb-switch" role="tablist" aria-label="Tonight or last night">
      <button role="tab" aria-selected={view === 'tonight'} className={view === 'tonight' ? 'on' : ''} onClick={() => setView('tonight')}>TONIGHT</button>
      <button role="tab" aria-selected={view === 'last'} className={view === 'last' ? 'on' : ''} onClick={() => setView('last')}>LAST NIGHT</button>
    </div>
    {view === 'tonight' ? <Tonight data={data} sport={sport} /> : <LastNight data={data} sport={sport} den={den} />}
  </>;
}

// Boss 11/26: last night uses the same tall boxes as tonight, with Nino's "Morning After" portraits,
// and four records up top: Shortlist, Locks, Lions Den, Crew.
const morning = (n: string) => 'art/morning-' + art[n] + '.webp';
export function LastNight({ data, sport, den }: { data: any; sport: string; den?: { w: number; l: number; p: number } }) {
  const yest = offset(data.date, -1);
  const fits = (r: any) => r.date === yest && (sport === 'All' || r.sport === sport);
  const perf = (data.performance || []).filter(fits);
  const lockRows = (data.locks || []).filter(fits);
  const names = [...crew, 'Johnny Biz'];
  const rows = names.map(n => ({ n, s: summarize(perf.filter((p: any) => p.analyst === n)) })).filter(r => r.s.count).sort((a, b) => b.s.net - a.s.net);
  const crewTot = summarize(perf.filter((p: any) => crew.includes(p.analyst)));
  const lockTot = summarize(lockRows.filter((l: any) => crew.includes(l.analyst)));
  const [sl, setSl] = useState<{ w: number; l: number; p: number; net: number } | null>(null);
  const [sheet, setSheet] = useState('');
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const all: any[] = await api('shortlists');
        const row = (all || []).find((x: any) => x.date === yest);
        const plays = (row?.plays || []).filter((x: any) => sport === 'All' || x.sport === sport);
        const games = plays.some((x: any) => !x.result) ? await fetchGames(yest) : {};
        const t = { w: 0, l: 0, p: 0, net: 0 };
        for (const x of plays) {
          const mk = /^(over|under)\b/i.test(x.pick) || /\b(over|under)\s+\d/i.test(x.pick) ? 'Total' : /\sML$/i.test(x.pick) ? 'ML' : 'Spread';
          const pk = mk === 'Total' ? String(x.pick).replace(/^.*?\b(Over|Under)\b/i, '$1') : x.pick;
          const res = x.result || evalPick(pk, mk, findGame(games, x.sport, x.matchup));
          const o = Number(x.odds) || -110;
          if (res === 'W') { t.w++; t.net += x.net_cents ?? Math.round(o < 0 ? 20000 * 100 / -o : 20000 * o / 100) }
          else if (res === 'L') { t.l++; t.net -= 20000 } else if (/^push$/i.test(res)) t.p++;
        }
        if (!dead) setSl(row ? t : null);
      } catch { if (!dead) setSl(null) }
    })();
    return () => { dead = true };
  }, [yest, sport]);
  const rec = (x: any) => x.w + '–' + x.l + ((x.push ?? x.p) ? '–' + (x.push ?? x.p) : '');
  const tone = (n: number) => n > 0 ? 'green' : n < 0 ? 'red' : '';
  const wl = (x: any) => x.w > x.l ? 'green' : x.l > x.w ? 'red' : '';
  const day = new Date(yest + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return <div className="gm gm-last">
    <div className="gm-bar"><div><span>LAST NIGHT</span> <b>{day}</b>{sport !== 'All' ? <> · <b>{sport}</b></> : null}</div></div>
    <div className="gm-last-total">
      <div><small>SHORTLIST</small><b className={sl ? wl(sl) : ''}>{sl ? rec(sl) : '—'}</b><em className={sl ? tone(sl.net) : ''}>{sl ? money(sl.net) : 'No list'}</em></div>
      <div><small>LOCKS</small><b className={wl(lockTot)}>{rec(lockTot)}</b><em className={tone(lockTot.net)}>{money(lockTot.net)}</em></div>
      <div><small>LIONS DEN</small><b className={den ? wl(den) : ''}>{den ? rec(den) : '—'}</b><em>{den && den.w + den.l ? Math.round(100 * den.w / (den.w + den.l)) + '%' : 'No Den'}</em></div>
      <div><small>CREW</small><b className={wl(crewTot)}>{rec(crewTot)}</b><em className={tone(crewTot.net)}>{money(crewTot.net)}</em></div>
    </div>
    {rows.length ? <div className="gm-strip gm-strip-last">{rows.map(r => <div key={r.n} role="button" tabIndex={0} onClick={() => setSheet(r.n)} className={'gm-box gm-tap' + (r.n === 'Johnny Biz' ? ' boss' : '')}>
      <img src={morning(r.n)} onError={(e: any) => { e.currentTarget.onerror = null; e.currentTarget.src = r.n === 'Johnny Biz' ? 'art/johnny-free-face.webp' : pic(r.n) }} alt="" />
      <span>{SHORT[r.n]}</span>
      <b>{rec(r.s)}</b>
      <strong className={tone(r.s.net)}>{money(r.s.net)}</strong>
      <small>{r.s.pending ? r.s.pending + ' pending' : 'done'}</small>
    </div>)}</div> : <p className="muted">Nothing settled from last night{sport !== 'All' ? ' in ' + sport : ''}.</p>}
    {sheet && <AnalystSheet data={data} name={sheet} date={yest} sport={sport} games={null} onClose={() => setSheet('')} />}
  </div>;
}

function Tonight({ data, sport }: { data: any; sport: string }) {
  const { games, stamp, reload } = useLiveData(data.date, 300000);
  const [sheet, setSheet] = useState('');
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
    <div className="gm-strip">{strip.map(x => <div key={x.n} role="button" tabIndex={0} onClick={() => setSheet(x.n)} className={'gm-box gm-tap' + (x.n === 'Johnny Biz' ? ' boss' : '')}>
      <img src={x.n === 'Johnny Biz' ? 'art/johnny-free-face.webp' : pic(x.n)} alt="" />
      <span>{SHORT[x.n]}</span>
      <b>{x.w}–{x.l}{x.push ? '–' + x.push : ''}</b>
      <strong className={x.net > 0 ? 'green' : x.net < 0 ? 'red' : ''}>{money(x.net)}</strong>
      <small>{x.up || x.down ? <><em className="green">{x.up}▲</em> <em className="red">{x.down}▼</em> live</> : x.left ? x.left + ' to go' : 'done'}</small>
    </div>)}</div>
    {sheet && <AnalystSheet data={data} name={sheet} date={data.date} sport={sport} games={games} onClose={() => setSheet('')} />}
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

// Boss 11/26: tap an analyst on Get Money -> their picks, who agrees, and how that crew hits together.
const sideKey = (p: any) => p.market === 'Total' ? String(p.pick).trim().split(/\s+/)[0].toLowerCase() : String(p.pick).replace(/\s*([+\-−]\d+(\.\d+)?|ML|PK)\s*$/i, '').toLowerCase().trim();
const gameKey = (p: any) => p.sport + '|' + String(p.matchup).toLowerCase() + '|' + p.market + '|' + sideKey(p);
export function AnalystSheet({ data, name, date, sport, games, onClose }: { data: any; name: string; date: string; sport: string; picks?: any; games: any; onClose: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [sp, setSp] = useState(sport);
  useEffect(() => { setRows(null); fetch('/api/sheet?date=' + date + '&who=' + encodeURIComponent(name), { cache: 'no-store' }).then(r => r.json()).then(v => setRows(Array.isArray(v) ? v : [])).catch(() => setRows([])) }, [date, name, data?.revision]);
  const sportsHere = ['NBA', 'NFL', 'CBB', 'CFB'].filter(x => (rows || []).some((r: any) => r.sport === x));
  const mine = (rows || []).filter((r: any) => sp === 'All' || r.sport === sp).map((r: any) => ({ ...r, st: r.result || (games ? evalPick(r.pick, r.market, findGame(games, r.sport, r.matchup)) : '') }))
    .sort((a: any, b: any) => b.others.length - a.others.length || String(a.matchup).localeCompare(b.matchup));
  // Boss 11/26: silver crown = the best-earning group on this sheet; gold crown + BOSS = Boss is on that side
  const best = mine.filter((r: any) => !r.solo && r.w + r.l >= 5 && r.net > 0).sort((a: any, b: any) => b.net - a.net)[0]?.id;
  const day = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const laneTxt = (r: any) => String(r.lane || '').replace('ML chalk -300+', 'ML −300 or worse').replace('ML longshot +400', 'ML +400 or more').replace('Fav spread', 'Favorite spread');
  return <div className="gm-sheet-wrap" onClick={onClose}><div className="gm-sheet" onClick={e => e.stopPropagation()}>
    <div className="gm-sheet-head"><img src={name === 'Johnny Biz' ? 'art/johnny-free-face.webp' : pic(name)} alt="" /><div><b>{SHORT[name]}</b><small>{day} · {mine.length} picks</small></div><div className="gm-sheet-sports">{['All', ...sportsHere].map(x => <button key={x} className={sp === x ? 'on' : ''} onClick={() => setSp(x)}>{x === 'All' ? 'ALL' : x}</button>)}</div><button onClick={onClose} aria-label="Close">✕</button></div>
    {rows === null ? <p className="muted">Loading…</p> : !mine.length ? <p className="muted">No picks{sp !== 'All' ? ' in ' + sp : ''}.</p> :
    mine.map((r: any) => { const n = r.w + r.l, has = n >= 5; return <div key={r.id} className={'gm-sheet-row ' + (r.st === 'W' || r.st === 'up' ? 'win' : r.st === 'L' || r.st === 'down' ? 'lose' : '')}>
      <span className="gm-mark">{STATUS[r.st] || '•'}</span>
      <div className="gm-sheet-pick"><b><R t={r.pick} s={r.sport} /></b> <small>{oddsText(r.odds)} · {r.sport}</small><small className="gm-sheet-game"><R t={r.matchup} s={r.sport} /></small>
        <div className="gm-sheet-agree">{r.others.length ? r.others.map((x: string) => x === 'Johnny Biz' ? <span key={x} className="gm-boss gm-sheet-boss"><DenCrown size={20} /><small>BOSS</small></span> : <img key={x} src={pic(x)} alt={SHORT[x]} title={SHORT[x]} />) : null}<em>{(r.solo ? 'Riding solo · ' : '') + (has ? r.w + '–' + r.l + (r.solo ? '' : ' together') + ' · ' + laneTxt(r) + ' · 60 days' : 'under 5 games in ' + laneTxt(r))}</em></div>
      </div>
      {has ? <div className="gm-sheet-rate">{r.id === best && <span className="gm-silver" title="Best group on this card"><DenCrown size={22} /></span>}<strong className={r.w > r.l ? 'green' : r.l > r.w ? 'red' : ''}>{Math.round(100 * r.w / n)}%</strong><small className={r.net > 0 ? 'green' : r.net < 0 ? 'red' : ''}>{money(r.net)}</small></div> : <div />}
    </div> })}
  </div></div>;
}
