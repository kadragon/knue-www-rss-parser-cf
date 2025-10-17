---
id: AG-POLICY-COMMIT-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001, AG-POLICY-BRANCH-001]
last-updated: 2025-10-17
owner: team-admin
---

# Commit Policy

## Principles

- Commit only from feature branches
- Commit only on Green (all tests pass)
- One commit = one logical unit
- Exclude secrets and build artifacts

## Message Format

```
[Structural] | [Behavioral] (<scope>) <summary> [<task-slug>]
```

### Examples

```
[Structural] (auth) Extract login validation to separate function [feat-auth-refactor]
[Behavioral] (rss) Add HTML entity decoding to RSS parser [feat-rss-entities]
[Structural] (tests) Move integration tests to separate folder [chore-test-org]
```

## Scope Guidelines

- Use lowercase
- Match module/component name
- Keep concise (auth, rss, storage, etc.)

## Task Slug

- Optional but recommended
- Links commit to task tracking
- Format: `[<type>-<short-name>]`

## Pre-commit Checks

- All tests pass
- No secrets or keys in diff
- No build artifacts committed
- Lint/typecheck passes (if configured)
