---
name: Zod code generation compatibility
description: OpenAPI formats that the installed Zod/Orval combination cannot generate.
---

Avoid OpenAPI features that make Orval emit Zod APIs unavailable in this workspace’s installed Zod version, including URI-formatted strings that generate `zod.url()`.

**Why:** The generated code must typecheck before API changes can be used; unsupported generated APIs block the whole workspace.

**How to apply:** Prefer a plain string schema for URLs and validate any stricter format at the route/application boundary until the Zod dependency is upgraded with compatible code generation.