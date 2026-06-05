# scripts/archive

One-off fix scripts moved here from repo root during Phase 0 cleanup.

These scripts were used during early development to patch ESM imports,
registry entries, and circular dependencies. They are preserved for
reference but should NOT be run in production.

## Scripts
- `fix-all-dirname.cjs` — Patched __dirname issues in ESM modules
- `fix-batch.cjs` — Batch processing fixes
- `fix-circle.cjs` — Circular dependency resolution
- `fix-esm-all.cjs` — ESM conversion batch fixes
- `fix-final.cjs` — Final cleanup pass script
- `fix-payout.cjs` — Payout calculation patches
- `fix-registry.cjs` — Registry format fixes (v1)
- `fix-registry2.cjs` — Registry format fixes (v2)
- `fix-runtime.cjs` — Runtime patching
- `fix-usermap.cjs` — User mapping patches

## Status
Archived. Do not add new scripts here — use the proper module instead.
