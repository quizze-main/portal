---
name: migrations-always-via-tool
description: All database migrations must go through the migration tool (Prisma migrate), never raw SQL files manually
type: feedback
---

Any database schema change must always go through the migration tool (Prisma migrate dev / migrate deploy). Never create raw SQL migration files manually or modify the database schema outside of the migration tool.

**Why:** User explicitly requires all migrations to be managed by the migration tooling to ensure consistency, trackability, and reproducibility.

**How to apply:** When adding/modifying tables or columns, always use `npx prisma migrate dev --name <name>` to generate the migration. Never concatenate SQL files or write migration.sql by hand.
