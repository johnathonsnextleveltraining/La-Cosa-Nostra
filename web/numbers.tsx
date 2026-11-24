// "Numbers Don't Lie" (Boss 11/23): the crew dashboard. Results, win %, trends, where we eat, where we bleed.
// Computed on the phone from the cached book (/api/numbers in adapter.ts); live ✓/✕ grades count right away.
import { useEffect, useState } from 'react';
import { art } from '../src/lib/engine';
import { R } from './ranks.tsx';

const SHORT: Record<string, string> = { 'Hova Da God': 'Hova', 'Nino Brown': 'Nino', "G' Money": 'G’ Money', 'Sharp Syndicate': 'Sharps', 'Paulie Publix': 'Paulie', Rithmm: 'Rithmm', 'Johnny Biz': 'Johnny Biz' };
const pic = (n: string) => 'art/jail-' + art[n] + (n === 'Nino Brown' ? '-diesel' : '') + '.webp';
const money = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '') + '$' + Math.round(Math.abs(c) / 100).toLocaleString('en-US');
const dollars = (d: number) => (d > 0 ? '+' : d < 0 ? '−' : '') + '$' + Math.abs(d).toLocaleString('en-US');
const pct = (x: number | null | undefined) => x == null ? '—' : Math.round(x * 100) + '%';
const rec = (s: any) => s.w + '–' + s.l + (s.push ? '–' + s.push : '');
const tone = (n: number | null | undefined) => n == null ? '' : n > 0 ? 'green' : n < 0 ? 'red' : '';

export function NumbersIcon({ size = 24 }: { size?: number }) {
  // Lie-detector needle over a bar chart: the numbers don't lie.
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, color: 'var(--gold)' }}>
    <path d="M3 3v18h18" /><path d="M7 17v-3" opacity=".55" /><path d="M11 17v-6" opacity=".55" /><path d="M15 17v-4" opacity=".55" /><path d="M19 17V8" opacity=".55" />
    <path d="M3 10h3l2-5 3 10 3-8 2 4h5" />
  </svg>;
}

function Ring({ value, label, sub, color = 'var(--gold)' }: { value: number | null; label: string; sub?: string; color?: string }) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value ?? 0));
  return <div className="ndl-ring">
    <svg viewBox="0 0 90 90" width="96" height="96"><circle cx="45" cy="45" r={r} stroke="#ffffff14" strokeWidth="9" fill="none" /><circle cx="45" cy="45" r={r} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c * v + ' ' + c} transform="rotate(-90 45 45)" /><text x="45" y="51" textAnchor="middle">{pct(value)}</text></svg>
    <div><span>{label}</span>{sub && <small>{sub}</small>}</div>
  </div>;
}

function Spark({ pts }: { pts: number[] }) {
  if (pts.length < 2) return null;
  const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts), span = hi - lo || 1, w = 120, h = 34;
  const xy = pts.map((v, i) => [i * w / (pts.length - 1), h - (v - lo) / span * h]);
  const up = pts[pts.length - 1] >= 0, zero = h - (0 - lo) / span * h;
  return <svg className="ndl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><line x1="0" x2={w} y1={zero} y2={zero} stroke="#ffffff22" strokeDasharray="3 3" /><polyline points={xy.map(p => p.join(',')).join(' ')} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2" /></svg>;
}

function Bars({ rows }: { rows: { d: string; net: number }[] }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.net)));
  return <div className="ndl-bars" role="img" aria-label="Crew money by night">
    {rows.map(r => <div key={r.d} className="ndl-bar" title={r.d + ' ' + dollars(r.net)}>
      <div className="ndl-bar-up">{r.net > 0 && <i style={{ height: (r.net / max * 100) + '%' }} />}</div>
      <div className="ndl-bar-dn">{r.net < 0 && <i style={{ height: (-r.net / max * 100) + '%' }} />}</div>
      <small>{+r.d.slice(8)}</small>
    </div>)}
  </div>;
}

