# New1984 / SKY RAIDERS ’84

GitHub Pages serves the root directory without a build step.

## Ranking

Ranking uses the existing Supabase project, with separate `new1984_scores` data and `new1984_submit_score` / `new1984_leaderboard` functions. Apply `supabase/setup.sql` in the project's SQL Editor. It is transactional and safe to rerun. MagicCastleEscape tables and functions are unchanged.

Players enter a nickname (1–12 characters) after finishing, clearing, or ending a mission. The board shows the ten highest scores; ties use oldest submission first. Score, difficulty, aircraft, stage and kills are retained. No Google sign-in is required. The browser contains only the publishable key. Direct table access is denied; public functions validate allowed values and lengths. Each result has one UUID, so retrying a request does not duplicate it. These checks do not independently verify gameplay or stop a modified client from fabricating scores.

The three records returned by the old Google Apps Script list endpoint on 2026-10-28 were copied to the database. Migration used deterministic IDs to avoid duplicate imports. No player records are included in this repository. The original spreadsheet is retained. Any spreadsheet rows not returned by the list endpoint are outside this migration.

Check: `node --check script.js` and `node tests/ranking.cjs`.
