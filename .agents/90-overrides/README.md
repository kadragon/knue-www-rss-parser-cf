---
id: AG-GUIDE-OVERRIDE-001
version: 1.1.0
scope: global
status: active
supersedes: []
depends: []
last-updated: 2025-10-19
owner: team-admin
---

# Overrides Folder Guide

- Store temporary departures from global policy in this folder only when mandated.
- Record rationale, scope, owner, and expiry; use the highest numeric prefix to outrank base policies.
- Archive expired overrides to `.agents/_archive/YYYY/Q/` and update supersession chains.

## File Skeleton
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
[What the override covers]

## Expiration
[When the override ends]
```
