// Lions Den builder (Hova). Rebuilds the Den for today straight from ESPN's public scoreboard:
// every final this season + its closing spread -> home/away ATS records -> today's matchups ranked
// by own-role ATS% minus the opponent's opposite-role ATS%. Saved to Supabase so every page reads it.
import { today, offset } from '../src/lib/engine.ts';

const SB = 'https://nnwnaskgkugxfunxmllc.supabase.co';
const KEY = 'sb_publishable_aqT2OLxm-2CqOW6QRPZnEg_K8-qFfsd';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES: Record<string, { path: string; start: string; q: string }> = {
  NBA: { path: 'basketball/nba', start: '2026-10-20', q: '' },
  CBB: { path: 'basketball/mens-college-basketball', start: '2026-11-02', q: '&groups=50&limit=400' },
  CFB: { path: 'football/college-football', start: '2026-08-27', q: '&groups=80&limit=400' },
  NFL: { path: 'football/nfl', start: '2026-09-09', q: '' },
};
const MIN_OWN = 3, MIN_OPP = 2, TOP = 3;

type Rec = { id: string; name: string; hw: number; hl: number; hp: number; aw: number; al: number; ap: number; sw: number; sl: number };
const ymd = (d: string) => d.replace(/-/g, '');
const pct = (w: number, l: number) => (w + l ? w / (w + l) : null);
const rec = (w: number, l: number, p: number) => `${w}–${l}–${p}`;

async function day(sport: string, d: string): Promise<any[]> {
  const L = LEAGUES[sport];
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(ESPN + L.path + '/scoreboard?dates=' + ymd(d) + L.q, { cache: 'no-store' }); if (r.ok) return (await r.json()).events || [] } catch { }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  return [];
}
function homeLine(c: any): number | null {
  const o = (c.odds || [])[0]; if (!o) return null;
  const close = o.pointSpread?.home?.close?.line ?? o.pointSpread?.home?.open?.line;
  if (close != null && !isNaN(Number(close))) return Number(close);
  const det = String(o.details || '').trim();
  if (/^(even|pk|pick)/i.test(det)) return 0;
  const m = det.match(/^(\S+)\s+([+-]?\d+(?:\.\d+)?)$/); if (!m) return null;
  const home = c.competitors.find((x: any) => x.homeAway === 'home');
  const favHome = home && (home.team.abbreviation === m[1]);
  const n = -Math.abs(Number(m[2]));
  return favHome ? n : -n;
}
function teams(c: any) { const h = c.competitors.find((x: any) => x.homeAway === 'home'), a = c.competitors.find((x: any) => x.homeAway === 'away'); return { h, a } }

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]; await fn(x) } }));
}

