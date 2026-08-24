---
name: Realtime game rooms
description: Why Penalty Grid’s first release keeps authoritative rooms in server memory.
---

Penalty Grid’s first release uses server-memory rooms and WebSockets rather than a database-backed match store.

**Why:** The private-room experience needs a fast, authoritative real-time loop first; server state prevents clients from seeing hidden keeper choices or scoring themselves without introducing persistence latency and schema complexity.

**How to apply:** Keep the server authoritative for all selections, answer validation, timers, reveals, and scores. Browser refreshes may reconnect with a stored room session while the server remains up; add durable storage only when cross-restart recovery or long-term statistics becomes a product requirement.