const RANGES: [string, string][] = [['7', 'Last 7'], ['30', 'Last 30'], ['month', 'This Month'], ['all', 'All Time']];
const LANES = ['Fav spread', 'Dog spread', 'Over', 'Under', 'ML fav', 'ML dog', 'ML chalk -300+', 'ML longshot +400'];

const KEY: Record<string, string> = { 'Hova Da God': 'hova', 'Nino Brown': 'nino', "G' Money": 'g', 'Sharp Syndicate': 'sharps', 'Paulie Publix': 'paulie', Rithmm: 'rithmm', 'Johnny Biz': 'johnny' };
const CREW = ['Hova Da God', 'Nino Brown', "G' Money", 'Sharp Syndicate', 'Paulie Publix', 'Rithmm'];
const SQ = (n: string) => 'art/ndl-' + KEY[n] + '-sq.webp', BIG = (n: string) => 'art/ndl-' + KEY[n] + '.webp';
const R2: [string, string][] = [['7', 'Last 7'], ['30', 'Last 30'], ['90', 'Last 90'], ['all', 'All Time']];
const SPORTS = ['NBA', 'NFL', 'CBB', 'CFB'];
const HEAT_LANES = ['Fav spread', 'Dog spread', 'Over', 'Under', 'ML fav', 'ML dog', 'ML chalk -300+', 'ML longshot +400'];
const laneLabel = (l: string) => l.replace('ML chalk -300+', 'ML −300 or worse').replace('ML longshot +400', 'ML +400 or more').replace('Fav spread', 'Favorite spread').replace('Dog spread', 'Dog spread');

