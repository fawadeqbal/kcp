# Load test: 1,000 students at once

The Phase 1 goal was that **1,000 students can use the platform at the same time**. The tool in `tools/load-test` checks it: every simulated student logs in from its own IP address, opens the lesson map and a lesson, then keeps submitting real challenge solutions from Module 1, reading leaderboards (every level and period) and checking its progress, with a pause to think in between. Rate limits stay on, as in production.

## Results (30 September 2026)

Both runs: 1,000 students arriving over 60 seconds, one API process, on a 2-vCPU, 8 GB machine that also ran PostgreSQL, Redis and the load generator itself. Raw numbers are in [`load-test-results/`](load-test-results/).

**Realistic use** (15–45 seconds between actions, as when children read and type; 4 min 43 s in all): **9,491 requests, no errors.**

| Request          | Count | Per second | p50 ms | p95 ms | p99 ms |
| ---------------- | ----: | ---------: | -----: | -----: | -----: |
| Login            | 1,000 |        3.5 |     26 |     49 |    117 |
| Lesson map       | 1,615 |        5.7 |      9 |     20 |     38 |
| Lesson           | 1,000 |        3.5 |      7 |     16 |     41 |
| Submit challenge | 2,693 |        9.5 |     33 |     69 |    113 |
| Leaderboard      | 2,223 |        7.9 |     10 |     22 |     35 |
| Progress         |   960 |        3.4 |     21 |     41 |     60 |

**Stress** (3–8 seconds between actions, much faster than children really work; 3 min 8 s): **17,163 requests (91 a second), no errors**, but slow: p95 between 3.9 s (leaderboards) and 11.7 s (submitting a challenge). The one API process was saturated (about 80% CPU, with the database on the same two cores).

| Request          | Count | Per second | p50 ms | p95 ms | p99 ms |
| ---------------- | ----: | ---------: | -----: | -----: | -----: |
| Login            | 1,000 |        5.3 |    756 |  5,456 |  7,157 |
| Lesson map       | 2,381 |       12.7 |  2,936 |  5,785 |  6,355 |
| Lesson           | 1,000 |        5.3 |    969 |  4,678 |  5,717 |
| Submit challenge | 5,693 |       30.3 |  7,982 | 11,744 | 13,277 |
| Leaderboard      | 4,972 |       26.5 |  1,970 |  3,901 |  4,704 |
| Progress         | 2,117 |       11.3 |  4,326 |  6,187 |  6,845 |

## What it means

- **1,000 students working normally fit comfortably in one API instance**, with every answer under 120 ms for 99% of requests.
- **One instance handles about 35 requests a second comfortably** and saturates somewhere below 90. A whole class pressing "Check" in the same few seconds (an exam or a live session) needs more headroom.
- **For the pilot and launch, run at least 2 API instances** (also for rolling deploys without downtime), each with 1 vCPU or more, and a database with its own CPU. The API is stateless (sessions and boards live in PostgreSQL and Redis; the nightly job takes a Redis lock), so adding instances needs no code change.
- Where the time goes under stress (CPU profile): sending responses 22%, Prisma 19%, the server-side HTML checks 3%. Working out each student's local day took 1.2% and is now cached. Nothing stands out enough to optimise before real hosting numbers exist.

## Running it

Only against a local or staging API, never production: it creates accounts and fills the boards. The tool refuses any non-local address unless `LOAD_TEST_TARGET` is set to the host name of the server that command talks to: the staging database's host for `seed` and `cleanup`, the staging API's host (for example `api.staging.yourdomain.com`) for `start`. A challenge submission only counts as a success if the solution passes (the server re-checks it); otherwise it's reported as a "wrong answer" error.

```bash
pnpm services:up && pnpm build && pnpm content:import   # a local stack with Module 1
pnpm --filter @kcp/load-test seed --students=1000       # load-000001 … load-001000
node apps/api/dist/main.js                              # in another terminal (rate limits on)

# Realistic, then stress:
pnpm --filter @kcp/load-test start --students=1000 --ramp=60 --duration=240 --think-min=15000 --think-max=45000 --out=../../docs/load-test-results/<date>-realistic-1000.json
pnpm --filter @kcp/load-test start --students=1000 --ramp=60 --duration=180 --out=../../docs/load-test-results/<date>-stress-1000.json

pnpm --filter @kcp/load-test cleanup                    # remove the load-test students
```

- `API_URL` (default `http://localhost:3000`) chooses the API; `DATABASE_URL` (from `.env`) the database the students are seeded into.
- Each student sends its own `X-Forwarded-For` address, so the API must trust one proxy hop (`TRUST_PROXY_HOPS=1`, the default). Against staging behind Cloudflare, the per-IP limits apply to the machine running the test instead: run it from several machines, or raise the limits on staging for the test.
- `cleanup` removes the students; their XP history stays (it is append-only), anonymous and off the boards. Weekly boards are cached in Redis and rebuilt from PostgreSQL: `redis-cli --scan --pattern 'lb:*' | xargs -r redis-cli del` clears them straight away.
- Repeat the test on staging once hosting is chosen, and before the pilot, with the real instance sizes.
