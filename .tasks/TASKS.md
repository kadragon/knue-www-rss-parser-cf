# Task Index — KNUE RSS Parser

_Last updated: 2025-10-19 (UTC+09:00)_

## Active Focus
| ID | Status | Area | Summary | Links |
| --- | --- | --- | --- | --- |
| TASK-010 | In Progress | Knowledge base | Refresh `.agents/`, `.tasks/`, `.spec/` for current html-to-text + preview workflow | `.tasks/knue-rss-parser/` |

## Ready Backlog
- **TASK-002 — ESLint 9 migration**: Adopt flat config, upgrade typescript-eslint v8, update lint scripts. Blocked until dedicated migration window.
- **TASK-011 — Observability metrics**: Add Analytics Engine metrics & failure alerts once preview service log format stabilises.

## Completed Snapshot (Oct 2025)
| ID | Summary | Completed |
| --- | --- | --- |
| TASK-001 | Cron schedule documentation aligned with Cloudflare trigger (`0 16 * * *`). | 2025-10-17 |
| TASK-003 | Canonical RSS specification captured under `.spec/rss-parser/rss-parser.spec.md`. | 2025-10-17 |
| TASK-004 | Coverage thresholds enforced (statements 90%, branches 75%, functions 90%, lines 90%). | 2025-10-17 |
| TASK-006 | `.env.example` + README local development setup guidance. | 2025-10-17 |
| TASK-007 | Resilient fetch with retries, timeout guard, structured logging. | 2025-10-17 |
| TASK-008 | CONTRIBUTING and security hardening (Husky audit hooks). | 2025-10-17 |
| TASK-009 | Scheduler refactor with modular board batch + attachment enrichment pipeline. | 2025-10-17 |

> Task identifiers follow the 2025-10-17 backlog to preserve historical mapping; no renumbering has occurred.

## References
- Spec: `.spec/rss-parser/rss-parser.spec.md`
- Task artifacts: `.tasks/knue-rss-parser/`
- Policies & workflows: `.agents/`
