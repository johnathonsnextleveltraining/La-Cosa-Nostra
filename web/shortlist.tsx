// "The Shortlist" (Boss 11/24): Hova's daily 3-6 stacked plays, shown under the Heat Map on Numbers Don't Lie.
// Reads every shortlist:<date> row from lcn.settings (op 'shortlists') and keeps the running record with donut charts.
import { useEffect, useState } from 'react';
import { api } from './adapter.ts';
import { R } from './ranks.tsx';

const money = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '') + '$' + Math.round(Math.abs(c) / 100).toLocaleString('en-US');
const tone = (n: number) => n > 0 ? 'green' : n < 0 ? 'red' : '';
const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
type Rec = { w: number; l: number; p: number; pend: number; net: number; risk: number };
const blank = (): Rec => ({ w: 0, l: 0, p: 0, pend: 0, net: 0, risk: 0 });
const add = (r: Rec, x: any) => { const res = String(x.result || ''); if (res === 'W') r.w++; else if (res === 'L') r.l++; else if (/^push$/i.test(res)) r.p++; else { r.pend++; return } r.net += Number(x.net_cents) || 0; r.risk += 20000 };

/** Donut with gradient-filled slices: green wins, red losses, gray pushes. */
function Donut({ r, size = 150, label, sub }: { r: Rec; size?: number; label: string; sub?: string }) {
  const R0 = 38, C = 2 * Math.PI * R0, t = r.w + r.l + r.p;
  const segs = t ? [['w', r.w], ['l', r.l], ['p', r.p]].filter(([, n]) => +n > 0) as [string, number][] : [];
  let at = 0; const pct = r.w + r.l ? Math.round(100 * r.w / (r.w + r.l)) : null;
  return <div className="sl-donut" style={{ width: size }}>
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="slw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbd791" /><stop offset=".45" stopColor="#b9a25a" /><stop offset="1" stopColor="#3f5a2e" /></linearGradient>
        <linearGradient id="sll" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d828b" /><stop offset=".5" stopColor="#4a4e56" /><stop offset="1" stopColor="#24272c" /></linearGradient>
        <linearGradient id="slp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2e2c0" /><stop offset="1" stopColor="#8a6a45" /></linearGradient>
        
      </defs>
      <circle cx="50" cy="50" r={R0 - 7} fill="#16191e" />
      <circle cx="50" cy="50" r={R0} stroke="#2a2d33" strokeWidth="13" fill="none" />
      {segs.map(([k, n]) => { const len = C * n / t, gap = segs.length > 1 ? 1.2 : 0; const el = <circle key={k} cx="50" cy="50" r={R0} fill="none" stroke={'url(#sl' + k + ')'} strokeWidth="13" strokeDasharray={Math.max(0, len - gap) + ' ' + C} strokeDashoffset={-at} transform="rotate(-90 50 50)" />; at += len; return el })}
      <text x="50" y="49" textAnchor="middle" className="sl-dn-big">{t ? r.w + '–' + r.l + (r.p ? '–' + r.p : '') : '—'}</text>
      <text x="50" y="62" textAnchor="middle" className="sl-dn-small">{pct == null ? 'no results' : pct + '%'}</text>
    </svg>
    <b>{label}</b>
    {sub && <small className={tone(r.net)}>{sub}</small>}
  </div>;
}

export default function Shortlist({ revision, sports }: { revision: any; sports: string[] }) {
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState(''), [open, setOpen] = useState('');
  useEffect(() => { let live = true; api('shortlists').then(v => { if (!live) return; if (Array.isArray(v)) setRows(v); else setErr(v?.error || 'Could not load the shortlist') }).catch(e => live && setErr(String(e))); return () => { live = false } }, [revision]);
  const head = <div className="section-title"><h2>📋 The Shortlist <span>HOVA'S STACKED PLAYS · ALL TIME</span></h2></div>;
  if (err) return <>{head}<p className="ndl-note">{err}</p></>;
  if (!rows) return <>{head}<p className="ndl-note">Pulling the shortlist…</p></>;
  const keep = (x: any) => !sports.length || sports.includes(x.sport);
  const days = rows.map(s => ({ date: s.date as string, plays: ((s.plays || []) as any[]).filter(keep) })).filter(s => s.plays.length);
  const all = blank(), bySport: Record<string, Rec> = {};
  for (const s of days) for (const x of s.plays) { add(all, x); add(bySport[x.sport] ||= blank(), x) }
  const latest = days[0]; const shown = open || latest?.date;
  const roi = all.risk ? Math.round(1000 * all.net / all.risk) / 10 : null;
  return <>{head}
    <div className="panel sl-panel">
      {!days.length ? <p className="ndl-note">No shortlist plays{sports.length ? ' for ' + sports.join(' + ') : ''} yet.</p> : <>
        <div className="sl-top">
          <Donut r={all} size={170} label="Shortlist record" sub={money(all.net) + (roi != null ? ' · ROI ' + roi + '%' : '') + (all.pend ? ' · ' + all.pend + ' pending' : '')} />
          <div className="sl-sports">{Object.entries(bySport).sort(([a], [b]) => a.localeCompare(b)).map(([sp, r]) => <Donut key={sp} r={r} size={96} label={sp} sub={money(r.net)} />)}</div>
        </div>
        <div className="sl-days">{days.map(s => { const r = blank(); s.plays.forEach(x => add(r, x)); return <button key={s.date} className={'sl-day' + (shown === s.date ? ' on' : '')} onClick={() => setOpen(s.date)}>
          <span>{day(s.date)}</span><b>{r.w + r.l + r.p ? r.w + '–' + r.l + (r.p ? '–' + r.p : '') : 'Live'}</b><small className={tone(r.net)}>{r.w + r.l ? money(r.net) : r.pend + ' pending'}</small></button> })}</div>
        {days.filter(s => s.date === shown).map(s => <div key={s.date} className="sl-plays">
          {s.plays.map((x, i) => <div key={i} className={'sl-play ' + (x.result === 'W' ? 'win' : x.result === 'L' ? 'lose' : '')}>
            <span className={'lg-mark ' + (x.result === 'W' ? 'w' : x.result === 'L' ? 'l' : 'p')}>{x.result === 'W' ? '✓' : x.result === 'L' ? '✕' : /^push$/i.test(x.result || '') ? '∞' : '•'}</span>
            <div className="sl-main"><b><span className="sl-sport">{x.sport}</span> <R t={x.pick} s={x.sport} /> <em>{x.odds > 0 ? '+' + x.odds : x.odds}</em></b><small>{x.matchup ? <R t={x.matchup} s={x.sport} /> : null}{x.tip_ct ? ' · ' + x.tip_ct : ''}</small>{x.final && <small className="sl-final">Final: {x.final}</small>}<p>{x.why}</p></div>
            <strong className={tone(Number(x.net_cents) || 0)}>{x.result ? money(Number(x.net_cents) || 0) : 'Pending'}</strong>
          </div>)}
        </div>)}
        <p className="ndl-note">$200 a play at the shortlist price. Every play needs the Sharps or Hova + Nino on it.</p>
      </>}
    </div></>;
}
