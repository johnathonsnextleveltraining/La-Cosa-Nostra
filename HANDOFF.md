# Hova handoff: read this first (updated 2026-11-17, Bankroll)

New chat? You are **Hova**, underboss of La Cosa Nostra. Boss = Johnny Biz. Talk like a homeboy: cussing, trash talk about the crew, metaphors. Sign off 🐶🐾💰. When offering to do something, say "all you got to do is say less, and I'ma make it happen" (never "say the word").

## The crew
- **Hova** (you): your own card, Rithmm's card, G' Money's card, Sharps/Paulie, all grading, and the app code. Only Hova edits code.
- **Hova's own card (from 11/18, `rules:hova_card`):** NBA totals lean Under; CBB totals unchanged; CFB totals only with a real read, never a lock; prefer ML dog over spread dog; no ML favorite worse than −300; every game keeps its spread lean, but fewer CBB spread locks and pickier sides (weigh Sharps' side when we disagree). **No CBB favorite moneylines** (CBB favorites doubled spread+ML lost $4,725 since 10/1); CBB favorite spreads need Sharps or a real edge, flip to the dog when Sharps are on it, never a CBB favorite spread lock. **HOVA SYSTEM v1 (11/19):** own tested spread angles, not copying Sharps (tools/hova-system.md, rule 6 in `rules:hova_card`). Review 12/3.
- **Card scope (Boss 11/19, `rules:card_scope`):** only games where Paulie or Rithmm has a pick, plus every Top 25 and every Lions Den game. Everything else is cut from every card. Build Paulie + Rithmm first.
- **Next-level research (Boss 11/19, `rules:deep_research`):** on every Hova+Sharps agreement, run tools/deep-research.js (trends, star vs opponent, coaches, rest, H2H ATS), flag each pick in `lcn.research` (CONFIRMED / CHALLENGED / CHANGED / NO HELP). `lcn.research_scored` grades whether the research helped once picks settle.
- **Rithmm**: read from Boss's Rithmm account at app.rithmm.com in his Chrome. Never invent picks.
  - Locks (Boss 11/17, from the 11/18 card): top 3 by edge in every sport playing that night, then fill to 12 by highest edge. Save each edge in `frozen.edge`. Full rule in `rules:rithmm`.
- **G' Money**: Gemini at gemini.google.com in Boss's Chrome.
  1. Send the intro in `lcn.settings` key `gmoney:intro` VERBATIM first.
  2. Send the slate with DraftKings lines.
  3. Ask for every spread and total lean, the moneylines, and 12 locks.
  4. Check his lines against the slate. Resend the "Games he FUCKED UP", up to 4 rounds.
  5. Never invent his picks.
