// "Get Money" (Boss 11/17): live sweat board for every game on tonight's card.
// Scores from ESPN every 5 minutes. Results here are unofficial until the 1:30 AM grader writes them.
import { useMemo, useState } from 'react';
import { art, crew } from '../src/lib/engine';
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
      <img src={x.n === 'Johnny Biz' ? 'art/mafia-johnny.webp' : pic(x.n)} alt="" />
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
      <div><span>{g?.away || away}</span><b>{g && g.state !== 'pre' ? g.as : ''}</b></div>
      <div><span>{g?.home || home}</span><b>{g && g.state !== 'pre' ? g.hs : ''}</b></div>
    </div>
    {!open && <button className="gm-more" onClick={() => setOpen(true)}>{sides.length} picks{boss ? ' · BOSS $ on it' : ''}{up || dn ? ' · ' + up + ' cashing · ' + dn + ' losing' : ''} ▾</button>}
    {open && <div className="gm-sides">{sides.map(sd => <div key={sd.market + sd.pick} className={'gm-side ' + (sd.s === 'W' || sd.s === 'up' ? 'win' : sd.s === 'L' || sd.s === 'down' ? 'lose' : '')}>
      <span className="gm-mark">{STATUS[sd.s] || '•'}</span>
      <div className="gm-pick"><b>{sd.pick}</b> <small>{oddsText(sd.odds)} · {sd.market === 'ML' ? 'Moneyline' : sd.market}</small></div>
      <div className="gm-who">{sd.who.map((n: string) => n === 'Johnny Biz' ? <em key={n} className="gm-boss">BOSS $</em> : <img key={n} src={pic(n)} alt={SHORT[n]} title={SHORT[n]} />)}</div>
    </div>)}</div>}
  </section>;
}
