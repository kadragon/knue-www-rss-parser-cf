---
id: AG-FOUND-TERMS-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: []
last-updated: 2025-10-17
owner: team-admin
---

# Core Terminology

## Definitions

### SDD (Spec-Driven Development)
`.spec/` defines the truth. Implementation & tests must conform.

### TDD (Test-Driven Development)
Write failing test → minimal pass → refactor only on Green.

### Tidy First
Refactor structure before behavior. Commit separately, always on Green.

### RSP-I Workflow
1. **Research** — Summarize flows, hypotheses, evidence
2. **Spec** — Define acceptance criteria
3. **Plan** — Outline steps, tests, rollback, dependencies
4. **Implement** — TDD cycle (Red → Green → Refactor)

### Green State
All tests pass. The only state in which refactoring is allowed.

### Red State
At least one test fails. Only minimal code changes to make tests pass are allowed.

### Structural Commit
Changes that reorganize code without altering behavior (e.g., rename, extract, move).

### Behavioral Commit
Changes that alter functionality or add new features.

### Memory Bank
Persistent context files (`.agents/`, `.tasks/`, `.spec/`) that survive across sessions.

### Subagent
Specialized autonomous agent spawned for specific tasks (code search, analysis, troubleshooting).
