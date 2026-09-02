# LOCAL AUDIT SNAPSHOT

## Metadata
* Created at: 2026-09-02 16:54:24
* Original Branch: main
* Original HEAD: 3d9b84f240519bf4f663d18023200afe9f5997a3
* This snapshot represents the exact local working tree on the machine at the time of creation, preserving all uncommitted modifications.

## Included Files
- All tracked files that were modified.
- Relevant untracked files in the working directory (excluding .env, caches, build artifacts not explicitly needed).
- The docs/audit directory containing environment metadata and raw git statuses.

## Ignored Files
- Files like ndroid/local.properties, compiled APKs, and generated JS bundles (index.android.bundle) are strictly ignored by Git. 
- Their metadata, sizes, and SHA256 hashes are cataloged in sha256-manifest.txt for audit purposes.
- Specifically, ndroid/app/src/main/assets/index.android.bundle is critical for P15-C.2 provenance and its hash is preserved in the manifest.

## Notes
- This branch does not alter the original working tree. 
- The commit on this branch encapsulates the dirty state of the local machine.
