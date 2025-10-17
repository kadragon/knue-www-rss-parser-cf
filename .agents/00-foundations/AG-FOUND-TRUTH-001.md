---
id: AG-FOUND-TRUTH-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: []
last-updated: 2025-10-17
owner: team-admin
---

# Truth Precedence & Hierarchy

## Principle

When conflicts arise, resolve them using this strict hierarchy:

1. **Contracts / Acceptance Criteria** (`.spec/`) — Single source of truth
2. **Policies / Runbooks** (`.agents/`)
3. **Task context / decisions** (`.tasks/`)

## Rules

- `.spec/` overrides all other sources
- Within `.agents/`, **nearest folder-level AGENTS.md** governs locally
- Global `.agents/AGENTS.md` serves as fallback
- Deprecated content (status: `deprecated`) is ignored by default

## Resolution Examples

| Scenario                         | Winner                    |
| -------------------------------- | ------------------------- |
| Spec says X, Policy says Y       | Spec (X)                  |
| Global policy says X, local says Y | Local policy (Y)         |
| Two policies, same ID            | Higher numeric prefix     |
| Active vs deprecated policy      | Active                    |

## Enforcement

All agents MUST check `.spec/` first before executing any behavioral change.
