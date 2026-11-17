// Standalone web version: replaces the old app's /api/* server with calls to Boss's Supabase
// through one passcode-locked database function (public.lcn_api).
import { stateFor, today } from '../src/lib/engine.ts';

const SB = 'https://nnwnaskgkugxfunxmllc.supabase.co';
const KEY = 'sb_publishable_aqT2OLxm-2CqOW6QRPZnEg_K8-qFfsd';
const PASS_KEY = 'lcn-pass';

export function getPass(): string { try { return localStorage.getItem(PASS_KEY) || '' } catch { return '' } }
export function setPass(p: string) { try { if (p) localStorage.setItem(PASS_KEY, p); else localStorage.removeItem(PASS_KEY) } catch { } }

export async function api(op: string, args: any = {}, pass = getPass()): Promise<any> {
  let r: Response;
  try {
    r = await fetch(SB + '/rest/v1/rpc/lcn_api', {
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
async function loadAll(revision: number) {
  const n = Number(await api('count'));
  const size = 2500, chunks: Promise<any>[] = [];
  for (let off = 0; off < n; off += size) chunks.push(api('picks', { off, lim: size }));
  const [locks, settings, ...parts] = await Promise.all([api('locks'), api('settings'), ...chunks]);
  cache = { revision, picks: ([] as any[]).concat(...parts).map(toPick), locks, settings };
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
