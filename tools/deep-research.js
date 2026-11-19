// Hova next-level research (Boss 11/19). Run in Chrome on the app's github.io origin.
// Input: window.__games = [{sport, matchup, picks:[{id, market, selection}]}], date 'YYYYMMDD' in window.__date.
// Output: window.__deep = per-game layers: trends, star vs opponent, coaches, rest, head-to-head ATS.
window.__deep = null;
(async () => {
const PATH = { CBB: 'basketball/mens-college-basketball', NBA: 'basketball/nba', CFB: 'football/college-football', NFL: 'football/nfl' };
const Q = { CBB: '&groups=50&limit=400', CFB: '&groups=80&limit=400', NBA: '', NFL: '' };
const SEASONS = { CBB: [2024, 2025, 2026, 2027], NBA: [2024, 2025, 2026, 2027], CFB: [2023, 2024, 2025, 2026], NFL: [2023, 2024, 2025, 2026] };
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/\bst[.]?\s/g, 'saint ').replace(/[^a-z0-9]/g, '');
const same = (x, y) => x === y || x.startsWith(y) || y.startsWith(x);
const J = async u => { try { return await (await fetch(u)).json() } catch { return null } };
const B = sp => 'https://site.api.espn.com/apis/site/v2/sports/' + PATH[sp] + '/';
const boards = {};
const out = [];
for (const G of window.__games) {
  const sp = G.sport; const B0 = B(sp);
  boards[sp] ??= await J(B0 + 'scoreboard?dates=' + window.__date + Q[sp]);
  const [A, H] = G.matchup.split(/\s+at\s+/);
  const ev = (boards[sp]?.events || []).find(e => { const c = e.competitions[0].competitors; const h = c.find(x => x.homeAway === 'home'), a = c.find(x => x.homeAway === 'away'); return (same(norm(h.team.displayName), norm(H)) && same(norm(a.team.displayName), norm(A))) || (same(norm(h.team.displayName), norm(A)) && same(norm(a.team.displayName), norm(H))) });
  if (!ev) { out.push({ ...G, error: 'event not found' }); continue }
  const comp = ev.competitions[0]; const teams = comp.competitors.map(c => ({ id: c.team.id, name: c.team.displayName, side: c.homeAway, rank: c.curatedRank?.current }));
  const s = await J(B0 + 'summary?event=' + ev.id) || {};
  const L = { event: ev.id, start: ev.date, neutral: !!comp.neutralSite, teams };
  // 1. matchup trends: last five, season ATS, ESPN predictor, current line vs ours
  L.trends = {
    lastFive: (s.lastFiveGames || []).map(t => ({ team: t.team?.displayName, games: (t.events || []).map(e => ({ date: e.gameDate?.slice(0, 10), res: e.gameResult, score: e.score, opp: e.opponent?.displayName || e.opponent?.abbreviation, ats: e.atsResult?.result || e.atsResult || null })) })),
    ats: (s.againstTheSpread || []).map(t => ({ team: t.team?.displayName, records: (t.records || []).map(r => r.type + ' ' + r.summary) })),
    predictor: s.predictor ? { home: s.predictor.homeTeam?.gameProjection, away: s.predictor.awayTeam?.gameProjection } : null,
    line: (s.pickcenter || [])[0] ? { details: s.pickcenter[0].details, total: s.pickcenter[0].overUnder } : null,
    injuries: (s.injuries || []).flatMap(t => (t.injuries || []).map(i => (t.team?.abbreviation || '') + ' ' + i.athlete?.displayName + ' ' + (i.status || i.type?.description || ''))).slice(0, 8),
  };
  // stars = season points leaders
  const stars = (s.leaders || []).map(t => { const p = (t.leaders || []).find(x => /point/i.test(x.name))?.leaders?.[0]; return p ? { team: t.team?.displayName, id: p.athlete?.id, name: p.athlete?.displayName, ppg: p.value } : null }).filter(Boolean);
  // 4. rest + 5. head-to-head from team schedules
  const sched = {}; const meetings = [];
  for (const t of teams) {
    sched[t.id] = [];
    for (const yr of SEASONS[sp]) {
      const j = await J(B0 + 'teams/' + t.id + '/schedule?season=' + yr); for (const e of j?.events || []) sched[t.id].push(e);
    }
  }
  const other = id => teams.find(t => t.id !== id).id;
  const seen = new Set();
  for (const e of sched[teams[0].id]) {
    const c = e.competitions?.[0]; if (!c || seen.has(e.id) || e.id === ev.id) continue;
    if (!c.competitors?.some(x => x.id === other(teams[0].id) || x.team?.id === other(teams[0].id))) continue;
    if (!(c.status?.type?.completed)) continue; seen.add(e.id); meetings.push(e);
  }
  const rest = teams.map(t => {
    const past = sched[t.id].filter(e => e.date < ev.date && e.competitions?.[0]?.status?.type?.completed).map(e => e.date).sort();
    const last = past[past.length - 1]; const days = last ? Math.round((Date.parse(ev.date) - Date.parse(last)) / 864e5 * 10) / 10 : null;
    const in7 = past.filter(d => Date.parse(ev.date) - Date.parse(d) <= 7 * 864e5).length;
    return { team: t.name, lastGame: last?.slice(0, 10), daysRest: days, gamesLast7: in7 };
  });
  L.rest = rest;
  L.h2h = [];
  for (const m of meetings.sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 6)) {
    const ms = await J(B0 + 'summary?event=' + m.id) || {};
    const cs = m.competitions[0].competitors; const hc = cs.find(x => x.homeAway === 'home'), ac = cs.find(x => x.homeAway === 'away');
    const hs = Number(hc.score?.value ?? hc.score), as = Number(ac.score?.value ?? ac.score);
    const pc = (ms.pickcenter || [])[0]; const spread = pc?.spread != null ? Number(pc.spread) : null; // home line (negative = home fav) per ESPN
    const homeLine = pc?.homeTeamOdds?.favorite ? -Math.abs(spread) : pc?.awayTeamOdds?.favorite ? Math.abs(spread) : (spread ?? null);
    const cover = homeLine == null ? null : (hs + homeLine > as ? hc.team.displayName : hs + homeLine < as ? ac.team.displayName : 'push');
    const starLines = stars.map(st => { const p = (ms.boxscore?.players || []).flatMap(t => (t.statistics || []).flatMap(g => (g.athletes || []).map(a => ({ id: a.athlete?.id, labels: g.labels, stats: a.stats })))).find(a => a.id === st.id); if (!p) return null; const i = p.labels.indexOf('PTS'); return st.name + ' ' + (i >= 0 ? p.stats[i] : '?') + ' pts' }).filter(Boolean);
    L.h2h.push({ date: m.date.slice(0, 10), home: hc.team.displayName, score: ac.team.abbreviation + ' ' + as + ' - ' + hs + ' ' + hc.team.abbreviation, homeLine, total: pc?.overUnder ?? null, cover, overUnder: pc?.overUnder != null ? (hs + as > pc.overUnder ? 'over' : hs + as < pc.overUnder ? 'under' : 'push') : null, stars: starLines });
  }
  // 2. star player vs opponent
  L.stars = stars.map(st => ({ ...st, vsOpp: L.h2h.map(h => h.stars.find(x => x.startsWith(st.name))).filter(Boolean) }));
  // 3. coaches from roster endpoint
  L.coaches = [];
  for (const t of teams) { const r = await J(B0 + 'teams/' + t.id + '/roster'); const c = (r?.coach || [])[0]; L.coaches.push({ team: t.name, coach: c ? c.firstName + ' ' + c.lastName : null, experience: c?.experience ?? null }) }
  out.push({ ...G, L });
}
window.__deep = out;
})().catch(e => window.__deep = { err: String(e.stack || e) });
'started';
