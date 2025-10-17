---
id: AG-POLICY-MEMORY-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001]
last-updated: 2025-10-17
owner: team-admin
---

# Memory Bank Optimization

## Principles

Memory banks (`.agents/`, `.tasks/`, `.spec/`) must remain:
- **De-duplicated** — No redundant content
- **Consolidated** — Related content merged
- **Archived** — Completed work moved out
- **Optimized** — Concise, actionable, versioned

## Operations

### 1. De-duplicate
- Contracts → `.spec/` only
- Policies → `.agents/` only
- No duplication across memory banks

### 2. Remove
- Delete obsolete artifacts
- Remove deprecated content (move to `_archive/`)

### 3. Consolidate
- Merge related documents
- Unify scattered decisions

### 4. Archive
- Move completed docs to `_archive/YYYY/Q/`
- Update index files

### 5. Optimize
- Keep content concise
- Maintain actionable format
- Version all documents

## Retention Defaults

```
KEEP_LEVEL=summary
LIVE_WINDOW_DAYS=30
```

## On Task Completion

1. Merge insights into nearest `AGENTS.md`
2. Summarize to `TASK_SUMMARY.md`
3. Archive under `.tasks/_archive/YYYY/Q/<task>/`
4. Update `.tasks/TASKS_ARCHIVE_INDEX.md`
