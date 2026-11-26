// Standalone web version: replaces the old app's /api/* server with calls to Boss's Supabase
// through one passcode-locked database function (public.lcn_api).
import { stateFor, today, offset, settlement } from '../src/lib/engine.ts';
import { fetchGames, findGame, evalPick, lockTerms } from './live.tsx';
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
// Boss 11/23: pages can ask for the book at the same moment (state + numbers). Share one download instead of two.
let loading: { rev: number; p: Promise<void> } | null = null;
function loadAll(revision: number): Promise<void> {
  if (loading && loading.rev === revision) return loading.p;
  const p = loadAllOnce(revision).finally(() => { if (loading && loading.p === p) loading = null });
  loading = { rev: revision, p }; return p;
}
async function loadAllOnce(revision: number) {
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
// Boss 11/17: every page grades games the moment ESPN calls them final (✓/✕), not at the 1:30 AM grader.
// Unofficial overlay only: the nightly grader still writes the official result into the book.
const games: Record<string, { at: number; g: any }> = {};
async function finals(date: string) {
  const c = games[date]; if (c && Date.now() - c.at < 60000) return c.g;
  const g = await fetchGames(date).catch(() => ({})); games[date] = { at: Date.now(), g }; return g;
}
const MK: Record<string, string> = { Spread: 'Spread', Total: 'Total', ML: 'ML' };
function net(risk: number | null, odds: number | null, r: string) { try { return risk && odds ? settlement(Math.round(risk), Math.round(odds), r) : null } catch { return null } }
async function provisional(picks: any[], locks: any[]) {
  const from = offset(today(), -1);
  const open = picks.filter(p => !p.result && p.date >= from && MK[p.market]);
  const openLocks = locks.filter(l => !l.result && String(l.date || '') >= from);
  const dates = [...new Set([...open.map(p => p.date), ...openLocks.map(l => l.date)])];
  if (!dates.length) return { picks, locks };
  const byDate: Record<string, any> = {}; await Promise.all(dates.map(async d => { byDate[d] = await finals(d) }));
  const done = new Map<string, any>();
  for (const p of open) {
    const r = evalPick(p.pick, p.market, findGame(byDate[p.date], p.sport, p.matchup)); if (!['W', 'L', 'Push'].includes(r)) continue;
    const risk = p.risk ?? (p.analyst !== 'Johnny Biz' ? 20000 : null);
    done.set(p.id, { ...p, result: r, net: net(risk, p.odds, r) ?? (r === 'L' && risk ? -risk : r === 'Push' ? 0 : null), unofficial: true });
  }
  const outLocks = locks.map(l => {
    if (l.result || String(l.date || '') < from) return l;
    const t = lockTerms(l); const r = evalPick(t.pick, t.market, findGame(byDate[l.date] || {}, t.sport, t.matchup)); if (!['W', 'L', 'Push'].includes(r)) return l;
    const risk = Number(l.risk ?? l.frozen?.risk ?? 20000), odds = Number(l.frozen?.odds ?? (String(l.card).split('\n')[0].match(/([+-]\d{3,})\s*$/) || [])[1]);
    return { ...l, result: r, net: net(risk, isNaN(odds) ? null : odds, r) ?? (r === 'L' ? -risk : 0), unofficial: true };
  });
  return { picks: done.size ? picks.map(p => done.get(p.id) || p) : picks, locks: outLocks };
}
// Boss 11/19 Ledger rebuild: filtered locally from the cached book (fast, works with live ✓/✕).
let research: { at: number; rows: any[] } | null = null;
async function researchRows() {
  if (research && Date.now() - research.at < 300000) return research.rows;
  let rows: any[] = [];
  try { const r = await fetch(SB + '/rest/v1/rpc/lcn_research', { method: 'POST', cache: 'no-store', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: getPass() }) }); const v = await r.json(); if (Array.isArray(v)) rows = v } catch { }
  research = { at: Date.now(), rows }; return rows;
}
async function ledger(q: Record<string, string>) {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const copy = cache!.locks.map((l: any) => ({ ...l }));
  const { picks, locks } = await provisional(cache!.picks, copy).catch(() => ({ picks: cache!.picks, locks: copy }));
  const t = today(); const range = q.range || 'lastnight';
  const mon = (d: string) => { const x = new Date(d + 'T12:00:00Z'); const k = (x.getUTCDay() + 6) % 7; return offset(d, -k) };
  const inRange = (d: string) => q.date ? d === q.date : range === 'today' ? d === t : range === 'lastnight' ? d === offset(t, -1) : range === 'week' ? d >= mon(t) && d <= t : range === 'month' ? d.slice(0, 7) === t.slice(0, 7) && d <= t : true;
  const lockIds = new Set<string>(); for (const l of locks as any[]) { const id = l.pickId || l.pick_id || l.frozen?.id; if (id) lockIds.add(id) }
  const res = new Map<string, any>(); for (const r of await researchRows()) if (r.pick) res.set(r.pick, r);
  const words = (q.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const rows = (picks as any[]).filter(p => inRange(p.date)
    && (!q.sport || q.sport === 'All' || p.sport === q.sport)
    && (!q.analyst || p.analyst === q.analyst)
    && (!q.market || p.market === q.market)
    && (!q.result || (q.result === 'pending' ? !p.result : p.result === q.result))
    && (!q.locks || lockIds.has(p.id))
    && words.every(w => (p.matchup + ' ' + p.pick + ' ' + p.analyst).toLowerCase().includes(w)))
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.matchup).localeCompare(String(b.matchup)) || String(a.analyst).localeCompare(String(b.analyst)));
  const sum = { w: 0, l: 0, push: 0, pending: 0, net: 0, risk: 0 };
  for (const p of rows) { if (p.result === 'W') sum.w++; else if (p.result === 'L') sum.l++; else if (p.result === 'Push') sum.push++; else sum.pending++; if (p.result && p.net != null) { sum.net += p.net; sum.risk += p.risk ?? (p.analyst !== 'Johnny Biz' ? 20000 : 0) } }
  const page = Number(q.page || 0);
  // Boss 11/19: next to each pick, that analyst's last 30 settled picks of the same sport + bet type (before this pick's date)
  const hist = new Map<string, any[]>();
  for (const p of picks as any[]) { if (!['W', 'L', 'Push'].includes(p.result)) continue; const k = p.analyst + '|' + p.sport + '|' + p.market; (hist.get(k) || hist.set(k, []).get(k)!).push(p) }
  for (const v of hist.values()) v.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const form = (p: any) => { const last = (hist.get(p.analyst + '|' + p.sport + '|' + p.market) || []).filter(x => x.date < p.date).slice(0, 30); let w = 0, l = 0, push = 0; for (const x of last) { if (x.result === 'W') w++; else if (x.result === 'L') l++; else push++ } return { w, l, push, n: last.length, rate: w + l ? w / (w + l) : null } };
  return { count: rows.length, summary: sum, rows: rows.slice(page * 50, page * 50 + 50).map(p => ({ ...p, lock: lockIds.has(p.id), research: res.get(p.id) || null, form: form(p) })) };
}
// Boss 11/23 "Numbers Don't Lie": crew dashboard built from the cached book (live grades included).
const NDL_CREW = ['Hova Da God', 'Nino Brown', "G' Money", 'Sharp Syndicate', 'Paulie Publix', 'Rithmm'];
function ndlLane(p: any): string | null {
  const pk = String(p.pick || '');
  if (p.market === 'Total') return /^over/i.test(pk) ? 'Over' : /^under/i.test(pk) ? 'Under' : null;
  if (p.market === 'ML') { const o = Number(p.odds); if (!o) return null; return o >= 400 ? 'ML longshot +400' : o > 0 ? 'ML dog' : o <= -300 ? 'ML chalk -300+' : 'ML fav' }
  if (p.market === 'Spread') {
    const m = pk.match(/([+-]\d+(?:\.\d+)?)\s*$/); if (!m) return null; const ln = Number(m[1]);
    const parts = String(p.matchup || '').split(' at '); const where = parts.length === 2 ? (pk.startsWith(parts[1].trim()) ? 'home' : pk.startsWith(parts[0].trim()) ? 'road' : '') : '';
    return (ln < 0 ? 'Fav' : 'Dog') + ' spread' + (where ? ' (' + where + ')' : '');
  }
  return null;
}
function ndlSum(rows: any[]) { let w = 0, l = 0, push = 0, net = 0, risk = 0; for (const p of rows) { if (p.result === 'W') w++; else if (p.result === 'L') l++; else push++; net += p.net || 0; risk += p.risk ?? (p.analyst !== 'Johnny Biz' ? 20000 : 0) } return { w, l, push, net, risk, roi: risk ? net / risk : null, rate: w + l ? w / (w + l) : null, n: w + l + push } }
async function numbers(q: Record<string, string>) {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const copy = cache!.locks.map((l: any) => ({ ...l }));
  const { picks, locks } = await provisional(cache!.picks, copy).catch(() => ({ picks: cache!.picks, locks: copy }));
  const t = today(), range = q.range || '30', sp = q.sport || 'All';
  const from = range === '7' ? offset(t, -7) : range === '30' ? offset(t, -30) : range === 'month' ? t.slice(0, 8) + '01' : '0000';
  const ok = (p: any) => ['W', 'L', 'Push'].includes(p.result) && (sp === 'All' || p.sport === sp);
  const who = [...NDL_CREW, 'Johnny Biz'];
  const all = (picks as any[]).filter(p => ok(p) && who.includes(p.analyst) && !(p.analyst === 'Johnny Biz' && !['Spread', 'Total', 'ML', 'Parlay', 'Teaser'].includes(p.market)));
  const inR = all.filter(p => p.date >= from && p.date <= t);
  const lk = (locks as any[]).filter(l => ['W', 'L', 'Push'].includes(l.result) && (sp === 'All' || l.sport === sp) && String(l.date) >= from && String(l.date) <= t);
  const days: string[] = []; { const start = range === 'all' ? offset(t, -30) : from > offset(t, -30) ? from : offset(t, -30); for (let d = start; d <= t; d = offset(d, 1)) { days.push(d); if (days.length > 40) break } }
  const analysts = who.map(a => {
    const mine = inR.filter(p => p.analyst === a);
    const s = ndlSum(mine);
    // Last 10 NIGHTS (not picks): green = that night made money, red = lost money.
    const byNight = new Map<string, number>(); for (const p of all) if (p.analyst === a) byNight.set(p.date, (byNight.get(p.date) || 0) + (p.net || 0));
    const nights = [...byNight.entries()].sort((x, y) => x[0] < y[0] ? 1 : -1).map(([, v]) => v > 0 ? 'W' : v < 0 ? 'L' : 'Push');
    const last10 = nights.slice(0, 10).reverse();
    let streak = 0; const first = nights.find(r => r !== 'Push'); for (const r of nights) { if (r === 'Push') continue; if (r === first) streak++; else break }
    const l7 = ndlSum(all.filter(p => p.analyst === a && p.date >= offset(t, -7))), p30 = ndlSum(all.filter(p => p.analyst === a && p.date < offset(t, -7) && p.date >= offset(t, -37)));
    let run = 0; const spark = days.map(d => { run += mine.filter(p => p.date === d).reduce((x, p) => x + (p.net || 0), 0); return Math.round(run / 100) });
    const locksS = ndlSum(lk.filter(l => l.analyst === a).map(l => ({ ...l, risk: l.risk ?? l.frozen?.risk ?? 20000 })));
    return { analyst: a, ...s, last10, streak: first ? { r: first, n: streak } : null, hot: l7.rate != null && p30.rate != null ? l7.rate - p30.rate : null, l7rate: l7.rate, spark, locks: locksS };
  });
  const crewRows = inR.filter(p => NDL_CREW.includes(p.analyst));
  const crew = ndlSum(crewRows), crewLocks = ndlSum(lk.filter(l => NDL_CREW.includes(l.analyst)).map(l => ({ ...l, risk: l.risk ?? l.frozen?.risk ?? 20000 })));
  const nightly = days.map(d => ({ d, net: Math.round(crewRows.filter(p => p.date === d).reduce((x, p) => x + (p.net || 0), 0) / 100) }));
  const lanes = new Map<string, any[]>(), heat = new Map<string, any[]>();
  for (const p of inR) { const ln = ndlLane(p); if (!ln) continue; const k = p.analyst + '|' + p.sport + '|' + ln; (lanes.get(k) || lanes.set(k, []).get(k)!).push(p); if (NDL_CREW.includes(p.analyst)) { const hk = p.sport + '|' + ln.replace(/ \((home|road)\)/, ''); (heat.get(hk) || heat.set(hk, []).get(hk)!).push(p) } }
  const laneRows = [...lanes.entries()].map(([k, v]) => { const [analyst, sport, lane] = k.split('|'); return { analyst, sport, lane, ...ndlSum(v) } }).filter(r => r.w + r.l >= 15);
  const eat = [...laneRows].filter(r => r.net > 0).sort((a, b) => (b.roi || 0) - (a.roi || 0)).slice(0, 8);
  const bleed = [...laneRows].filter(r => r.net < 0).sort((a, b) => a.net - b.net).slice(0, 8);
  const heatRows = [...heat.entries()].map(([k, v]) => { const [sport, lane] = k.split('|'); return { sport, lane, ...ndlSum(v) } });
  const grp = new Map<string, { names: Set<string>; result: string }>();
  for (const p of crewRows) { if (!['Spread', 'Total', 'ML'].includes(p.market)) continue; const side = p.market === 'Total' ? String(p.pick).split(' ')[0].toLowerCase() : String(p.pick).replace(/\s*([+-]\d+(\.\d+)?|ML)\s*$/i, '').toLowerCase().trim(); const k = p.date + '|' + p.matchup + '|' + p.market + '|' + side; const g = grp.get(k) || grp.set(k, { names: new Set(), result: p.result }).get(k)!; g.names.add(p.analyst) }
  const agree: any = {}; for (const g of grp.values()) { const c = Math.min(g.names.size, 5); if (c < 2) continue; const a = agree[c] || (agree[c] = { w: 0, l: 0 }); if (g.result === 'W') a.w++; else if (g.result === 'L') a.l++ }
  const grades: any = {}; for (const l of lk.filter(l => NDL_CREW.includes(l.analyst))) { const g = String(l.grade || '').charAt(0) || '—'; const x = grades[g] || (grades[g] = []); x.push({ ...l, risk: l.risk ?? l.frozen?.risk ?? 20000 }) }
  return { date: t, from, range, sport: sp, crew, crewLocks, analysts, nightly, eat, bleed, heat: heatRows, agree, grades: Object.fromEntries(Object.entries(grades).map(([g, v]: any) => [g, ndlSum(v)])) };
}
function sheetFor(d: string, who: string) {
  const MKS = ['Spread', 'Total', 'ML'], all = cache!.picks as any[];
  const sideOf = (p: any) => p.market === 'Total' ? String(p.pick).trim().split(/\s+/)[0].toLowerCase() : String(p.pick).replace(/\s*([+-]\d+(\.\d+)?|ML|PK)\s*$/i, '').toLowerCase().trim();
  const key = (p: any) => p.date + '|' + String(p.matchup).toLowerCase() + '|' + p.market + '|' + sideOf(p);
  const laneOf = (p: any) => { const l = ndlLane(p); return l ? l.replace(/ \((home|road)\)/, '') : null };
  const since = offset(d, -60);
  // past agreement index: key -> {sport, lane, names, result, net(one $200 pick)}
  const idx = new Map<string, any>();
  for (const p of all) { if (p.date < since || p.date >= d || !NDL_CREW.includes(p.analyst) || !MKS.includes(p.market) || !['W', 'L', 'Push'].includes(p.result)) continue; const k = key(p); let g = idx.get(k); if (!g) { const lane = laneOf(p); if (!lane) continue; g = { sport: p.sport, lane, names: new Set<string>(), result: p.result, net: p.net || 0 }; idx.set(k, g) } g.names.add(p.analyst) }
  const day = all.filter(p => p.date === d && MKS.includes(p.market) && (NDL_CREW.includes(p.analyst) || p.analyst === 'Johnny Biz'));
  const byKey = new Map<string, string[]>(); for (const p of day) { const k = key(p); const a = byKey.get(k) || []; if (!a.includes(p.analyst)) a.push(p.analyst); byKey.set(k, a) }
  return day.filter(p => p.analyst === who).map(p => {
    const others = (byKey.get(key(p)) || []).filter(n => n !== who), group = [who, ...others].filter(n => NDL_CREW.includes(n)), lane = laneOf(p);
    let w = 0, l = 0, push = 0, net = 0;
    if (lane) for (const g of idx.values()) { if (g.sport !== p.sport || g.lane !== lane || !group.every(n => g.names.has(n))) continue; if (g.result === 'W') w++; else if (g.result === 'L') l++; else push++; net += g.net }
    return { id: p.id, sport: p.sport, market: p.market, matchup: p.matchup, pick: p.pick, odds: p.odds, result: p.result, others, lane, solo: group.length < 2, w, l, push, net };
  });
}
// Numbers Don't Lie v2 (Boss 11/23): multi-sport, multi-analyst (lumped), 7/30/90/all.
// Boss 11/24: In the Weeds ranks by ROI (money per dollar risked), not raw dollars.
// Boss 11/26: show real games next to picks — six analysts on one game is 6 picks but 1 game.
const gameCount = (v: any[]) => new Set(v.map((p: any) => p.date + '|' + String(p.matchup).toLowerCase())).size;
const rankRoi = (rows: any[]) => ({ best: rows.filter(r => (r.roi ?? 0) > 0).sort((a, b) => (b.roi - a.roi) || (b.net - a.net)).slice(0, 5), worst: rows.filter(r => (r.roi ?? 0) < 0).sort((a, b) => (a.roi - b.roi) || (a.net - b.net)).slice(0, 5) });
async function numbers2(q: Record<string, string>) {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const copy = cache!.locks.map((l: any) => ({ ...l }));
  const { picks, locks } = await provisional(cache!.picks, copy).catch(() => ({ picks: cache!.picks, locks: copy }));
  const t = today(), range = q.range || '30', from = range === 'all' ? '0000' : offset(t, -Number(range));
  const sps = (q.sports || '').split(',').filter(Boolean), sel = (q.who || '').split(',').filter(Boolean);
  const okS = (s: string) => !sps.length || sps.includes(s);
  const crewAll = (picks as any[]).filter(p => NDL_CREW.includes(p.analyst) && ['W', 'L', 'Push'].includes(p.result) && okS(p.sport) && p.date >= from && p.date <= t);
  const mine = sel.length ? crewAll.filter(p => sel.includes(p.analyst)) : crewAll;
  const MIN = range === '7' ? 5 : range === '30' ? 12 : 20;
  const grp = (rows: any[], k: (p: any) => string | null) => { const m = new Map<string, any[]>(); for (const p of rows) { const key = k(p); if (key == null) continue; const a = m.get(key); a ? a.push(p) : m.set(key, [p]) } return m };
  const sum = ndlSum(mine);
  const byMarket = ['Spread', 'Total', 'ML'].map(m => ({ k: m, ...ndlSum(mine.filter(p => p.market === m)) }));
  const bySport = [...grp(mine, p => p.sport).entries()].sort().map(([k, v]) => ({ k, ...ndlSum(v) }));
  const byDay = [...grp(mine, p => p.date).entries()].sort((a, b) => a[0] < b[0] ? -1 : 1); let run = 0;
  const line = byDay.map(([d, v]) => { const n = v.reduce((a: number, p: any) => a + (p.net || 0), 0); run += n; return { d, net: n, cum: run } });
  const analysts = NDL_CREW.map(a => ({ analyst: a, ...ndlSum(crewAll.filter(p => p.analyst === a)) })).filter(a => a.n);
  const laneName = (p: any) => { const l = ndlLane(p); return l ? l.replace(/ \((home|road)\)/, '') : null };
  // games the crew agreed on: same date, game, bet type, side
  const sideOf = (p: any) => p.market === 'Total' ? String(p.pick).split(' ')[0].toLowerCase() : String(p.pick).replace(/\s*([+-]\d+(\.\d+)?|ML)\s*$/i, '').toLowerCase().trim();
  const games = [...grp(crewAll.filter(p => ['Spread', 'Total', 'ML'].includes(p.market)), p => p.date + '|' + p.matchup + '|' + p.market + '|' + sideOf(p)).values()].map(v => ({ names: [...new Set(v.map((p: any) => p.analyst))].sort() as string[], p: v[0] }));
  let weeds: any;
  if (sel.length) {
    const rows = [...grp(mine, p => { const l = laneName(p); return l ? p.sport + '|' + l : null }).entries()].map(([k, v]) => { const [sport, lane] = k.split('|'); return { names: sel, sport, lane, games: gameCount(v), ...ndlSum(v) } }).filter(r => r.w + r.l >= MIN);
    weeds = { groups: [{ title: 'Best bets', ...rankRoi(rows) }] };
  } else {
    const combos = new Map<string, any[]>();
    for (const g of games) { const l = laneName(g.p); if (!l) continue; const n = g.names.slice(0, 6); for (let mask = 1; mask < 1 << n.length; mask++) { const sub = n.filter((_, i) => mask & 1 << i); if (sub.length > 4) continue; const k = sub.join('+') + '|' + g.p.sport + '|' + l; const a = combos.get(k); a ? a.push(g.p) : combos.set(k, [g.p]) } }
    const rows = [...combos.entries()].map(([k, v]) => { const [nm, sport, lane] = k.split('|'); return { names: nm.split('+'), sport, lane, games: gameCount(v), ...ndlSum(v) } }).filter(r => r.w + r.l >= MIN);
    weeds = { groups: [{ title: 'Top 5 Crews', sub: '2+ on the same side', ...rankRoi(rows.filter(r => r.names.length >= 2)) }, { title: 'Top 5 Solo Artists', sub: 'one analyst', ...rankRoi(rows.filter(r => r.names.length === 1)) }] };
  }
  const heat = [...grp(mine, p => { const l = laneName(p); return l ? p.sport + '|' + l : null }).entries()].map(([k, v]) => { const [sport, lane] = k.split('|'); return { sport, lane, games: gameCount(v), ...ndlSum(v) } });
  let lockInfo: any = null;
  if (sel.length) {
    const lk = (locks as any[]).filter(l => sel.includes(l.analyst) && ['W', 'L', 'Push'].includes(l.result) && okS(l.sport) && String(l.date) >= from && String(l.date) <= t).map(l => ({ ...l, risk: l.risk ?? l.frozen?.risk ?? 20000 }));
    const grades: any = {}; for (const l of lk) { const g = String(l.grade || '').charAt(0) || '—'; (grades[g] ||= []).push(l) }
    lockInfo = { ...ndlSum(lk), grades: Object.fromEntries(Object.entries(grades).map(([g, v]: any) => [g, ndlSum(v)])), recent: lk.sort((a, b) => String(a.date) < String(b.date) ? 1 : -1).slice(0, 10).map(l => ({ analyst: l.analyst, date: l.date, result: l.result, net: l.net, card: String(l.card || '').split('\n')[0].replace(/^\d+\s*[•.]?\s*/, '').trim() || l.frozen?.pick || l.pick || (picks as any[]).find(p => p.id === (l.pickId || l.pick_id || l.frozen?.id))?.pick || '', sport: l.sport })) };
  }
  const agree: any = {}; for (const g of games) { const c = Math.min(g.names.length, 5); if (c < 2) continue; const a = agree[c] ||= { w: 0, l: 0 }; if (g.p.result === 'W') a.w++; else if (g.p.result === 'L') a.l++ }
  const withCrew = NDL_CREW.map(a => { const w: any = { w: 0, l: 0 }, alone: any = { w: 0, l: 0 }; for (const g of games) { if (!g.names.includes(a)) continue; const x = g.names.length >= 2 ? w : alone; if (g.p.result === 'W') x.w++; else if (g.p.result === 'L') x.l++ } return { analyst: a, agree: w, alone } });
  const together = sel.length >= 2 ? (() => { const v = games.filter(g => sel.every(n => g.names.includes(n))).map(g => g.p); return { ...ndlSum(v) } })() : null;
  return { range, sports: sps, who: sel, sum, byMarket, bySport, line, analysts, weeds, heat, locks: lockInfo, agree, withCrew, together, min: MIN };
}
// Heat map drill-down (Boss 11/23): one sport + bet type, today or last night, for the chosen analysts.
async function ndlCell(q: Record<string, string>) {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const copy = cache!.locks.map((l: any) => ({ ...l }));
  const { picks } = await provisional(cache!.picks, copy).catch(() => ({ picks: cache!.picks }));
  const date = q.day === 'yesterday' ? offset(today(), -1) : today();
  const sel = (q.who || '').split(',').filter(Boolean), names = sel.length ? sel : NDL_CREW;
  const rows = (picks as any[]).filter(p => p.date === date && names.includes(p.analyst) && p.sport === q.sport && (ndlLane(p) || '').replace(/ \((home|road)\)/, '') === q.lane);
  const by = new Map<string, any>();
  for (const p of rows) { const k = p.matchup + '|' + p.pick; const g = by.get(k) || by.set(k, { matchup: p.matchup, pick: p.pick, odds: p.odds, result: p.result, names: [] as string[], net: 0 }).get(k); if (!g.names.includes(p.analyst)) g.names.push(p.analyst); g.net += p.net || 0 }
  const games = [...by.values()].sort((a, b) => b.names.length - a.names.length || String(a.matchup).localeCompare(b.matchup));
  const s = ndlSum(rows.filter(p => ['W', 'L', 'Push'].includes(p.result)));
  return { date, games, sum: s, pending: rows.filter(p => !p.result).length };
}
async function state() {
  const rev = (await api('revision')).revision as number;
  if (!cache || cache.revision !== rev) await loadAll(rev);
  const { settings } = cache!;
  const copy = cache!.locks.map((l: any) => ({ ...l }));
  const { picks, locks } = await provisional(cache!.picks, copy).catch(() => ({ picks: cache!.picks, locks: copy }));
  const s: any = stateFor(picks, locks, rev, today());
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
    if (u.pathname === '/api/export') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); const cols = ['date', 'analyst', 'sport', 'market', 'matchup', 'pick', 'odds', 'risk', 'result', 'net']; const esc = (x: any) => { const t = x == null ? '' : String(x); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t }; const body = [cols.join(',')].concat(cache!.picks.map((p: any) => cols.map(c => esc(c === 'risk' || c === 'net' ? (p[c] == null ? '' : p[c] / 100) : p[c])).join(','))).join('\n'); return new Response(body, { headers: { 'content-type': 'text/csv' } }) }
    if (u.pathname === '/api/backup') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); return new Response(JSON.stringify({ exported: new Date().toISOString(), revision: rev, picks: cache!.picks, locks: cache!.locks, settings: cache!.settings }), { headers: { 'content-type': 'application/json' } }) }
    if (u.pathname === '/api/together') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); const names = (u.searchParams.get('names') || '').split('|').filter(Boolean), sp = u.searchParams.get('sport'), mk = u.searchParams.get('market'); const side = (x: any) => String(x.pick || '').toLowerCase().replace(/[^a-z]/g, ''); const by = new Map<string, any[]>(); for (const x of cache!.picks as any[]) { if (!names.includes(x.analyst) || x.sport !== sp || x.market !== mk || !['W', 'L', 'Push'].includes(x.result)) continue; const k = x.date + '|' + x.matchup + '|' + side(x); const a = by.get(k) || []; a.push(x); by.set(k, a) } const games = [...by.values()].filter(a => names.every(n => a.some(x => x.analyst === n))).map(a => a[0]).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0).slice(0, 10); return json(games) }
    // Boss 11/26: Get Money analyst sheet — their picks, who agrees, and how that crew hits in that Hot Box lane (60 days)
    if (u.pathname === '/api/sheet') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); return json(sheetFor(u.searchParams.get('date') || '', u.searchParams.get('who') || '')) }
    // Boss 11/26: one day's picks for the Get Money analyst sheet (last night view)
    if (u.pathname === '/api/day') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); const d = u.searchParams.get('date') || ''; return json((cache!.picks as any[]).filter(p => p.date === d).map(({ raw, ...p }: any) => p)) }
    if (u.pathname === '/api/sl-marks') { const rev = (await api('revision')).revision as number; if (!cache || cache.revision !== rev) await loadAll(rev); return json(slMarks()) }
    if (u.pathname === '/api/ndl-cell') return json(await ndlCell(Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/ndl') return json(await numbers2(Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/numbers') return json(await numbers(Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/ledger') return json(await ledger(Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/manage') return json({ error: 'Changes go through Hova now. Post it in The Sit-Down.' }, 403);
    return json({ error: 'Not available in this version.' }, 404);
  } catch (e: any) { return json({ error: String(e && e.message || e) }, 503) }
};

