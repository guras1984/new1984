# New1984 / SKY RAIDERS ’84

GitHub Pages serves the root directory without a build step.

## Ranking

Ranking uses the existing Supabase project, with separate `new1984_scores` data and `new1984_submit_score` / `new1984_leaderboard` functions. Apply `supabase/setup.sql` in the project's SQL Editor. It is transactional and safe to rerun. MagicCastleEscape tables and functions are unchanged.

Players enter a nickname (1–12 characters) after finishing, clearing, or ending a mission. The board shows the ten highest scores; ties use oldest submission first. Score, difficulty, aircraft, stage and kills are retained. No Google sign-in is required. The browser contains only the publishable key. Direct table access is denied; public functions validate allowed values and lengths. Each result has one UUID, so retrying a request does not duplicate it. These checks do not independently verify gameplay or stop a modified client from fabricating scores.

The three records returned by the old Google Apps Script list endpoint on 2026-10-28 were copied to the database. Migration used deterministic IDs to avoid duplicate imports. No player records are included in this repository. The original spreadsheet is retained. Any spreadsheet rows not returned by the list endpoint are outside this migration.

Check: `node --check script.js` and `node tests/ranking.cjs`.


## 로컬 저장과 꾸미기
게임 중 2초마다, 일시정지 및 화면을 나갈 때 진행 상태를 저장합니다. 처음 화면의 이어하기로 복원하며 안전하게 일시정지 상태로 시작합니다. 새 출격은 저장된 작전을 교체하고, 게임 종료 및 클리어 시 해당 작전 저장을 지웁니다. 같은 브라우저와 사이트 주소에서만 이어할 수 있습니다.

보석은 적 격추 시 24% 확률로 떨어지며 획득 시 1개, 보스 처치 시 5개를 받습니다. 상점의 장식은 능력치 및 점수에 영향을 주지 않습니다. 보석, 구매 내역 및 장착 정보는 진행 저장과 별도로 로컬에 보관됩니다. 난이도와 기체는 작전 중 변경할 수 없습니다. 브라우저 데이터를 지우면 로컬 저장도 사라집니다.
