---
id: AG-POLICY-BRANCH-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001]
last-updated: 2025-10-17
owner: team-admin
---

# Branch Policy — 🚫 No Work on Main

## Rule

**Never commit or push directly to `main`.**

## Branch Naming Convention

Use feature branches with the following prefixes:

- `feat/<task>` — New features
- `fix/<issue>` — Bug fixes
- `docs/<topic>` — Documentation updates
- `refactor/<scope>` — Code restructuring
- `chore/<task>` — Maintenance tasks
- `test/<scope>` — Test additions/modifications

## Workflow

1. Create branch from `main`
2. Work on feature branch
3. Commit only on Green (all tests pass)
4. Create PR when ready
5. Merge only after review & CI passes

## Enforcement

All commits must be from feature branches.  
Direct pushes to `main` are prohibited.