- **Nino**: ChatGPT. Logs his own card straight into Supabase. He's in charge of artwork.
- **Sharps/Paulie** (Hova's job): source is **Sports Betting Dime** (Boss 11/17; DraftKings dknetwork is blocked in Chrome and stale). Pages sportsbettingdime.com/{nba,nfl,college-basketball,college-football}/public-betting-trends/ — read in Boss's Chrome; the grid is in the `srwc-public-betting-trends` shadow DOM, team names in `[title]/[alt]`, output is capped ~1000 chars per JS call so slice it.
  - Type the slate games' splits into `lcn.sbd_splits` (one row per game, away = first team of our slate matchup). View `lcn.sbd_priced` expands sides and prices each from the crew's DraftKings picks (same price rule); fallback: other side's line at -110, ML falls back to SBD odds.
  - Paulie = side with tickets > 50%. Sharps = money% − tickets% ≥ 6. Locks: Paulie by tickets%, Sharps by the gap; ML locks −350 or better; letter from the share (rules:sharps_paulie). IDs `pick:sp-…` / `lock:sp-<date>-<sharp|paulie>-<rank>`, loaded_from `hova-splits`. 11/17: Paulie 117 picks, Sharps 66, 12 locks each.
- **Boss** doesn't log his own bets. He sends screenshots and Hova logs them as `is_actual_wager` picks via the `logbet` op.

## Daily card
- No scheduled morning run. Everything runs when Boss says **"get the crew's picks"**.
- Same game set for everyone, DraftKings lines (from ESPN scoreboard odds).
- Size: 125 picks (50 spreads, 50 totals, 25 ML) on a common 50-game slate, plus 12 locks. Cap is 150 per analyst and 50 per market.
- Every Top 25 college game is always included.
- Every Lions Den game (the Den's top 3 per sport in each of the 4 lists) is always included too (Boss 11/17, `rules:den_games`). Check the Den before building cards. When over the cap, keep Den + Top 25 games first.
- Lock grades use ROI over the last 60 days, same sport and market: A ≥ +8%, B ≥ 0%, C below 0% or fewer than 10 settled picks.
- Rules are stored in `lcn.settings`: `rules:gmoney`, `gmoney:intro`, `rules:rithmm`, `rules:top25`, `rules:lock_grades`, `rules:art`, `rules:den_games`, `rules:sharps_paulie`.

## The Sit-Down (group chat)
- The chat lives in table `lcn.messages` in the app.
- If Boss asks a question there, answer there.
- "ayooo" means go read and post a reply.

## Tech
- **Supabase** project `nnwnaskgkugxfunxmllc`, schema `lcn`. Tables: picks, locks, settings, messages, cash_ledger.
- **API**:
  - `public.lcn_api2(pass, op, args)`. Ops: sig, picks_since, logbet. Everything else delegates to `lcn_api`.
  - `public.lcn_den_put` saves the Lions Den.
- **App**:
  - Repo: johnathonsnextleveltraining/La-Cosa-Nostra. GitHub Pages serves `/docs`.
  - Live at https://johnathonsnextleveltraining.github.io/La-Cosa-Nostra/
  - `src/` is Nino's v54 React source (patched). `src/lib/engine.ts` `stateFor` computes every page client-side, and `src/app/page.tsx` holds the pages.
  - `web/` is Hova's code:
    - adapter.ts: API plus IndexedDB cache.
    - den.ts: Lions Den self-build from ESPN closing lines.
    - sitdown.tsx and unread.ts: the chat and its unread badge.
    - live.tsx: live score tags on locks.
    - logbet.tsx: bet logging (hidden from the menu).
    - extra.css: Hova's styles.
    - css.py: inlines the CSS.
    - index.template.html: page template.
- **Build:** `bun build web/main.tsx --outfile docs/app.js --minify --target browser && python3 web/css.py`. The second step inlines the CSS and cache-busts `app.js?v=hash`. The app auto-reloads when the hash changes.
- **Test the phone view** in Chrome: open the manifest.webmanifest page and inject a 390px iframe of the app.
- **Art:** Boss drops files in the Google Drive folder "La Cosa Nostra" (id `1Q2HQW6jsNJ-prdy_SIEMxCn3eOhe2tb6`). Hova resizes them to webp in `docs/art/` and places them where Boss or Nino says.

## Scheduled tasks
- Nightly grader, 1:30 AM CT (`trig_01MXF4wKLaLLAVxrF6PGFTBX`): ON. Boss hasn't said whether to keep it.
- 3:45 AM, midday, and 4:15 Mac runs: OFF. Cloud tasks can't reach Boss's Chrome.

## Renovation in progress (page by page)
**Big Board, done:**
- Jailhouse crew picture at the top right.
- One list, highest win rate first.
- Tapping a game shows the last 7 times that crew agreed (same sport and bet type) with ✓/✕.
- Fixed phone header.
- Robot disclaimers removed.

**Big Board: COMPLETE (Boss, 11/17).**

**Font, DONE 11/17:** Saira Stencil One for titles, team names and big numbers; Barlow for body text (Google Fonts link in web/index.template.html, rules at the bottom of web/extra.css). Boss called it "as close as it's gonna get". Don't reopen it unless he does. Nino may still draw title images.

**Bankroll: COMPLETE (Boss, 11/17):**
- Tagline "Men lie, women lie, numbers don't lie." Gold dollar sign (docs/art/dollar.webp) centered right of the title.
- "This week with the Bookie" heading over tiles: MONEY IN THE STASH / PLAY MONEY (bookie > $1) or LOST MONEY / ACTUAL BANKROLL / BALANCE UPDATED.
- Dropdown (white text, gold triangle): "2026 Annual" → 1ST–4TH QUARTER; each month → WEEK 1–5 (Mon–Sun, week belongs to the month of its Monday). Win = CASHED OUT, loss = FUCKED OFF.
- Data = Boss's real tickets (`stateFor().myWagers`). Date math avoids `new Date(string)` parsing (iPhone Safari threw "Invalid Date"). `Catch` error boundary shows "Page tripped: <error>" instead of a black screen.
- Money-movement form and money-rules box removed.

**Locked & Loaded: DONE (11/17).**
- Mugshot popup: "Last 7 locks" with ✓/✕ above the by-grade table (follows the popup's sport buttons). Fine print removed.
- Gold crown (DenCrown) next to the name of the best 30-day locks record per sport (min 5 settled, ties → more wins → more money). Sport tag under the crown on All Sports.
- Lions Den lion (docs/art/den-lion.webp, black lion on white circle, Boss picked it) left of the grade when a lock's team is one of the Den's "Best Home"/"Best Away" teams for that sport and date (Den TOP=3 per side per sport). Boss never answered same-side vs top-10; Den's Best lists are its picks, so that's the rule until he says otherwise.

**Lions Den: DONE (11/17):**
- Compact cards: "N. Team line" + "vs Opp · 5-2 home ATS vs 1-5 away" + EDGE (matchup ATS margin, rounded). Tap a card for the full breakdown (fine print stripped). Source-coverage panel removed.
- Line = Hova's DraftKings line, else the crew's most common (`denLine` in src/lib/den-lines.ts); results graded on that line.
- Boss wants the BIGGEST mismatches even off the crew's slate: every game is ranked; off-slate teams get a red "NOT ON THE CREW'S CARD" tag. Top 3 per sport per list (den.ts TOP=8 now).
- Gold box next to the result: crew on that side + their 60-day agreement record (`sideCrews` in engine).
- Banner shows "LIONS DEN · W-L LAST 30 DAYS" from saved Den snapshots (Best lists only).
- `sameTeam` strips parentheses so "Miami (OH)" matches.

**Who's the Boss (was Let's Get Paid, renamed 11/17): DONE pending Boss's OK:**
- Boss = most money made in the sport over the last 30 days (min 10 decisions); Underboss = most money made together with the Boss (min 5 same-side, same-price picks). Each shows dollars + ROI (green/red), win %, and record (src/lib/paid-engine.ts).
- "Your real tickets" Johnny Biz strip on top: this week, this month (Mon–Sun weeks, same as Bankroll), and his locks over 30 days.
- Matching picks show the Den lion (`denLionFor`), ✓/✕/∞, and a grade only if one exists. Fine print removed. All Sports = tap-to-open sport sections.
- Art: Nino's cartoon portraits docs/art/paid-<x>.webp (from Drive mafia-<x>-cartoon.png, 11/17). BOSS on the left, UNDERBOSS on the right, gold title above each. The duo picture was scrapped (Boss); the "When they agree" card stays with no picture. art/duos/ is unused now.

**Paid in Full: IN PROGRESS (11/17):** no cents on money; Weekly Command Center uses Mon–Sun weeks (week belongs to the month of its Monday, same as Bankroll); Best Money Connections (Top Duo / Triple Threat) moved right under the calendar. Boss KEEPS: sticky analyst header, Sport by Sport table as is, "No play" (means no bet). Fine print under the chart is pending his call.

**Usual Suspects: DONE pending Boss's OK (11/17):** ranked by 14-day money (titles follow the rank), no cents, top 3 big cards / 4–7 compact rows, Fade File = crew only (no Johnny Biz) and worst = most money lost together, fine print removed.

**Bragging Rights: DONE pending Boss's OK (11/17):** Annual Books = crew + Johnny Biz only (old touts like Vegas Covers hidden); fine print gone. ROI everywhere (engine `summarize`): a crew pick with a result but no saved stake counts at $200. Partners in Crime ranked by money made together (history() now tracks net/risk), compact rows, top 10 + Show more.

**Get Money (NEW, Boss 11/17), first in the menu, above the Big Board:** web/getmoney.tsx. Menu icon: Nino's fedora, art/menu-getmoney.webp. A live sweat board for every game on tonight's card (data.current, crew + Johnny Biz, spread/total/ML). ESPN scores every 5 minutes via `useLiveData(date, 300000)` in web/live.tsx (also a manual ↻ button). Live games are open; upcoming/final games are tap-to-open. Each side shows ✓/✕/▲/▼, odds, and the mugshots of who's on it, with a BOSS $ tag on Johnny's real tickets. The top strip has each analyst's night so far (finals W–L + money, live ▲/▼) plus Johnny Biz. Unofficial until the 1:30 AM grader settles it.

**Menu order (Boss 11/19):** Get Money, Bragging Rights, Big Board, Who's the Boss, Locked & Loaded, Lions Den, Paid in Full, Usual Suspects, Ledger, Sit-Down, Bankroll, Data Health. Big Board tagline: "When 3 agree, we all eat." in gold.

**Next pages (Boss can jump the order, he did with Bankroll):**
1. Let's Get Paid
2. Paid in Full
3. Usual Suspects
4. Bragging Rights
5. Ledger
6. Sit-Down
7. Data Health

## Loose ends
- Nino owes 17 common-slate games for 11/17 (5 of them Top 25) and should drop his 11 off-slate games.
- Live score tags on locks are not yet verified during real games.
- Boss hasn't answered whether a push should show as ∞.
- The $106.40 deduction on the 27th is not automated.
- Hard rules:
  - Never type Boss's passwords.
  - Never invent anyone's picks or results.
  - Never spend money.

**Boss 11/18 changes (live):**
- Big Board: only crews hitting **61%+ together over at least 5 decided games** make the board (Boss picked 5). TODAY / LAST NIGHT switch under the sport tabs; Last Night shows yesterday's 61%+ board with ✓/✕ plus analyst chips (THE CREW, each analyst, Johnny Biz). Tapping a chip turns the 4 boxes into that analyst's last-night Record / Money / Locks / Big Board record and filters the board to crews they were in. Old "Last Night's Business" strip removed (the switch replaces it).
- Who's the Boss: tap the Boss/Underboss portraits (or "Last night together ▼") → every game they were on the same side last night (line ignored) with ✓/✕, record and money (`lastNight` in paid-engine).
- Lions Den: tap the lion → that sport's Den history: Den W–L plus each analyst who rode a Den pick (Best Home/Away top 3, spread or ML on the Den team): record, win %, money (`denHistory` in page.tsx). Only 4 Den snapshots saved so far (11/8, 11/9, 11/17, 11/18).
- Bankroll: bookie balance = Monday snapshot + this week's real-ticket net; ACTUAL BANKROLL = stash + that (i.e. stash minus what's owed).

- Bragging Rights Partners in Crime (Boss 11/18): ranked by **ROI**, min **20 decided games** together, per sport + bet type, 60 days (history()). ROI is the big number, dollars underneath. Who's the Boss stays the 30-day money board.
- Bragging Rights books table on phones: name on top, labeled record row underneath (.books-table).

**Real-time grading (Boss 11/17):** every page grades picks and locks the moment ESPN calls the game final (`provisional()` in web/adapter.ts, today + yesterday, unofficial overlay with `unofficial:true`; ESPN scores cached 60s). Pages already reload state every 5 min when open (BoardSync) and also on the clock at :00/:30. The 1:30 AM grader still writes the official result into the book.

**Bragging Rights (11/19):** Partners in Crime shows the top 5 only; tap the faces to see tonight's games that group is on the same side of (live ✓/✕).
**The Ledger: DONE pending Boss's OK (11/19):** filtered locally from the cached book in web/adapter.ts (`ledger()`, live grades included). Opens on Last Night. Running total (record, money, ROI, picks), range chips (Today/Last Night/This Week/This Month/All Time + date), analyst face chips (Johnny = My Tickets), result + bet-type chips, Locks only, search, phone cards with ✓/✕ and money, badges: crown = lock, lion = Lions Den game, research flag from `lcn.research` (RPC `public.lcn_research`). CSV export built on the phone (`/api/export`).
**The Sit-Down: DONE pending Boss's OK (11/19):** text thread (web/sitdown.tsx). Boss on the right, crew on the left, newest at the bottom, day separators. Messages to Boss in gold, crew-to-crew chatter hidden behind "Everything". Send bar pinned to the bottom, From is always Johnny Biz, To = Everybody / Hova / Nino.
**Data Health: DONE pending Boss's OK (11/19):** plain-English checklist with green/yellow/red lights (cards tonight, 12 locks each, Rithmm full card, last night graded, Lions Den built, Boss tickets logged, book size). Downloads: whole book CSV (`/api/export`) and full JSON backup (`/api/backup`). All the old migration/audit fine print is gone.
**Renovation: every page done.**
**11/19 later:** Bragging Rights moved under Get Money. Partners in Crime: tap the whole box (tonight's games together), then "Last 10 games" (`/api/together`) for the last 10 graded games that group agreed on. Boss's tickets are graded from final scores (rules:johnny_grading; nightly grader prompt updated) — never wait for his slip.
