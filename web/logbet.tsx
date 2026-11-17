// Boss logs his own real tickets straight into the book (is_actual_wager = true).
import { useEffect, useState } from 'react';
import { api } from './adapter.ts';
import { today } from '../src/lib/engine.ts';

const money = (c: number) => '$' + (c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const toWin = (risk: number, odds: number) => (!risk || !odds || Math.abs(odds) < 100 ? 0 : odds < 0 ? risk * 100 / Math.abs(odds) : risk * odds / 100);

export default function LogBet({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [f, setF] = useState({ date: today(), sport: 'NBA', market: 'Spread', game: '', selection: '', odds: '-110', risk: '', book: '' });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const games: string[] = [...new Set<string>((data?.current || []).filter((p: any) => p.sport === f.sport).map((p: any) => p.matchup))].sort();
  const mine = (data?.current || []).filter((p: any) => p.analyst === 'Johnny Biz');
  const odds = parseInt(f.odds, 10), risk = Number(f.risk);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t) }, [msg]);
  async function submit(e: any) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api('logbet', { date: f.date, sport: f.sport, market: f.market, matchup: f.game, selection: f.selection.trim(), odds, risk, book: f.book });
      setMsg(`Logged: ${f.selection} (${odds > 0 ? '+' : ''}${odds}) · risk $${risk} to win ${money(Math.round(toWin(risk, odds) * 100))}`);
      setF({ ...f, selection: '', risk: '', game: '' }); onSaved();
    } catch (e: any) { setErr(String(e.message || e)) } finally { setBusy(false) }
  }
  const hint = f.market === 'Total' ? 'Over 216.5' : f.market === 'ML' ? 'Lakers ML' : f.market === 'Spread' ? 'Knicks -2.5' : '4-team parlay';
  return <>
    <form className="panel form-panel logbet" onSubmit={submit}>
      <h2>Log a bet</h2>
      <div className="form-row">
        <label>Date<input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></label>
        <label>Sport<select value={f.sport} onChange={e => set('sport', e.target.value)}>{['NBA', 'NFL', 'CBB', 'CFB', 'NHL', 'MLB', 'Other'].map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Bet type<select value={f.market} onChange={e => set('market', e.target.value)}>{['Spread', 'Total', 'ML', 'Parlay', 'Teaser', 'Other'].map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label>Game<input list="lcn-games" value={f.game} onChange={e => set('game', e.target.value)} placeholder="Pick from tonight's board or type it" /><datalist id="lcn-games">{games.map(g => <option key={g} value={g} />)}</datalist></label>
      <label>Your bet<input value={f.selection} onChange={e => set('selection', e.target.value)} placeholder={hint} required /></label>
      <div className="form-row">
        <label>Odds<input inputMode="numeric" value={f.odds} onChange={e => set('odds', e.target.value)} placeholder="-110" required /></label>
        <label>Risk ($)<input inputMode="decimal" value={f.risk} onChange={e => set('risk', e.target.value)} placeholder="50" required /></label>
        <label>Book<input value={f.book} onChange={e => set('book', e.target.value)} placeholder="Fuego" /></label>
      </div>
      <div className="sitdown-actions"><button className="primary" disabled={busy}>{busy ? 'Logging…' : 'Log it'}</button><span className="muted">{risk > 0 && Math.abs(odds) >= 100 ? `To win ${money(Math.round(toWin(risk, odds) * 100))}` : ''}</span></div>
      {msg && <div className="alert success" role="status">{msg}</div>}
      {err && <div className="alert error" role="alert">{err}</div>}
    </form>
    <div className="section-title"><h2>Your bets today</h2><span>{mine.length} TICKETS</span></div>
    <div className="panel">{mine.length ? mine.map((p: any) => <div className="lock-pick" key={p.id}><div><h3>{p.pick} {p.odds > 0 ? '+' + p.odds : p.odds}</h3><p>{p.sport} · {p.market} · {p.matchup}</p></div><span className="grade">{money(p.risk || 0)}</span>{p.result ? <b className={p.result === 'W' ? 'paid-result paid-result-win' : p.result === 'L' ? 'paid-result paid-result-loss' : 'paid-result-neutral'}>{p.result}</b> : <span className="paid-result-pending">Pending</span>}</div>) : <p className="muted">Nothing logged for today yet.</p>}</div>
  </>;
}
