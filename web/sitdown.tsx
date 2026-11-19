// The Sit-Down, renovated 11/19 (Boss): a text thread. Boss on the right, crew on the left,
// newest at the bottom. Messages to Boss in gold, crew-to-crew chatter hidden unless he asks for it.
import { useEffect, useRef, useState } from 'react';
import { api } from './adapter.ts';
import { markSeen } from './unread.ts';
import { art } from '../src/lib/engine.ts';

const short: Record<string, string> = { 'Johnny Biz': 'Boss', 'Hova Da God': 'Hova', 'Nino Brown': 'Nino' };
const toBoss = (m: any) => m.sender === 'Johnny Biz' || m.recipient === 'Johnny Biz' || m.recipient === 'All';

export default function SitDown() {
  const [rows, setRows] = useState<any[] | null>(null), [error, setError] = useState(''), [to, setTo] = useState('All'), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [chatter, setChatter] = useState(false), [limit, setLimit] = useState(60);
  const end = useRef<HTMLDivElement>(null), first = useRef(true), lastId = useRef(0);
  async function load() {
    try { const v = await api('messages'); setRows(v); setError(''); markSeen(v) }
    catch (e: any) { setError(String(e.message || e)) }
  }
  useEffect(() => { load(); const tick = () => { if (document.visibilityState === 'visible') load() }; const t = setInterval(tick, 10000); document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick); return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick) } }, []);
  const list = (rows || []).filter(m => chatter || toBoss(m)).sort((a, b) => Number(a.id) - Number(b.id));
  const shown = list.slice(-limit);
  const hidden = (rows || []).length - (rows || []).filter(toBoss).length;
  // jump to the newest message when the thread opens or something new lands
  useEffect(() => { const top = shown.length ? Number(shown[shown.length - 1].id) : 0; if (top && (first.current || top > lastId.current)) { const go = () => end.current?.scrollIntoView({ block: 'end', behavior: first.current ? 'auto' : 'smooth' }); go(); if (first.current) { setTimeout(go, 400); setTimeout(go, 1200) } first.current = false } lastId.current = top }, [shown.length, chatter]);
  async function post(e: any) {
    e.preventDefault(); const text = body.trim(); if (!text) return; setBusy(true); setNote('');
    try { await api('post', { from: 'Johnny Biz', to, body: text }); setBody(''); await load() }
    catch (e: any) { setNote('Not sure it went through. Check the thread before you send it again.') }
    finally { setBusy(false) }
  }
  const day = (d: string) => new Date(d).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
  const time = (d: string) => new Date(d).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
  let lastDay = '';
  return <div className="sd">
    <div className="sd-top">
      <button className={'lg-chip' + (chatter ? '' : ' on')} onClick={() => setChatter(false)}>Me and the crew</button>
      <button className={'lg-chip' + (chatter ? ' on' : '')} onClick={() => setChatter(true)}>Everything{hidden ? ' (+' + hidden + ' crew talk)' : ''}</button>
    </div>
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="sd-thread">
      {list.length > shown.length && <button className="sd-older" onClick={() => setLimit(limit + 60)}>Show older messages</button>}
      {shown.map(m => {
        const mine = m.sender === 'Johnny Biz'; const d = day(m.created_at); const sep = d !== lastDay; lastDay = d;
        const crewTalk = !toBoss(m);
        return <div key={m.id}>
          {sep && <div className="sd-day">{d}</div>}
          <div className={'sd-row' + (mine ? ' sd-mine-row' : '')}>
            {!mine && (art[m.sender] ? <img className="sd-face" src={'art/mafia-' + art[m.sender] + '.webp'} alt={m.sender} /> : <span className="sd-face initial">{m.sender[0]}</span>)}
            <div className={'sd-bubble' + (mine ? ' sd-mine' : crewTalk ? ' sd-crew' : ' sd-tome')}>
              {!mine && <div className="sd-who">{short[m.sender] || m.sender}{m.recipient !== 'All' && m.recipient !== 'Johnny Biz' ? ' → ' + (short[m.recipient] || m.recipient) : ''}</div>}
              {mine && m.recipient !== 'All' && <div className="sd-who">to {short[m.recipient] || m.recipient}</div>}
              <p>{m.body}</p>
              <div className="sd-time">{time(m.created_at)}</div>
            </div>
          </div>
        </div>;
      })}
      {rows && !shown.length && <p className="muted">Nothing here yet.</p>}
      {!rows && !error && <p className="muted">Opening the table…</p>}
      <div ref={end} />
    </div>
    <form className="sd-compose" onSubmit={post}>
      <div className="sd-to">{['All', 'Hova Da God', 'Nino Brown'].map(p => <button type="button" key={p} className={'lg-chip' + (to === p ? ' on' : '')} onClick={() => setTo(p)}>{p === 'All' ? 'Everybody' : short[p]}</button>)}</div>
      <div className="sd-input"><textarea value={body} maxLength={8000} rows={2} onChange={e => setBody(e.target.value)} placeholder="Say less…" /><button className="primary" disabled={busy || !body.trim()}>{busy ? '…' : 'Send'}</button></div>
      {note && <div className="sd-note">{note}</div>}
    </form>
  </div>;
}
