// Live scores for tonight's locks, straight from ESPN's free scoreboard (refreshes every 60s).
// Unofficial until the nightly grader writes the real result into the book.
import { useEffect, useState } from 'react';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const PATHS: Record<string, string> = { NBA: 'basketball/nba/scoreboard', CBB: 'basketball/mens-college-basketball/scoreboard?groups=50&limit=400', CFB: 'football/college-football/scoreboard?groups=80&limit=400', NFL: 'football/nfl/scoreboard' };
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/\bst[.]?\s/g, 'saint ').replace(/[^a-z0-9]/g, '');
export type Game = { state: string; detail: string; away: string; home: string; awayAbbr: string; homeAbbr: string; as: number; hs: number; start: string };

export async function fetchGames(date: string): Promise<Record<string, Game>> {
  const out: Record<string, Game> = {}; const d = date.replace(/-/g, '');
      await Promise.all(Object.entries(PATHS).map(async ([sport, path]) => {
        try {
          const j = await (await fetch(ESPN + path + (path.includes('?') ? '&' : '?') + 'dates=' + d, { cache: 'no-store' })).json();
          for (const e of j.events || []) {
            const c = e.competitions?.[0]; const h = c?.competitors?.find((x: any) => x.homeAway === 'home'), a = c?.competitors?.find((x: any) => x.homeAway === 'away'); if (!h || !a) continue;
            const g = { state: e.status?.type?.state || 'pre', detail: e.status?.type?.shortDetail || '', away: a.team.displayName, home: h.team.displayName, awayAbbr: a.team.abbreviation, homeAbbr: h.team.abbreviation, as: Number(a.score || 0), hs: Number(h.score || 0), start: e.date || '' };
            out[sport + '|' + norm(g.away) + '|' + norm(g.home)] = g;
          }
        } catch { }
      }));
  return out;
}
export function useLive(date: string) { return useLiveData(date).games }
export function useLiveData(date: string, every = 60000) {
  const [tick, setTick] = useState(0);
  const [stamp, setStamp] = useState(0);
  const [games, setGames] = useState<Record<string, Game>>({});
  useEffect(() => {
    let dead = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      const out = await fetchGames(date);
      if (!dead) { setGames(out); setStamp(Date.now()) }
    };
    // Boss 11/17: refresh on the clock (7:15, 7:20, 7:25…), not 5 min after you opened it
    let t: any; const next = () => { t = setTimeout(() => { load(); next() }, every - (Date.now() % every) + 1000) };
    load(); next(); document.addEventListener('visibilitychange', load);
    return () => { dead = true; clearTimeout(t); document.removeEventListener('visibilitychange', load) };
  }, [date, every, tick]);
  return { games, stamp, reload: () => setTick(t => t + 1) };
}

