# LCN Old App — four-page visual handoff
Reference: OLD La Cosa Nostra, saved version 54.
Source commit: f8115889b0b8c4971ae8698c990df0fa0ca8b11e
This is the actual checked-out source and deployed artwork, not a redesign.

## Files
- LCN-v54-Frontend-Source.zip: complete shared page source, separate Paid in Full component, complete CSS including all later overrides, layout, package/config reference, and pure data/view helpers.
- LCN-v54-Deployed-Art.zip: every file in public/art plus public app icons, with the original relative paths preserved.
- SHA256SUMS.json: hashes and byte sizes for every supplied source/art file.

No server routes, database seed, environment files, credentials, repository metadata, or hosted database bindings are included. The front-end calls the old /api/state, /api/ledger and /api/manage paths: adapt those to your Supabase data adapter. This is a source handoff, not a separately configured runnable app.
The included artwork is the exact deployed full file bytes. Earlier image-generation masters are not claimed.

## Lions Den
app/page.tsx: Den, DenOutcome, DenCrown. lib/den-lines.ts: spread/result matching.
Art: public/art/den.webp for All Sports; den-nba.png, den-nfl.png, den-cbb.png, den-cfb.png for each sport.
UI: Today/Last Night switch, dated sport banner, four category panels in a two-column grid, ranked team/ATS/detail rows, spread labels/results and source-coverage disclosure.
Inputs: data.date, denDate, sourceDate, denSnapshots[date].den and .picks; ranked array 'Den Nov8 Ranked'; team array '_Lions Den Team Cache'. Dated imported snapshots, not fresh standings.
Ranking is upstream: actual scheduled matchup's team role ATS% minus opponent opposite-role ATS%; best uses largest positive gap, worst most negative. Up to3 per category/sport. No league-wide top3 eligibility cutoff. Pushes excluded from W/(W+L). Missing records stay unavailable.
CSS: .den-date-controls, .den-banner, .den-sport-banner, .den-lion-frame, .den-banner-title, .den-grid, .den-team, .den-outcome, plus media overrides.

## Let's Get Paid
app/page.tsx: GetPaid -> PaidSport -> MafiaProfile; detail modal stays in Home. lib/paid-engine.ts implements selection/data.
Art: mafia-{hova,nino,g,sharps,paulie,rithmm,johnny}.webp; public/art/duos/{boss}-{underboss}.webp preserves ordered roles; baby-*.webp in detail; menu-lets-get-paid.png and money-bag artwork.
UI: per-sport Boss/Underboss portrait pair, large duo scene, shared record/win%, up to10 matching-pick cards and detail modal. Preserve image contain sizing, not cropped stock avatars.
Inputs: data.getPaid[sport].boss, .underboss, .pair, .games, .from, .through.
Current deployed rule: rolling30days; Boss best eligible individual rate with10decisions; Underboss best eligible shared rate with Boss with5decisions; same saved side/line/price, ML -300 or better. Read paid-engine.ts for full tie handling. This describes deployed behavior, not a new policy.
CSS: .get-paid-dark, .paid-sport, .paid-boss-grid, .paid-profile, .paid-mafia-portrait, .paid-duo, .paid-matching-games, .paid-match, .paid-detail-pair, .baby-polaroid.

## Paid in Full
Separate complete component: app/paid-in-full.tsx. Shared helpers: engine.ts, pif-engine.ts.
Art: mafia-*.webp; paid-stamp.webp; coin-money-bag.webp and open-money-bag.webp.
UI: analyst portrait strip; sticky selected-analyst heading; actual seven-column month calendar with profit/loss cells; month/all-time sport table; weekly/month totals; interactive SVG bankroll/performance graph; duo/trio partner cards and filters; bet-type records.
Inputs are documented directly where used in PaidInFull: data.date, performance, paidInFull.byBetType and .agreements, crew identities; values remain integer cents. Cash versus tracked analyst performance must remain distinct. Unknown money must not be filled with fabricated values.
CSS: complete .pif* rules, including later sticky-heading/portrait/mobile overrides. Keep calendar seven columns; scroll the analyst strip and wide tables within their containers.

## Bragging Rights
app/page.tsx routing page==='Bragging Rights': seven-image .brag-lineup, Performance compact, Cohorts.
Functions: Performance, Cohorts, LineupPortrait. Helpers: engine.ts summarize/history/cohorts.
Art: jail-*.webp; Nino uses jail-nino-diesel.webp. These are the lineup portraits, not the circular lounge art used by Usual Suspects.
UI: portrait lineup; The Annual Books performance table with period/market/sport filters; Partners in Crime cards and Duo/Triple/Quad selector.
Inputs: data.analysts, data.performance, data.cohorts (fallback pairs), sport.
Deployed table sorts analyst summaries by recorded net. Cohort cards use prior60completed days, minimum5decisions and matching sport/market history; exact exclusions/grouping are in engine.ts. W/(W+L), pushes separate; ROI uses known settled stake/net.
CSS: .brag-lineup, .lineup-portrait, .table-person, .pair-grid, .pair-avatars, .pair.

## Shared visual system
Use app/globals.css IN FULL and preserve its order: later overrides are intentional.
Actual v54 variables: bg #0b0e12; panel #12161c; border #252a31; muted #9299a4; gold #d2b778; green #7cc9a6; red #ed8c8c; text #eeeee9.
Arial/Helvetica body; Georgia/Times editorial headings. Desktop236px sidebar,64px header; max1600px main; bespoke panels, fine borders, restrained gradients.
DenCrown is inline custom SVG in page.tsx; navigation PNG masks are also implemented there. Preserve them rather than replacing with emoji.
Breakpoints1100/800/600/500px; off-canvas navigation below800; contain transparent animal artwork; responsive card grids and internal horizontal scrolling.
The earlier requested baby-blue palette is a separate requested preference; the supplied v54 source is charcoal/gold.

## Boundaries
The r372 database export is already in lcn_raw run nino-full-r372-25e5499a4549. Do not put credentials/data copies into this visual package.
No screenshots are included in this delivery; it supplies actual source/art for the four requested pages. Do not represent this package as having a full screenshot walkthrough.
