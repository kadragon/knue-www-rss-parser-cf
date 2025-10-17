# Overrides

This folder contains **exceptions and temporary patches** to global policies.

## Usage

- Use only when a temporary deviation from global policy is required
- Document the reason and expiration date
- Use higher numeric prefix to override earlier policies
- Archive to `_archive/` when no longer needed

## Format

```md
---
id: AG-OVERRIDE-<NAME>-001
version: 1.0.0
scope: global | folder:<path>
status: active | deprecated
supersedes: [AG-POLICY-<NAME>-001]
depends: []
last-updated: YYYY-MM-DD
owner: <team>
expires: YYYY-MM-DD
---

# Override: [Name]

## Reason
[Why this override is needed]

## Scope
[What it affects]

## Expiration
[When it should be removed]
```