/** Semicircle gauge for win %, gold tick at 52.4% break-even. */
function Gauge({ v, label, sub }: { v: number | null; label: string; sub: string }) {
  const x = Math.max(0, Math.min(1, v ?? 0)), R = 40, cx = 50, cy = 50, a = (t: number) => [cx - R * Math.cos(Math.PI * t), cy - R * Math.sin(Math.PI * t)];
  const [ex, ey] = a(x), [bx, by] = a(0.524), good = (v ?? 0) >= 0.524;
  return <div className="g2"><svg viewBox="0 0 100 58"><path d={`M10 50 A40 40 0 0 1 90 50`} stroke="#ffffff18" strokeWidth="9" fill="none" strokeLinecap="round" />{v != null && <path d={`M10 50 A40 40 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} stroke={good ? 'url(#gg)' : 'url(#gr)'} strokeWidth="9" fill="none" strokeLinecap="round" />}<line x1={bx * 0.9 + cx * 0.1} y1={by * 0.9 + cy * 0.1} x2={bx * 1.12 - cx * 0.12} y2={by * 1.12 - cy * 0.12} stroke="var(--gold)" strokeWidth="2" /><defs><linearGradient id="gg"><stop offset="0" stopColor="#1f7a45" /><stop offset="1" stopColor="#3ecf6a" /></linearGradient><linearGradient id="gr"><stop offset="0" stopColor="#7a1f1f" /><stop offset="1" stopColor="#ff5a5a" /></linearGradient></defs><text x="50" y="47" textAnchor="middle" className={good ? 'gtxt green' : 'gtxt red'}>{v == null ? '—' : Math.round(v * 100) + '%'}</text></svg><b>{label}</b><small>{sub}</small></div>;
}
/** Win/loss gradient bar: green wins on the left, red losses on the right. */
function WL({ k, s }: { k: string; s: any }) {
  const t = s.w + s.l || 1;
  return <div className="wl"><div className="wl-top"><b>{k}</b><small>{s.w}–{s.l}{s.push ? '–' + s.push : ''} · <em className={tone(s.net)}>{money(s.net)}</em></small></div><div className="wl-bar"><i className="w" style={{ width: s.w / t * 100 + '%' }}>{s.w ? s.w : ''}</i><i className="l" style={{ width: s.l / t * 100 + '%' }}>{s.l ? s.l : ''}</i></div></div>;
}
/** Running money line: where the bankroll went day by day. */
function MoneyLine({ pts }: { pts: { d: string; cum: number }[] }) {
  if (pts.length < 2) return <p className="ndl-note">Not enough nights yet for a line.</p>;
  const W = 340, H = 150, P = 6, vals = pts.map(p => p.cum / 100), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), sp = hi - lo || 1;
  const X = (i: number) => P + i * (W - 2 * P) / (pts.length - 1), Y = (v: number) => P + (hi - v) / sp * (H - 2 * P), z = Y(0);
  const path = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const end = vals[vals.length - 1], c = end >= 0 ? '#3ecf6a' : '#ff5a5a', peak = Math.max(...vals), low = Math.min(...vals);
  return <div className="ml"><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><defs><linearGradient id="mlf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs><line x1={P} x2={W - P} y1={z} y2={z} stroke="#ffffff33" strokeDasharray="4 4" /><path d={path + ` L${X(vals.length - 1)} ${z} L${X(0)} ${z} Z`} fill="url(#mlf)" /><path d={path} fill="none" stroke={c} strokeWidth="2.5" /><circle cx={X(vals.length - 1)} cy={Y(end)} r="4" fill={c} /></svg>
    <div className="ml-legend"><span>{new Date(pts[0].d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span>High {dollars(Math.round(peak))} · Low {dollars(Math.round(low))}</span><span>{new Date(pts[pts.length - 1].d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
    <div className={'ml-end ' + tone(end)}>{dollars(Math.round(end))}</div></div>;
}
const Faces = ({ names }: { names: string[] }) => <span className="wd-faces">{names.map(n => <img key={n} src={SQ(n)} alt={SHORT[n]} title={SHORT[n]} />)}</span>;
const who = (names: string[]) => names.map(n => SHORT[n]).join(' + ');

export default function Numbers({ revision, footer }: { sport?: string; revision: any; footer?: (sports: string[]) => any }) {
  const [range, setRange] = useState('30'), [sports, setSports] = useState<string[]>([]), [sel, setSel] = useState<string[]>([]), [d, setD] = useState<any>(null), [err, setErr] = useState(''), [day, setDay] = useState('today'), [pick, setPick] = useState<any>(null), [cellData, setCell] = useState<any>(null);
  useEffect(() => {
    let live = true; setErr('');
    const q = new URLSearchParams({ range, sports: sports.join(','), who: sel.join(',') });
    const go = (tries: number) => fetch('/api/ndl?' + q).then(r => r.json()).then(v => { if (!live) return; if (v.error || !v.sum) { if (tries > 0) setTimeout(() => live && go(tries - 1), 2500); else setErr(v.error) } else setD(v) }).catch(e => { if (!live) return; if (tries > 0) setTimeout(() => live && go(tries - 1), 2500); else setErr(String(e)) });
    go(3); return () => { live = false };
  }, [range, sports.join(), sel.join(), revision]);
  useEffect(() => { if (!pick) { setCell(null); return } let live = true; setCell('loading'); fetch('/api/ndl-cell?' + new URLSearchParams({ day, sport: pick.s, lane: pick.l, who: sel.join(',') })).then(r => r.json()).then(v => live && setCell(v && v.sum && Array.isArray(v.games) ? v : { err: v?.error || 'Could not pull those games' })).catch(e => live && setCell({ err: String(e) })); return () => { live = false } }, [pick?.s, pick?.l, day, sel.join(), revision]);
  const flip = (xs: string[], x: string) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  const bar = <div className="ndl2-sticky">
    <div className="ndl2-row">{R2.map(([k, t]) => <button key={k} className={'lg-chip' + (range === k ? ' on' : '')} onClick={() => setRange(k)}>{t}</button>)}</div>
    <div className="ndl2-row"><button className={'lg-chip' + (!sports.length ? ' on' : '')} onClick={() => setSports([])}>All Sports</button>{SPORTS.map(s => <button key={s} className={'lg-chip' + (sports.includes(s) ? ' on' : '')} onClick={() => setSports(x => flip(x, s))}>{s}</button>)}</div>
    <div className="ndl2-row ndl2-faces"><button className={'ndl2-all' + (!sel.length ? ' on' : '')} onClick={() => setSel([])}>The<br />Crew</button>{CREW.map(n => <button key={n} className={'ndl2-face' + (sel.includes(n) ? ' on' : '')} onClick={() => setSel(x => flip(x, n))}><img src={SQ(n)} alt="" /><small>{SHORT[n]}</small></button>)}</div>
  </div>;
  if (err) return <>{bar}<div className="empty-card"><h3>The numbers tripped</h3><p>{err}</p><button className="primary" onClick={() => location.reload()}>Try again</button></div></>;
  if (!d) return <>{bar}<div className="empty-card"><NumbersIcon size={28} /><h3>Running the numbers…</h3><p>Crunching every pick in the book.</p></div></>;
  if (!d.sum) return <>{bar}<div className="empty-card"><NumbersIcon size={28} /><h3>Running the numbers…</h3></div></>;
  const S = d.sum, ranked = [...d.analysts].sort((a: any, b: any) => b.net - a.net), best = ranked[0], worst = ranked[ranked.length - 1];
  const heatSports = [...new Set<string>(d.heat.map((h: any) => h.sport))].sort();
  const cell = (s: string, l: string) => d.heat.find((h: any) => h.sport === s && h.lane === l);
  const title = sel.length ? who(sel) : 'The whole crew';
  const wmax = Math.max(1, ...d.weeds.best.map((r: any) => r.net)), lmax = Math.max(1, ...d.weeds.worst.map((r: any) => -r.net));
  return <div className="ndl ndl2">
    {bar}
    <div className="ndl2-who"><h2>{title}</h2><p>{(sports.length ? sports.join(' + ') : 'All sports')} · {R2.find(r => r[0] === range)![1]} · {S.n.toLocaleString()} picks · <b className={tone(S.net)}>{money(S.net)}</b> · ROI {pct(S.roi)}</p></div>
    {!sel.length && best && worst && best !== worst && <div className="ndl2-bw">
      <div className="bw good"><img src={BIG(best.analyst)} alt="" /><div><span>BEST ANALYST</span><b>{SHORT[best.analyst]}</b><small>{rec(best)} · {pct(best.rate)} · <em className={tone(best.net)}>{money(best.net)}</em></small></div></div>
      <div className="bw bad"><img src={BIG(worst.analyst)} alt="" /><div><span>WORST ANALYST</span><b>{SHORT[worst.analyst]}</b><small>{rec(worst)} · {pct(worst.rate)} · <em className={tone(worst.net)}>{money(worst.net)}</em></small></div></div>
    </div>}

    <div className="ndl2-sec"><h2>Raw Numbers</h2></div>
    <div className="g2-row"><Gauge v={S.rate} label="Overall" sub={rec(S)} />{d.byMarket.map((m: any) => <Gauge key={m.k} v={m.rate} label={m.k === 'ML' ? 'Moneyline' : m.k} sub={m.n ? rec(m) : 'none'} />)}</div>
    <p className="ndl-note">Gold tick = 52.4%, break-even at −110.</p>
    <div className="panel wl-panel"><h3>Wins vs Losses</h3>{d.byMarket.filter((m: any) => m.n).map((m: any) => <WL key={m.k} k={m.k === 'ML' ? 'Moneyline' : m.k} s={m} />)}{d.bySport.length > 1 && d.bySport.map((m: any) => <WL key={m.k} k={m.k} s={m} />)}</div>
    <div className="panel"><h3>Money, night by night</h3><MoneyLine pts={d.line} /></div>

    <div className="ndl2-sec"><h2>In the Weeds</h2><span>{sel.length ? 'by bet type' : 'by who agreed + bet type'} · {d.min}+ decisions</span></div>
    <div className="panel wd"><h3 className="green">💰 Where the money comes from</h3>{d.weeds.best.map((r: any, i: number) => <div key={i} className="wd-row"><Faces names={r.names} /><div className="wd-main"><b>{!sel.length ? who(r.names) + ' · ' : ''}{r.sport} {laneLabel(r.lane)}</b><div className="wd-bar"><i className="g" style={{ width: r.net / wmax * 100 + '%' }} /></div><small>{rec(r)} · {pct(r.rate)} · ROI {pct(r.roi)}</small></div><strong className="green">{money(r.net)}</strong></div>)}{!d.weeds.best.length && <p className="ndl-note">Nothing has made money with {d.min}+ decisions in this range.</p>}</div>
    <div className="panel wd"><h3 className="red">🩸 Where the money goes to die</h3><div className="wd-drop">{d.weeds.worst.map((r: any, i: number) => <div key={i} className="wd-col"><strong className="red">{money(r.net)}</strong><div className="wd-pit"><i style={{ height: (-r.net / lmax * 100) + '%' }} /></div><Faces names={r.names} /><b>{!sel.length ? who(r.names) : ''}</b><small>{r.sport} {laneLabel(r.lane)}<br />{rec(r)} · {pct(r.rate)}</small></div>)}</div>{!d.weeds.worst.length && <p className="ndl-note">Nothing is losing money with {d.min}+ decisions. Enjoy it.</p>}</div>

    <div className="section-title"><h2>The Heat Map <span>{title.toUpperCase()}</span></h2></div>
    <div className="panel table-wrap ndl-heat"><table><thead><tr><th></th>{HEAT_LANES.map(l => <th key={l}>{laneLabel(l)}</th>)}</tr></thead><tbody>{heatSports.map(s => <tr key={s}><th>{s}</th>{HEAT_LANES.map(l => { const c = cell(s, l); const roi = c?.roi; const bg = roi == null || c.w + c.l < 10 ? '' : roi >= 0.05 ? 'h3' : roi > 0 ? 'h2' : roi > -0.03 ? 'h1' : roi > -0.08 ? 'c1' : 'c2'; const on = pick && pick.s === s && pick.l === l; return <td key={l} className={bg + ' hm-click' + (on ? ' hm-on' : '')} onClick={() => setPick(on ? null : { s, l })}>{c && c.w + c.l ? <><b>{pct(c.rate)}</b><small>{c.w}–{c.l} · {money(c.net)}</small></> : '·'}</td> })}</tr>)}</tbody></table></div>
    <p className="ndl-note">Big number = win %. Color = money: green made money, red lost it. Under 10 decisions stays gray.</p>
    <div className="hm-switch"><button className={'lg-chip' + (day === 'today' ? ' on' : '')} onClick={() => setDay('today')}>Today</button><button className={'lg-chip' + (day === 'yesterday' ? ' on' : '')} onClick={() => setDay('yesterday')}>Last Night</button><small>{pick ? '' : 'Tap a box on the heat map'}</small></div>
    {pick && <div className="panel hm-games"><div className="hm-head"><b>{pick.s} · {laneLabel(pick.l)} · {day === 'today' ? 'Today' : 'Last Night'}</b><button onClick={() => setPick(null)}>✕</button></div>
      {cellData === 'loading' ? <p className="ndl-note">Pulling the games…</p> : cellData?.err ? <p className="ndl-note">{cellData.err}. Tap the box again.</p> : cellData && <>{(cellData.sum.n > 0 || cellData.pending > 0) && <p className="hm-sum">{cellData.sum.n ? <><b>{rec(cellData.sum)}</b> crew picks · <em className={tone(cellData.sum.net)}>{money(cellData.sum.net)}</em></> : null}{cellData.pending ? (cellData.sum.n ? ' · ' : '') + cellData.pending + ' pending' : ''}</p>}
        {cellData.games.map((g: any, i: number) => <div key={i} className="hm-game"><span className={'lg-mark ' + (g.result === 'W' ? 'w' : g.result === 'L' ? 'l' : 'p')}>{g.result === 'W' ? '✓' : g.result === 'L' ? '✕' : g.result === 'Push' ? '∞' : '•'}</span><div className="hm-main"><b><R t={g.pick} s={pick.s} /> <em>{g.odds > 0 ? '+' + g.odds : g.odds}</em></b><small><R t={g.matchup} s={pick.s} /></small></div><Faces names={g.names} /></div>)}
        {!cellData.games.length && <p className="ndl-note">Nobody {sel.length ? 'you picked ' : ''}had a {pick.s} {laneLabel(pick.l).toLowerCase()} {day === 'today' ? 'today' : 'last night'}.</p>}</>}</div>}

    {d.locks && <><div className="section-title"><h2>🔒 The Locks <span>{title.toUpperCase()}</span></h2></div>
      <div className="panel ndl2-locks"><div className="lk-head"><Gauge v={d.locks.rate} label="Lock win %" sub={rec(d.locks)} /><div><b className={tone(d.locks.net)}>{money(d.locks.net)}</b><small>ROI {pct(d.locks.roi)}</small>{['A', 'B', 'C'].map(g => d.locks.grades[g]?.n ? <div key={g} className="lk-grade"><span>{g}</span>{rec(d.locks.grades[g])} <em className={tone(d.locks.grades[g].net)}>{money(d.locks.grades[g].net)}</em></div> : null)}</div></div>
        {d.locks.recent.map((l: any, i: number) => <div key={i} className="lk-row"><img src={SQ(l.analyst)} alt="" /><span className={'lg-mark ' + (l.result === 'W' ? 'w' : l.result === 'L' ? 'l' : 'p')}>{l.result === 'W' ? '✓' : l.result === 'L' ? '✕' : '∞'}</span><div><b>{l.card}</b><small>{SHORT[l.analyst]} · {l.sport} · {new Date(l.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div></div>)}{!d.locks.n && <p className="ndl-note">No graded locks in this range.</p>}</div></>}

    <div className="section-title"><h2>🤝 When the Crew Agrees</h2></div>
    <div className="panel">{d.together && <div className="agree-sel"><Faces names={sel} /><div><b>When {who(sel)} {sel.length > 2 ? 'all ' : ''}agree</b><small>{rec(d.together)} · {pct(d.together.rate)} · <em className={tone(d.together.net)}>{money(d.together.net)}</em></small></div></div>}
      {[2, 3, 4, 5].map(n => { const a = d.agree[n]; if (!a || !(a.w + a.l)) return null; const r = a.w / (a.w + a.l); return <div key={n} className="ndl-agree"><span>{n === 5 ? '5+' : n} agree</span><div className="ndl-winbar"><i style={{ width: pct(r) }} className={r >= 0.524 ? 'g' : 'r'} /></div><b>{pct(r)}</b><small>{a.w}–{a.l}</small></div> })}
      <div className="agree-grid">{d.withCrew.map((x: any) => { const t = x.agree.w + x.agree.l, u = x.alone.w + x.alone.l; return <div key={x.analyst} className={'agree-card' + (sel.includes(x.analyst) ? ' on' : '')}><img src={BIG(x.analyst)} alt="" /><b>{SHORT[x.analyst]}</b><small>With the crew <em className={t && x.agree.w / t >= 0.524 ? 'green' : 'red'}>{t ? x.agree.w + '–' + x.agree.l + ' · ' + pct(x.agree.w / t) : '—'}</em></small><small>Alone <em className={u && x.alone.w / u >= 0.524 ? 'green' : 'red'}>{u ? x.alone.w + '–' + x.alone.l + ' · ' + pct(x.alone.w / u) : '—'}</em></small></div> })}</div></div>

    {footer && footer(sports)}
  </div>;
}
