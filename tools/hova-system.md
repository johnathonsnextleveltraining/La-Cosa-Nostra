# Hova System v1 (11/19)

Run `tools/hova-backtest.js` in Chrome on the app's github.io origin (ESPN + Supabase reachable there, not from the workspace).
It pulls every ESPN final this season, matches the crew's stored lines, and grades angles.

Daily: for each CBB/CFB spread on Hova's card, find the line size and each team's last-game margin (ESPN), then:
- CFB dog +3.5 to +12 → dog. CFB line ≤3 or −12.5 to −20 → favorite.
- CBB dog +7.5 to +12 → dog.
- CBB team off a 15+ point loss → fade it.
- Conflicting angles → no lock. No angle → own read, never a lock.
- Totals: no tested edge, never a lock. CFB totals off.
Full rule text: `lcn.settings` key `rules:hova_card` (rule 6). Recheck angles 12/3; kill any under 52.4%.
