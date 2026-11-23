// "Numbers Don't Lie" (Boss 11/23): the crew dashboard. Results, win %, trends, where we eat, where we bleed.
// Computed on the phone from the cached book (/api/numbers in adapter.ts); live ✓/✕ grades count right away.
import { useEffect, useState } from 'react';
import { art } from '../src/lib/engine';

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

export default function Numbers({ sport, revision }: { sport: string; revision: any }) {
  const [range, setRange] = useState('30'), [d, setD] = useState<any>(null), [err, setErr] = useState('');
  useEffect(() => { let live = true; setErr(''); fetch('/api/numbers?sport=' + encodeURIComponent(sport) + '&range=' + range).then(r => r.json()).then(v => { if (!live) return; if (v.error) setErr(v.error); else setD(v) }).catch(e => live && setErr(String(e))); return () => { live = false } }, [sport, range, revision]);
  if (err) return <div className="empty-card"><h3>The numbers tripped</h3><p>{err}</p></div>;
  if (!d) return <div className="empty-card"><NumbersIcon size={28} /><h3>Running the numbers…</h3><p>Crunching every pick in the book.</p></div>;
  const crew = d.analysts.filter((a: any) => a.analyst !== 'Johnny Biz').sort((a: any, b: any) => b.net - a.net);
  const boss = d.analysts.find((a: any) => a.analyst === 'Johnny Biz');
  const best = crew[0], worst = crew[crew.length - 1];
  const sports = [...new Set<string>(d.heat.map((h: any) => h.sport))].sort();
  const heatCell = (s: string, l: string) => d.heat.find((h: any) => h.sport === s && h.lane === l);
  return <div className="ndl">
    <div className="ndl-chips" role="group" aria-label="Range">{RANGES.map(([k, t]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{t}</button>)}</div>

    <div className="ndl-kpis">
      <Ring value={d.crew.rate} label="CREW WIN %" sub={rec(d.crew) + ' · all cards'} />
      <Ring value={d.crewLocks.rate} label="LOCK ROOM WIN %" sub={rec(d.crewLocks) + ' · ' + money(d.crewLocks.net)} color="#b48cff" />
      <div className="ndl-kpi"><span>CREW MONEY</span><strong className={tone(d.crew.net)}>{money(d.crew.net)}</strong><small>ROI {pct(d.crew.roi)} on {d.crew.n.toLocaleString()} picks</small><Spark pts={d.nightly.reduce((a: number[], r: any) => (a.push((a[a.length - 1] || 0) + r.net), a), [])} /></div>
      <div className="ndl-kpi boss"><img src="art/mafia-johnny.webp" alt="" /><span>YOUR TICKETS</span><strong className={tone(boss?.net)}>{boss ? money(boss.net) : '—'}</strong><small>{boss ? rec(boss) + ' · ' + pct(boss.rate) + ' winners' : 'No tickets'}</small></div>
    </div>

    {best && worst && best !== worst && <div className="ndl-callouts">
      <div className="green-edge"><img src={pic(best.analyst)} alt="" /><div><span>{best.net > 0 ? 'RUNNING THE TABLE' : 'LEAST DAMAGE'}</span><b>{SHORT[best.analyst]}</b><small>{money(best.net)} · {rec(best)} · ROI {pct(best.roi)}</small></div></div>
      <div className="red-edge"><img src={pic(worst.analyst)} alt="" /><div><span>BLEEDING THE BOOK</span><b>{SHORT[worst.analyst]}</b><small>{money(worst.net)} · {rec(worst)} · ROI {pct(worst.roi)}</small></div></div>
    </div>}

    <div className="section-title"><h2>The Standings <span>{RANGES.find(r => r[0] === range)?.[1].toUpperCase()}</span></h2></div>
    <div className="ndl-standings">{[...crew, ...(boss && boss.n ? [boss] : [])].map((a: any, i: number) => <div key={a.analyst} className={'ndl-row' + (a.analyst === 'Johnny Biz' ? ' boss' : '')}>
      <span className="ndl-rank">{a.analyst === 'Johnny Biz' ? '♛' : String(i + 1).padStart(2, '0')}</span>
      <img src={pic(a.analyst)} alt="" />
      <div className="ndl-name"><b>{SHORT[a.analyst]}</b><small>{rec(a)} · {pct(a.rate)}{a.hot != null && Math.abs(a.hot) >= 0.03 && <em className={a.hot > 0 ? 'green' : 'red'}> {a.hot > 0 ? '▲' : '▼'} {Math.abs(Math.round(a.hot * 100))}% last 7</em>}</small>
        <div className="ndl-dots">{a.last10.map((r: string, j: number) => <i key={j} className={r === 'W' ? 'w' : r === 'L' ? 'l' : 'p'} />)}{a.streak && a.streak.n >= 3 && <em className={a.streak.r === 'W' ? 'green' : 'red'}>{a.streak.r === 'W' ? '🔥' : '🧊'} {a.streak.n} {a.streak.r === 'W' ? 'up' : 'down'} nights</em>}</div></div>
      <div className="ndl-winbar"><i style={{ width: pct(a.rate) }} className={(a.rate ?? 0) >= 0.524 ? 'g' : 'r'} /></div>
      <div className="ndl-money"><b className={tone(a.net)}>{money(a.net)}</b><small>ROI {pct(a.roi)}</small></div>
      <div className="ndl-locks"><small>LOCKS</small><b>{a.locks.n ? rec(a.locks) : '—'}</b><small className={tone(a.locks.net)}>{a.locks.n ? money(a.locks.net) : ''}</small></div>
      <Spark pts={a.spark} />
    </div>)}</div>
    <p className="ndl-note">Dots = last 10 nights (green made money, red lost). 52.4% is break-even at −110; the gold tick on the bar marks it.</p>

    <div className="section-title"><h2>Crew Money by Night <span>LAST {d.nightly.length} DAYS</span></h2></div>
    <div className="panel ndl-panel"><Bars rows={d.nightly} /></div>

    <div className="ndl-two">
      <div className="panel ndl-panel"><h3 className="green">🍽️ Where We Eat</h3><p>Best lanes by ROI (15+ decisions)</p>{d.eat.map((r: any) => <div key={r.analyst + r.sport + r.lane} className="ndl-lane"><img src={pic(r.analyst)} alt="" /><div><b>{SHORT[r.analyst]} · {r.sport} {r.lane}</b><small>{rec(r)} · {pct(r.rate)}</small></div><strong className="green">{money(r.net)}<small>ROI {pct(r.roi)}</small></strong></div>)}{!d.eat.length && <p>No lane has 15 decisions in this range yet.</p>}</div>
      <div className="panel ndl-panel"><h3 className="red">🩸 Where We Bleed</h3><p>Biggest money leaks (15+ decisions)</p>{d.bleed.map((r: any) => <div key={r.analyst + r.sport + r.lane} className="ndl-lane"><img src={pic(r.analyst)} alt="" /><div><b>{SHORT[r.analyst]} · {r.sport} {r.lane}</b><small>{rec(r)} · {pct(r.rate)}</small></div><strong className="red">{money(r.net)}<small>ROI {pct(r.roi)}</small></strong></div>)}{!d.bleed.length && <p>Nobody’s leaking. Enjoy it.</p>}</div>
    </div>

    <div className="section-title"><h2>The Heat Map <span>CREW WIN % + MONEY BY LANE</span></h2></div>
    <div className="panel table-wrap ndl-heat"><table><thead><tr><th></th>{LANES.map(l => <th key={l}>{l.replace('ML chalk -300+', 'ML −300+').replace('ML longshot +400', 'ML +400')}</th>)}</tr></thead><tbody>{sports.map(s => <tr key={s}><th>{s}</th>{LANES.map(l => { const c = heatCell(s, l); const r = c?.rate, roi = c?.roi; const bg = roi == null || c.w + c.l < 10 ? '' : roi >= 0.05 ? 'h3' : roi > 0 ? 'h2' : roi > -0.03 ? 'h1' : roi > -0.08 ? 'c1' : 'c2'; return <td key={l} className={bg}>{c && c.w + c.l ? <><b>{pct(r)}</b><small>{c.w}–{c.l} · ROI {pct(roi)}</small></> : '·'}</td> })}</tr>)}</tbody></table></div>
    <p className="ndl-note">Big number = win %. Color = money (ROI): green made money, red lost it. Moneyline favorites win a lot and still lose money, so trust the color. Under 10 decisions stays gray.</p>

    <div className="ndl-two">
      <div className="panel ndl-panel"><h3>🤝 When the Crew Agrees</h3><p>Same side, same game, same bet type</p>{[2, 3, 4, 5].map(n => { const a = d.agree[n]; if (!a || !(a.w + a.l)) return null; const r = a.w / (a.w + a.l); return <div key={n} className="ndl-agree"><span>{n === 5 ? '5+' : n} agree</span><div className="ndl-winbar"><i style={{ width: pct(r) }} className={r >= 0.524 ? 'g' : 'r'} /></div><b>{pct(r)}</b><small>{a.w}–{a.l}</small></div> })}</div>
      <div className="panel ndl-panel"><h3>🔒 Lock Room by Grade</h3><p>Crew locks, graded before tip</p>{['A', 'B', 'C'].map(g => { const x = d.grades[g]; if (!x || !x.n) return null; return <div key={g} className="ndl-agree"><span className="ndl-grade">{g}</span><div className="ndl-winbar"><i style={{ width: pct(x.rate) }} className={(x.rate ?? 0) >= 0.524 ? 'g' : 'r'} /></div><b>{pct(x.rate)}</b><small>{rec(x)} · <em className={tone(x.net)}>{money(x.net)}</em></small></div> })}</div>
    </div>
  </div>;
}
