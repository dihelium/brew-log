# Changelog Table

| Version | Week | Commit Message                  |
| ------- | ---- | ------------------------------- |
| `0.2.0` | 1    | feat: editable brew fields (date/rating/notes/name/type), tea type, and calendar view |
| `0.1.0` | 1    | feat: add per-brew location with inline edit, suggestions, and sync-safe updates |
| `0.0.1` | 1    | chore: initialize TRIP workflow |

---

# Changelog Summary

- **v0.2.0 (Editable Brews + Calendar View - Week 1, 15-07-2026)**:
  - **Editing**: date & time, rating (with Clear), notes, name, and type editable inline on DetailPage; `updateEntry` widened to a whitelisted patch set (`normalizePatch` + symmetric `toPatchRow`/`applyPatch`) with feed re-sort after date edits. No schema/IndexedDB/Supabase migration.
  - **Tea type**: new `tea` brew type via a pure `brewTypes` util driving the picker, cards, and hero; tea accent/badge variables added to all five themes.
  - **Calendar**: non-default `/calendar` month grid with brew-day dots (reached from a Feed 🗓 button); selecting a day shows that day's list and its DailyCup mug (new `calendar` + `datetimeLocal` utils; `DailyCup` gains an optional `historical` caption prop).
  - **Sync**: delete-wins on a remotely-deleted row pinned by a regression test; `update` op still never touches Storage.

- **v0.1.0 (Location per Brew - Week 1, 15-07-2026)**:
  - **Feature**: Optional free-text location on entries — Add-form input with recent-location suggestion chips, feed-card label, DetailPage display with inline edit
  - **Sync**: New `update` outbox op (whitelisted partial row update, no Storage access); `pullRemote` overlays pending update patches and `runSync` queues follow-up passes so mid-sync edits are never reverted
  - **Migration**: `alter table public.entries add column location text;` (applied column-first, backward compatible)
  - **Structure**: `LocationField` component reserved as the seam for a future Google Maps/OSM picker (`locationMeta` documented, not implemented)

- **v0.0.1 (TRIP Initialization - Week 1, 14-07-2026)**:
  - **Setup**: Initialized TRIP workflow with docs structure and customized skills
  - **Documentation**: Generated ARCHI.md documenting the offline-first React PWA architecture (IndexedDB outbox → Supabase sync)
  - **Files Added**: docs/ARCHI.md, docs/ARCHI-rules.md, docs/2-changelog/changelog_table.md, docs/4-unit-tests/TESTING.md
