import { useEffect, useState } from 'react';
import { api } from './adapter.ts';
import { art } from '../src/lib/engine.ts';

const people = ['Johnny Biz', 'Hova Da God', 'Nino Brown'];
export default function SitDown() {
  const [rows, setRows] = useState<any[] | null>(null), [error, setError] = useState(''), [from, setFrom] = useState('Johnny Biz'), [to, setTo] = useState('All'), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  async function load() {
    try { setRows(await api('messages')); setError('') }
    catch (e: any) { setError(String(e.message || e)) }
  }
  useEffect(() => { load(); const tick = () => { if (document.visibilityState === 'visible') load() }; const t = setInterval(tick, 10000); document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick); return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick) } }, []);
  async function post(e: any) {
    e.preventDefault(); const text = body.trim(); if (!text) return; setBusy(true); setNote('Posting…');
    try { await api('post', { from, to, body: text }); setBody(''); setNote('Posted.'); await load() }
    catch (e: any) { setNote('Not sure it went through. Refresh and check before posting again. ' + String(e.message || e)) }
    finally { setBusy(false) }
  }
  return <>
    <form className="panel sitdown-form" onSubmit={post}>
      <div className="form-row">
        <label>From<select value={from} onChange={e => setFrom(e.target.value)}>{people.map(p => <option key={p}>{p}</option>)}</select></label>
        <label>To<select value={to} onChange={e => setTo(e.target.value)}>{['All', ...people].map(p => <option key={p}>{p}</option>)}</select></label>
      </div>
      <label>Message<textarea value={body} maxLength={8000} onChange={e => setBody(e.target.value)} placeholder="Say less." /></label>
      <div className="sitdown-actions"><button className="primary" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button><span className="muted">{note}</span></div>
    </form>
    <div className="section-title"><h2>The table</h2><span>NEWEST FIRST · UPDATES BY ITSELF EVERY 10 SECONDS</span></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="sitdown-list">{(rows || []).map(m => {
      const boss = m.recipient === 'Johnny Biz' || m.recipient === 'All';
      const when = new Date(m.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return <article key={m.id} className={'panel sitdown-msg ' + (art[m.sender] || '') + (boss ? ' to-boss' : '')}>
        {art[m.sender] ? <img src={'art/jail-' + art[m.sender] + (m.sender === 'Nino Brown' ? '-diesel' : '') + '.webp'} alt={m.sender} /> : <span className="initial">{m.sender[0]}</span>}
        <div><div className="sitdown-meta"><b>{m.sender}</b><span>to {m.recipient}</span><span>{when} CT</span><span>#{m.id}{m.in_reply_to ? ' ↩ #' + m.in_reply_to : ''}{m.handled_at ? ' · handled' : ''}</span></div><p>{m.body}</p></div>
      </article>
    })}{rows && !rows.length && <p className="muted">No messages yet.</p>}{!rows && !error && <p className="muted">Opening the table…</p>}</div>
  </>;
}
