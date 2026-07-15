# Changelog Table

| Version | Week | Commit Message                  |
| ------- | ---- | ------------------------------- |
| `0.1.0` | 1    | feat: add per-brew location with inline edit, suggestions, and sync-safe updates |
| `0.0.1` | 1    | chore: initialize TRIP workflow |

---

# Changelog Summary

- **v0.1.0 (Location per Brew - Week 1, 15-07-2026)**:
  - **Feature**: Optional free-text location on entries — Add-form input with recent-location suggestion chips, feed-card label, DetailPage display with inline edit
  - **Sync**: New `update` outbox op (whitelisted partial row update, no Storage access); `pullRemote` overlays pending update patches and `runSync` queues follow-up passes so mid-sync edits are never reverted
  - **Migration**: `alter table public.entries add column location text;` (applied column-first, backward compatible)
  - **Structure**: `LocationField` component reserved as the seam for a future Google Maps/OSM picker (`locationMeta` documented, not implemented)

- **v0.0.1 (TRIP Initialization - Week 1, 14-07-2026)**:
  - **Setup**: Initialized TRIP workflow with docs structure and customized skills
  - **Documentation**: Generated ARCHI.md documenting the offline-first React PWA architecture (IndexedDB outbox → Supabase sync)
  - **Files Added**: docs/ARCHI.md, docs/ARCHI-rules.md, docs/2-changelog/changelog_table.md, docs/4-unit-tests/TESTING.md
