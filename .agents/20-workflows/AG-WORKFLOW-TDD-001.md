---
id: AG-WORKFLOW-TDD-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001]
last-updated: 2025-10-17
owner: team-admin
---

# TDD (Test-Driven Development) Policy

## Cycle

1. **Red** — Write failing test
2. **Green** — Write minimal code to pass
3. **Refactor** — Improve structure (only on Green)

## Test Quality Requirements

### Coverage
- Intent (what it should do)
- Boundaries (edge cases)
- Null/error cases
- Representative data

### Determinism
- Mock time/randomness
- No external network calls
- Reproducible results

### SPEC Integration
- Examples from `.spec/` promote to tests automatically
- Tests verify acceptance criteria

## Example Workflow

```
1. Read acceptance criteria from SPEC
2. Write failing test for first criterion
3. Write minimal code to pass
4. Verify Green
5. Refactor if needed (still Green)
6. Commit [Behavioral] or [Structural]
7. Repeat for next criterion
```

## Test Organization

- Unit tests: `test/<module>/<name>.test.ts`
- Integration tests: `test/integration/<workflow>.test.ts`
- Test fixtures: `fixtures/<name>.<ext>`

## Enforcement

- Never refactor on Red
- Always verify Green before commit
- Run full test suite before PR