export function lockTerms(l: any) {
  const first = String(l.card || '').split('\n')[0].replace(/^\d+\s*[•.)]?\s*/, '').replace(/\s+[+-]\d{3,}\s*$/, '').trim();
  const matchup = l.frozen?.matchup || String(l.card || '').split('\n').find((s: string) => /\sat\s/.test(s)) || '';
  const market = l.frozen?.market || (/\bML$/.test(first) ? 'ML' : /^(over|under)\s/i.test(first) ? 'Total' : 'Spread');
  return { pick: l.frozen?.pick || first, matchup, market, sport: l.sport };
}
export function findGame(games: Record<string, Game>, sport: string, matchup: string) {
  if (!games || !matchup) return null; // Boss 11/27: a shortlist play with no matchup crashed the page
  const [a, h] = String(matchup).split(/\s+at\s+/); if (!a || !h) return null;
  const k = sport + '|' + norm(a) + '|' + norm(h); if (games[k]) return games[k];
  const na = norm(a), nh = norm(h), m = (x: string, n: string) => x.startsWith(n) || n.startsWith(x);
  // Boss 11/23: our slate sometimes has home/away flipped vs ESPN (Nevada at SF was really SF at Nevada) - match either way
  const hit = (flip: boolean) => Object.entries(games).find(([key]) => key.startsWith(sport + '|') && (() => { const [, x, y] = key.split('|'); return flip ? m(x, nh) && m(y, na) : m(x, na) && m(y, nh) })())?.[1];
  return games[sport + '|' + nh + '|' + na] || hit(false) || hit(true) || null;
}
/** 'W' | 'L' | 'Push' when final; 'up' | 'down' | 'even' while live; '' before tip or when it can't be read. */
export function evalPick(pick: string, market: string, g: Game | null): string {
  if (!g || g.state === 'pre') return '';
  const fin = g.state === 'post';
  const done = (v: number) => fin ? (v > 0 ? 'W' : v < 0 ? 'L' : 'Push') : (v > 0 ? 'up' : v < 0 ? 'down' : 'even');
  if (market === 'Total') { const m = pick.match(/^(over|under)\s+([\d.]+)/i); if (!m) return ''; const t = g.as + g.hs - Number(m[2]); return done(/over/i.test(m[1]) ? t : -t) }
  const team = norm(pick.replace(/\s+(ML|[+-]?\d+(\.\d+)?)$/i, ''));
  const isHome = norm(g.home).startsWith(team) || team.startsWith(norm(g.home)), isAway = norm(g.away).startsWith(team) || team.startsWith(norm(g.away));
  if (isHome === isAway) return '';
  const diff = isHome ? g.hs - g.as : g.as - g.hs;
  if (market === 'ML') return done(diff);
  const line = Number((pick.match(/([+-]?\d+(?:\.\d+)?)$/) || [])[1]); if (isNaN(line)) return '';
  return done(diff + line);
}
const LABEL: Record<string, string> = { W: '✓ Won (unofficial)', L: '✕ Lost (unofficial)', Push: '∞ Push (unofficial)', up: 'Cashing right now', down: 'Losing right now', even: 'Dead even' };
export function LiveTag({ lock, games }: { lock: any; games: Record<string, Game> }) {
  if (lock.result) return null;
  const t = lockTerms(lock); const g = findGame(games, t.sport, t.matchup); if (!g || g.state === 'pre') return null;
  const s = evalPick(t.pick, t.market, g);
  return <div className={'live-tag ' + (s === 'W' || s === 'up' ? 'green' : s === 'L' || s === 'down' ? 'red' : '')}>
    <span className={g.state === 'in' ? 'live-dot' : ''}>{g.state === 'in' ? 'LIVE' : 'FINAL'}</span>
    <b>{g.awayAbbr} {g.as} – {g.hs} {g.homeAbbr}</b>{g.state === 'in' && <small>{g.detail}</small>}
    {s && <em>{LABEL[s]}</em>}
  </div>;
}
export function LiveStrip({ locks, games }: { locks: any[]; games: Record<string, Game> }) {
  const rows = locks.map(l => { const t = lockTerms(l); const g = findGame(games, t.sport, t.matchup); return { l, g, s: l.result || evalPick(t.pick, t.market, g) } });
  const live = rows.filter(r => r.g?.state === 'in').length, fin = rows.filter(r => ['W', 'L', 'Push'].includes(r.s)).length;
  if (!live && !fin) return null;
  const win = (r: any) => { const o = Number(r.l.frozen?.odds ?? (String(r.l.card).split('\n')[0].match(/([+-]\d{3,})\s*$/) || [])[1]); const risk = Number(r.l.risk ?? r.l.frozen?.risk ?? 20000); return o < 0 ? risk * 100 / Math.abs(o) : risk * o / 100 };
  const net = rows.reduce((s, r) => s + (r.s === 'W' ? win(r) : r.s === 'L' ? -Number(r.l.risk ?? r.l.frozen?.risk ?? 20000) : 0), 0);
  const by = new Map<string, { w: number; l: number; up: number; down: number }>();
  for (const r of rows) { const b = by.get(r.l.analyst) || { w: 0, l: 0, up: 0, down: 0 }; if (r.s === 'W') b.w++; else if (r.s === 'L') b.l++; else if (r.s === 'up') b.up++; else if (r.s === 'down') b.down++; by.set(r.l.analyst, b) }
  return <div className="panel live-strip">
    <div><span className="live-dot">LIVE</span> <b>{live} going</b> · <b>{fin} final</b> · crew locks tonight <strong className={net >= 0 ? 'green' : 'red'}>{net >= 0 ? '+' : '−'}${Math.round(Math.abs(net) / 100)}</strong></div>
    <div className="live-strip-crew">{[...by.entries()].map(([a, b]) => <span key={a}>{a.split(' ')[0].replace("G'", 'G’')}: {b.w}–{b.l}{b.up || b.down ? ` (${b.up}↑ ${b.down}↓ live)` : ''}</span>)}</div>
    <small className="muted">Unofficial until the 1:30 AM grader settles it.</small>
  </div>;
}

/** Boss 11/24: pages re-pull as games go final. Ticks every 2 minutes on the clock and when the app comes back to the front. */
export function useTick(every = 120000) {
  const [n, set] = useState(0);
  useEffect(() => { let t: any; const next = () => { t = setTimeout(() => { if (document.visibilityState === 'visible') set(x => x + 1); next() }, every - Date.now() % every + 1500) }; next(); const v = () => { if (document.visibilityState === 'visible') set(x => x + 1) }; document.addEventListener('visibilitychange', v); return () => { clearTimeout(t); document.removeEventListener('visibilitychange', v) } }, [every]);
  return n;
}
