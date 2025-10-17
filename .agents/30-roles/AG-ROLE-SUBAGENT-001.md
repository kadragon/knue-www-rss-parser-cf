---
id: AG-ROLE-SUBAGENT-001
version: 1.0.0
scope: global
status: active
supersedes: []
depends: [AG-FOUND-TERMS-001]
last-updated: 2025-10-17
owner: team-admin
---

# Subagent Policy

## Purpose

Use subagents for:
- Code search & analysis
- Troubleshooting
- Independent research tasks

## Invocation Rules

- Each subagent runs with **full task context** (goal, spec, scope)
- Parallelize independent work when possible
- Evaluate results → reflect → decide
- Verify all results with tests or smoke checks before closure

## Context Passing

When spawning a subagent, always include:
1. Current task goal
2. Relevant spec excerpt
3. Scope/constraints
4. Expected output format

## Result Validation

- Never blindly trust subagent output
- Always verify with tests or manual checks
- Document deviations in `PROGRESS.md`

## Example Usage

```
Task: Find all uses of `parseRSS` function
Subagent: code-search
Context: Looking for parseRSS calls to refactor interface
Expected: List of file paths and line numbers
```