// Boss 11/24: shortlist plays show the Lions Den lion and who has the play locked.
function slMarks() {
  const { picks, locks, settings } = cache!;
  const byId = new Map<string, any>(picks.map((p: any) => [p.id, p]));
  const from = offset(today(), -45);
  const lk = (locks as any[]).filter(l => String(l.date || '') >= from).map(l => { const p = byId.get(l.pickId || l.pick_id || l.frozen?.id) || l.frozen || {}; return { date: l.date, analyst: l.analyst, matchup: p.matchup || '', market: p.market || '', pick: p.pick || '' } }).filter(x => x.matchup);
  const snaps: Record<string, any> = { ...(settings.snaps || {}) }; if (settings.den?.date && settings.den?.den) snaps[settings.den.date] = settings.den.den;
  const den: Record<string, any[]> = {};
  for (const [d, sn] of Object.entries<any>(snaps)) { if (d < from) continue; const seen: Record<string, number> = {}; den[d] = ((sn?.['Den Nov8 Ranked']) || []).slice(1).filter((r: any) => (seen[r[0] + r[1]] = (seen[r[0] + r[1]] || 0) + 1) <= 3).map((r: any) => [r[0], String(r[1]), String(r[3]).replace(/^\d+\.\s*/, '')]) }
  return { locks: lk, den };
}
