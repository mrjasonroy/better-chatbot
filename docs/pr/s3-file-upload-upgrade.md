# feat: add s3 storage backend and richer file upload support

## Summary
- add a first-class S3 storage driver (presigned PUT uploads, direct download helpers, end-to-end tests, and a CLI verification script) with new environment variables and setup docs
- broaden file upload UX: drag-and-drop overlay hook, multi-file threaded uploader refactor, expanded provider-specific MIME allowlists, locale copy updates, and richer file bubbles with truncation + badges
- surface per-model supported MIME metadata so unsupported models gracefully downgrade to source links instead of breaking tool calls
- auto-ingest CSV attachments by generating hidden markdown previews for the model, while keeping chat bubbles clean; added helpers and coverage for ingestion preview formatting
- refreshed docs (`docs/storage/s3-setup.md`, `AGENTS.md`) and added targeted unit tests across storage, ingestion, and file-support utilities

## Screenshots / Recordings
- [ ] Drag-and-drop overlay
- [ ] Updated file bubble (before/after)
- [ ] Model selector showing “Upload File” copy

> Attach final captures before publishing the PR. Highlight the changed area when possible.

## Testing
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm format`
- [ ] `pnpm test:e2e` (not run)
- Optional: manually test presigned uploads with the S3 driver if you have credentials handy.

## Configuration Notes
- `.env.example` now documents `FILE_STORAGE_TYPE`, S3 bucket/region settings, and optional public CDN base URL.
- The S3 driver relies on AWS credentials via env vars or the default credential provider chain.
- CSV ingestion is driven by the existing `/api/storage/ingest` route; ensure the storage backend can serve downloaded files.

## Verification Guide
1. `pnpm dev`
2. Upload files (image + CSV + PDF) via button and via drag-and-drop; confirm badges, truncation, and download button.
3. Switch to a file-unsupported model and verify non-supported attachments become “source URL” cards.
4. For CSV uploads, send the file and confirm the assistant immediately references the preview without prompting.
5. (Optional) With S3 credentials, use the storage admin console or a short script to generate a presigned PUT and verify uploads.

## Documentation & Follow-up
- New storage runbook: `docs/storage/s3-setup.md`
- Added `AGENTS.md` for agent metadata; ensure downstream teams import if needed.
- Future ideas: extend ingestion helper to XLSX once server-side parser lands; capture upload analytics.
