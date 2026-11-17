// Standalone web version: replaces the old app's /api/* server with calls to Boss's Supabase
// through one passcode-locked database function (public.lcn_api).
import { stateFor, today } from '../src/lib/engine.ts';
import { ensureDen } from './den.ts';

const SB = 'https://nnwnaskgkugxfunxmllc.supabase.co';
const KEY = 'sb_publishable_aqT2OLxm-2CqOW6QRPZnEg_K8-qFfsd';
const PASS_KEY = 'lcn-pass';

export function getPass(): string { try { return localStorage.getItem(PASS_KEY) || '' } catch { return '' } }
export function setPass(p: string) { try { if (p) localStorage.setItem(PASS_KEY, p); else localStorage.removeItem(PASS_KEY) } catch { } }

export async function api(op: string, args: any = {}, pass = getPass()): Promise<any> {
  let r: Response;
  try {
    r = await fetch(SB + '/rest/v1/rpc/lcn_api2', {
      method: 'POST', cache: 'no-store',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass, op, args }),
    });
  } catch { throw Error('Can’t reach the book. Check your signal and refresh.') }
  const v: any = await r.json().catch(() => null);
  if (!r.ok) throw Error((v && (v.message || v.hint)) || 'The book answered with an error (' + r.status + ')');
  if (v && typeof v === 'object' && !Array.isArray(v) && v.error) {
    if (v.error === 'Wrong passcode' && getPass() && pass === getPass()) { setPass(''); setTimeout(() => location.reload(), 1500) }
    throw Error(v.error);
  }
  return v;
}

let cache: { revision: number; picks: any[]; locks: any[]; settings: any } | null = null;
function toPick(r: any[]) {
  const [id, date, analyst, matchup, pick, odds, risk, toWin, market, sport, net, result, status, grade, raw9] = r;
  const p: any = { id, date, analyst, matchup: matchup || '', pick: pick || '', odds: odds == null ? null : Number(odds), risk: risk == null ? null : Number(risk), toWin: toWin == null ? null : Number(toWin), market: market || 'Other', sport: sport || '', net: net == null ? null : Number(net), result: result || '', status: status || '', grade: grade || '', source: '' };
  if (raw9 != null) { const a: any[] = new Array(10).fill(''); a[9] = raw9; p.raw = a }
  return p;
}
// Speed: picks are cached on the device (IndexedDB). On open we only download rows changed since the
// last visit; a count mismatch (e.g. deleted rows) falls back to one full download.
function idb(): Promise<IDBDatabase> { return new Promise((ok, bad) => { const q = indexedDB.open('lcn', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); q.onerror = () => bad(q.error) }) }
async function kvGet(k: string): Promise<any> { try { const db = await idb(); return await new Promise(ok => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null) }) } catch { return null } }
async function kvSet(k: string, v: any) { try { const db = await idb(); await new Promise(ok => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(null); t.onerror = () => ok(null) }) } catch { } }
async function fullPicks(n: number) {
  const size = 2500, chunks: Promise<any>[] = [];
  for (let off = 0; off < n; off += size) chunks.push(api('picks', { off, lim: size }));
  return ([] as any[]).concat(...(await Promise.all(chunks)));
}
async function loadAll(revision: number) {
  const [sig, locks, settings, saved] = await Promise.all([api('sig'), api('locks'), api('settings'), kvGet('picks')]);
  let rows: any[];
  if (saved && saved.since && Array.isArray(saved.rows)) {
    const fresh: any[] = await api('picks_since', { since: saved.since });
    const byId = new Map(saved.rows.map((r: any) => [r[0], r]));
    for (const r of fresh) byId.set(r[0], r);
    rows = [...byId.values()];
    if (rows.length !== Number(sig.count) || fresh.length >= 5000) rows = await fullPicks(Number(sig.count));
  } else rows = await fullPicks(Number(sig.count));
  kvSet('picks', { since: sig.now, rows });
  cache = { revision, picks: rows.map(toPick), locks, settings };
}
async function state() {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const { picks, locks, settings } = cache!;
  const s: any = stateFor(picks, locks.map((l: any) => ({ ...l })), rev, today());
  const denDate = settings.den?.date || '';
  const snaps: any = {};
  for (const [d, den] of Object.entries(settings.snaps || {})) snaps[d] = { den, picks: picks.filter((p: any) => p.date === d) };
  s.den = settings.den?.den || null; s.denDate = denDate; s.denPicks = picks.filter((p: any) => p.date === denDate); s.denSnapshots = snaps;
  s.cash = { cash: settings.cash ?? 0, bookie: settings.bookie ?? 0, date: settings.cashDate || '' };
  s.audit = []; s.empty = false; s.onlyJohnny = false;
  if (denDate !== today()) ensureDen(getPass(), denDate, () => { cache = null }, settings.den?.den);
  return s;
}

const json = (v: any, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
const realFetch = window.fetch.bind(window);
(window as any).fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('/api/')) return realFetch(input, init);
  const u = new URL(url, 'https://lcn.local');
  try {
    if (u.pathname === '/api/state') return json(await state());
    if (u.pathname === '/api/revision') return json({ ...(await api('revision')), date: today() });
    if (u.pathname === '/api/ledger') return json(await api('ledger', Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/manage') return json({ error: 'Changes go through Hova now. Post it in The Sit-Down.' }, 403);
    return json({ error: 'Not available in this version.' }, 404);
  } catch (e: any) { return json({ error: String(e && e.message || e) }, 503) }
};
