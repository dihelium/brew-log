# Architecture Documentation Rules

[ARCHI.md](ARCHI.md) documents the my-brew-log architecture. After each task (new feature, refactor, bug fix), determine if ARCHI.md needs updating.

## When to Update

Update after ANY change that alters:

- Project structure (new directories, moved files) — §4 Project Structure
- Technology stack (new dependencies, version changes) — §3 Technology Stack
- The entry data model or `toRow`/`fromRow` mapping — §6 Data Model
- Sync/outbox/cache behavior or IndexedDB schema — §5 Core Architecture Principles, §7 Data Flow
- Configuration, env vars, or theming system — §8 Configuration
- Build, deployment, or PWA/service-worker setup — §12 Deployment

## How to Update by Change Type

### Major Feature / Refactor

Review: Overview (§2), Project Structure (§4), Core Architecture Principles (§5), Data Model (§6), Data Flow (§7), Conclusion (§13)

### Minor Feature / Enhancement

Update: Project Structure (§4) if files were added, plus whichever single section the change touches

### Bug Fix

Usually no update needed, unless it reveals/fixes an architectural flaw (e.g., a sync-ordering bug that changes documented semantics)

### Dependency Changes

Update: Technology Stack (§3), and any affected architectural sections

## Guidelines

- Be precise and factual - reflect the actual codebase
- Be concise - enough detail to understand, not implementation specifics
- Update the mermaid diagram (§7) when data flow changes
- Reference actual file paths
