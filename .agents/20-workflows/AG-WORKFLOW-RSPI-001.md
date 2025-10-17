---
id: AG-WORKFLOW-RSPI-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001]
last-updated: 2025-10-17
owner: team-admin
---

# RSP-I Workflow

## Overview

RSP-I is the standard workflow for all development tasks:

1. **Research** — Understand the problem
2. **Spec** — Define acceptance criteria
3. **Plan** — Outline implementation steps
4. **Implement** — Execute using TDD

## Phase 1: Research

**Artifact:** `RESEARCH.md`

- Summarize existing flows
- State hypotheses
- Gather evidence
- Identify constraints & dependencies

## Phase 2: Spec

**Artifact:** `SPEC-DELTA.md` or `.spec/<domain>/<name>.spec.md`

- Define acceptance criteria
- List examples (input → output)
- Specify edge cases
- Document contract changes

## Phase 3: Plan

**Artifact:** `PLAN.md`

- Outline implementation steps
- List tests to write
- Define rollback strategy
- Document dependencies

## Phase 4: Implement

**Artifact:** `PROGRESS.md` (ongoing updates)

- Follow TDD cycle (Red → Green → Refactor)
- Update progress log
- Commit on Green only
- Run lint/typecheck before closure

## Auto-progression

Default: R → S → P → I auto-progress in one turn.

**Hard Gate (ask once)** for:
- Schema/data changes
- Security/privacy/compliance
- External API writes or cost triggers
- Public contract changes
- Major dependency/version shifts
- Large refactors (>200 LOC or >3 modules)
