---
name: sara-monorepo
description: Use when changing Project SARA monorepo boundaries, local setup, environment configuration, or shared contracts.
---

# SARA monorepo skill

## Principles

- Keep `apps/web` and `apps/api` independently installable and runnable.
- Put only versioned, consumer-facing schemas in `packages/contracts`; avoid importing application implementation across app boundaries.
- Keep configuration in environment variables with safe local defaults. Never commit credentials; `.env.example` must use placeholders or non-secret local values.
- Keep commands and requirements documented in the root README and update `.agents/AI_HANDOFF.md` when architecture or workflows change.
- Prefer additive, issue-scoped changes; do not add deployment, auth, or native platform work unless requested by an issue.

## Change checklist

1. Read the issue and inspect affected app files.
2. State which app owns the behavior and whether a shared contract is necessary.
3. Update the app-local implementation and root setup docs together.
4. Validate using the commands relevant to the change; report commands and outcomes accurately.

## Skill provenance

This skill is maintained in the repository for portability and is not copied from an external source. If a future task needs a specialist Codex skill, check the session's available skill catalog first; preserve the upstream source and license when importing external skill content.
