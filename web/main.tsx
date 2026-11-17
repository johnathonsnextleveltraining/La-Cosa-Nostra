import { api, getPass, setPass } from './adapter.ts';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../src/app/page.tsx';

function Gate() {
  const [pass, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function go(e: any) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('check', {}, pass.trim()); setPass(pass.trim()); location.reload() }
    catch (x: any) { setErr(String(x.message || x)) } finally { setBusy(false) }
  }
  return <form className="gate" onSubmit={go}>
    <img src="icon.svg" alt="La Cosa Nostra" />
    <span className="eyebrow">PRIVATE CLUB · MEMBERS ONLY</span>
    <h1>La Cosa Nostra</h1>
    <input type="password" autoComplete="current-password" placeholder="Passcode" value={pass} onChange={e => setP(e.target.value)} aria-label="Passcode" />
    <button className="primary" disabled={busy || !pass.trim()}>{busy ? 'Checking…' : 'Enter'}</button>
    {err && <p className="gate-err" role="alert">{err}</p>}
  </form>;
}

const root = createRoot(document.getElementById('root')!);
root.render(getPass() ? <Home /> : <Gate />);

// Auto-update: if a newer version of the app was published, reload once to get it (phones cache hard).
(async () => {
  try {
    const mine = ((document.querySelector('script[src*="app.js"]') as HTMLScriptElement)?.src.match(/v=(\w+)/) || [])[1];
    const check = async () => {
      const html = await (await fetch('./?u=' + Date.now(), { cache: 'no-store' })).text();
      const live = (html.match(/app\.js\?v=(\w+)/) || [])[1];
      if (mine && live && live !== mine && sessionStorage.getItem('lcn-upd') !== live) { sessionStorage.setItem('lcn-upd', live); location.replace('./?v=' + live) }
    };
    check(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() });
  } catch { }
})();
