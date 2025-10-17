# AGENTS Loader — Global

> This is the root loader for all operational policies, workflows, and agent behaviors.  
> All heavy content is modularized into subfolders (`00-`, `10-`, etc.).

---

## Load Order (Global)

1. **00-foundations** — Core principles, terminology, truth hierarchy
2. **10-policies** — Global rules (branching, commits, CLI, memory bank, etc.)
3. **20-workflows** — Operational workflows (RSP-I, SDD, TDD, etc.)
4. **30-roles** — Role-based responsibilities & subagent behaviors
5. **40-templates** — Standard templates for PRs, docs, tasks
6. **90-overrides** — Exceptions & temporary patches

> Within each folder, files load **lexicographically**.  
> Higher numeric prefix ⇒ higher priority.

---

## Conflict Resolution

| Case                       | Rule                                         |
| -------------------------- | -------------------------------------------- |
| **Spec vs Policy**         | `.spec/` always wins                         |
| **Local vs Global AGENTS** | Local wins                                   |
| **Same ID**                | Higher numeric prefix wins                   |
| **Deprecated**             | Ignored by default                           |
| **Explicit Index**         | `AGENTS.index.yaml` overrides implicit rules |

---

## Archive Rule

Deprecated files move to `.agents/_archive/YYYY/Q/`.  
Their `status` becomes `deprecated`, and supersession chains must be updated.

---

## Language Policy

- **All `.agents/`, `.tasks/`, `.spec/` content:** English
- **All commits, PR titles/descriptions:** English
- **All user-facing reports and responses:** Korean
- Internal reasoning stays hidden; only **summarized conclusions** are returned.

---

## Version

- **Created:** 2025-10-17
- **Last Updated:** 2025-10-17
- **Owner:** team-admin
