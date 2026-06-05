# Sovereign Stack — Phase 0 Cleanup Plan

## Binary Archives (CRITICAL — Action Required)

The following ~800MB binary archive files are committed directly to git:

```
WB_Archive_Split.7z.001
WB_Archive_Split.7z.002
WB_Archive_Split.7z.003
...
WB_Archive_Split.7z.016
```

**Problem**: Binary archives do not belong in git — they bloat clone times and exceed
GitHub's recommended 100MB per-file limit.

**Required Action** (perform locally, not via MCP):
```bash
# 1. Install git-filter-repo
pip install git-filter-repo

# 2. Remove archives from all history
git filter-repo --path WB_Archive_Split.7z.001 --invert-paths
# Repeat for all 16 parts (or use glob)

# 3. Store archives in external artifact store (S3, R2, GitHub Releases, or Akash)
# 4. Update references in code to point to external URL
# 5. Force push (coordinate with all collaborators first)
```

**Interim**: Archives are added to `.gitignore` on this branch so they won't be re-committed.

---

## fix-*.cjs Scripts (Prune)

15+ one-off fix scripts are at the repo root. These should be moved to `scripts/archive/`:

```
fix-all-dirname.cjs
fix-batch.cjs
fix-circle.cjs
fix-esm-all.cjs
fix-final.cjs
fix-payout.cjs
fix-registry.cjs
fix-registry2.cjs
fix-runtime.cjs
fix-usermap.cjs
fix-dirname.cjs   (if present)
fix-imports.cjs   (if present)
```

**Action**: Move to `scripts/archive/` — do not delete (they may contain useful patterns).
These are logged here for reference. Migration performed on branch `claude/deepflex-argus-synthesis-jWjmO`.

---

## Git LFS (Recommended)

For any future binary assets, use Git LFS:
```bash
git lfs install
git lfs track "*.7z"
git lfs track "*.7z.*"
echo "*.7z lfs=1 diff=lfs merge=lfs -text" >> .gitattributes
```