export async function buildDen(date = today(), log: (s: string) => void = () => { }) {
  const ranked: any[] = [['Sport', 'Category', 'Rank', 'Team', 'ATS %', 'Details']];
  const cache: any[] = [['Sport', 'Team ID', 'Team', '', 'Home W', 'Home L', 'Home P', 'Away W', 'Away L', 'Away P', 'SU W', 'SU L', '', 'As of']];
  const asof = offset(date, -1);
  for (const sport of Object.keys(LEAGUES)) {
    const L = LEAGUES[sport]; const days: string[] = [];
    for (let d = L.start; d <= asof; d = offset(d, 1)) days.push(d);
    const recs = new Map<string, Rec>(); const get = (t: any) => { let r = recs.get(t.id); if (!r) recs.set(t.id, r = { id: t.id, name: t.displayName, hw: 0, hl: 0, hp: 0, aw: 0, al: 0, ap: 0, sw: 0, sl: 0 }); return r };
    let finals = 0, priced = 0;
    await pool(days, 6, async d => {
      for (const e of await day(sport, d)) {
        const c = e.competitions?.[0]; if (!c || !e.status?.type?.completed) continue;
        const { h, a } = teams(c); if (!h || !a) continue;
        const hs = Number(h.score), as = Number(a.score); if (isNaN(hs) || isNaN(as)) continue;
        finals++; const H = get(h.team), A = get(a.team);
        if (hs > as) { H.sw++; A.sl++ } else if (as > hs) { A.sw++; H.sl++ }
        const line = homeLine(c); if (line == null) continue; priced++;
        const m = hs - as + line;
        if (m > 0) { H.hw++; A.al++ } else if (m < 0) { H.hl++; A.aw++ } else { H.hp++; A.ap++ }
      }
    });
    log(`${sport}: ${finals} finals, ${priced} with closing spreads`);
    for (const r of recs.values()) cache.push([sport, r.id, r.name, '', r.hw, r.hl, r.hp, r.aw, r.al, r.ap, r.sw, r.sl, '', asof + 'T23:59:00Z']);
    const games = (await day(sport, date)).filter(e => e.status?.type?.state === 'pre');
    const rows: { cat: string; team: string; own: number; margin: number; details: string }[] = [];
    for (const e of games) {
      const c = e.competitions[0]; const { h, a } = teams(c); if (!h || !a) continue;
      const H = recs.get(h.team.id), A = recs.get(a.team.id); if (!H || !A) continue;
      const hh = pct(H.hw, H.hl), aa = pct(A.aw, A.al);
      const n = (x: number) => (x * 100).toFixed(1);
      if (hh != null && aa != null && H.hw + H.hl >= MIN_OWN && A.aw + A.al >= MIN_OPP) {
        const mg = hh - aa;
        rows.push({ cat: 'Home', team: H.name, own: hh, margin: mg, details: `Home ATS: ${rec(H.hw, H.hl, H.hp)} (W–L–Push; ${H.hw + H.hl} decisions)\nStraight Up: ${H.sw}–${H.sl}\nPlaying: vs ${A.name}\nOpponent Away ATS: ${rec(A.aw, A.al, A.ap)}\nOpponent Straight Up: ${A.sw}–${A.sl}\nMatchup ATS margin: ${mg >= 0 ? '+' : ''}${n(mg)} percentage points.\nRanked by own-role ATS% minus opponent opposite-role ATS%; pushes excluded. ESPN finals + closing spreads through ${asof} Central. Small samples; not a win probability.` });
      }
      const ah = pct(A.aw, A.al), hh2 = pct(H.hw, H.hl);
      if (ah != null && hh2 != null && A.aw + A.al >= MIN_OWN && H.hw + H.hl >= MIN_OPP) {
        const mg = ah - hh2;
        rows.push({ cat: 'Away', team: A.name, own: ah, margin: mg, details: `Away ATS: ${rec(A.aw, A.al, A.ap)} (W–L–Push; ${A.aw + A.al} decisions)\nStraight Up: ${A.sw}–${A.sl}\nPlaying: @ ${H.name}\nOpponent Home ATS: ${rec(H.hw, H.hl, H.hp)}\nOpponent Straight Up: ${H.sw}–${H.sl}\nMatchup ATS margin: ${mg >= 0 ? '+' : ''}${n(mg)} percentage points.\nRanked by own-role ATS% minus opponent opposite-role ATS%; pushes excluded. ESPN finals + closing spreads through ${asof} Central. Small samples; not a win probability.` });
      }
    }
    for (const side of ['Home', 'Away']) {
      const list = rows.filter(r => r.cat === side);
      const best = [...list].sort((x, y) => y.margin - x.margin || y.own - x.own).slice(0, TOP);
      const worst = [...list].sort((x, y) => x.margin - y.margin || x.own - y.own).slice(0, TOP);
      best.forEach((r, i) => ranked.push([sport, 'Best ' + side, i + 1, `${i + 1}. ${r.team}`, r.own, r.details]));
      worst.forEach((r, i) => ranked.push([sport, 'Worst ' + side, i + 1, `${i + 1}. ${r.team}`, r.own, r.details]));
    }
    log(`${sport}: ${games.length} games today, ${rows.length} rankable sides`);
  }
  return { 'Den Nov8 Ranked': ranked, '_Lions Den Team Cache': cache };
}

export async function saveDen(pass: string, date: string, den: any) {
  const r = await fetch(SB + '/rest/v1/rpc/lcn_den_put', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ pass, d: date, den }) });
  const v = await r.json().catch(() => null); if (!r.ok || v?.error) throw Error(v?.error || v?.message || 'Den save failed'); return v;
}

let running = false;
/** Called on app load: if today's Den is missing, build it in the background and save it. */
export async function ensureDen(pass: string, denDate: string, onDone: () => void) {
  const d = today(); if (!pass || denDate === d || running) return;
  try { if (localStorage.getItem('lcn-den-try') === d + ':' + new Date().getHours()) return; localStorage.setItem('lcn-den-try', d + ':' + new Date().getHours()) } catch { }
  running = true;
  try { const den = await buildDen(d); await saveDen(pass, d, den); onDone() } catch (e) { console.warn('Lions Den build failed', e) } finally { running = false }
}
