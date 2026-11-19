// Boss 11/19: Top 25 college teams show their rank in bright yellow next to the name, everywhere.
// Ranks come from ESPN's AP poll (college hoops + college football), refreshed hourly, cached on the device.
import { useEffect, useState, Fragment } from 'react';

type Ranked = { name: string; rank: number; sport: 'CBB' | 'CFB' };
const URLS: Record<string, string> = {
  CBB: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings',
  CFB: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings',
};
const KEY = 'lcn-ranks';
let list: Ranked[] = (() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && Date.now() - v.at < 6 * 3600e3 ? v.list : [] } catch { return [] } })();
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
async function load() {
  const out: Ranked[] = [];
  for (const [sport, url] of Object.entries(URLS)) {
    try {
      const j = await (await fetch(url)).json();
      const poll = (j.rankings || []).find((r: any) => /AP/i.test(r.name || r.shortName || '')) || (j.rankings || [])[0];
      for (const r of poll?.ranks || []) { const t = r.team || {}; const name = [t.location, t.name].filter(Boolean).join(' ') || t.displayName; if (name && r.current <= 25) out.push({ name, rank: r.current, sport: sport as any }) }
    } catch { }
  }
  if (out.length) { list = out.sort((a, b) => b.name.length - a.name.length); try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), list })) } catch { } subs.forEach(f => f()) }
}
function ensure() { if (!loading) { loading = load(); setInterval(() => { load() }, 3600e3) } }
export function useRanks() { const [, set] = useState(0); useEffect(() => { ensure(); const f = () => set(x => x + 1); subs.add(f); return () => { subs.delete(f) } }, []); return list }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Text with "#7" in bright yellow in front of every Top 25 college team name it contains. */
export function R({ t, s }: { t: any; s?: string }) {
  const ranks = useRanks(); const text = String(t ?? '');
  if (!text || !ranks.length || (s && s !== 'CBB' && s !== 'CFB')) return <>{text}</>;
  const pool = ranks.filter(r => !s || r.sport === s);
  const re = pool.length ? new RegExp('(' + pool.map(r => esc(r.name)).join('|') + ')(?![a-z])', 'gi') : null;
  if (!re) return <>{text}</>;
  const parts = text.split(re);
  if (parts.length === 1) return <>{text}</>;
  return <>{parts.map((p, i) => { const hit = i % 2 === 1 ? pool.find(r => r.name.toLowerCase() === p.toLowerCase()) : null; return hit ? <Fragment key={i}><span className="rk">#{hit.rank}</span>{p}</Fragment> : <Fragment key={i}>{p}</Fragment> })}</>;
}
