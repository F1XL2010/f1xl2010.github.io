# Operating and changing the system safely

## Start a task

1. Establish the requested outcome and current authorization; choose/recommend an appropriate model before substantive work.
2. Read current handover and relevant domain rules. Inspect git branch/status and preserve owner changes.
3. Identify actual live sources/deployment and their last change; this pack is a dated checkpoint.
4. Separate UI, source-data, permissions and propagation issues. Reproduce read-only before writing.
5. Make the scoped fix, run meaningful relevant checks, verify saved/published state and update the handover.

The repository contains many untracked tools/outputs and an admin-app folder with potentially stale versions. Those are not all part of the current release. Never git add everything, bulk-upload admin-app, run old reset/import helpers, or treat /next/ as isolated testing.

## Website releases

Use local HTTP preview where appropriate. Check affected desktop and actual narrow viewport dimensions, parser behavior and script syntax. Review exact diff and preserve URLs, sitemap/canonicals, public access and callback.

Only commit/push within current user authorization. Stage exact paths; preserve unrelated dirty robots.txt/docs/working files. GitHub authentication has often prevented CLI pushes. If that happens, prepare one reviewed commit and tell the owner simply “Push origin” for that existing commit; left-side tickboxes are unrelated to pushing already-committed work. Don't ask them to create a second commit or tick everything.

After push, verify remote commit, Pages build, actual published content/data and service-worker update. The cache workflow may create a subsequent sw.js commit; fetch/fast-forward safely only when no conflicts. No force push, hard reset or unsolicited pruning. Publication of root files affects the real website.

## Portal releases

Read current project HEAD, active deployment and published source. Create a recoverable baseline and rebase a small change onto that fresh source, keeping every untouched remote file. Inspect manifest/scopes, protected gateways and names. Retain property keys and existing deployment URL.

Test affected functions with realistic isolated fixtures, including authorization/stale revisions, rollback/retry and manual edits. Deploy a new immutable version to the existing deployment only when authorized. Verify published source/HEAD/version and a safe real read; a successful upload is not a successful deployed release.

Apps Script version capacity has been encountered. Owner previously approved deleting a specific unused version and further unused old versions if space was needed. That is not permission to remove a deployed/recovery-required version. List all deployments and exact references before proposing/deleting obsolete versions; preserve rollback. Don't conflate version count with trigger quotas.

The dated v409 source in this pack is reference only. Before any new deployment prefer a fresh capture. Internal TEST_* properties, function names and schema markers remain operational despite FAP file prefixes.

## Performance constraints and lessons

Use bounded/batched reads, changed-span writes, request-local reuse, focused post-save replies and deliberate cache invalidation. Keep foreground interaction prioritized; coalesce/quiet background polling. Retain modal state, draft selections and unsaved entry.

Preserve fresh authorization, revision/identity checks, destination validation, history pinning, locks around actual writes, durable receipts and readback/rollback. Avoid full-sheet rewrites for tiny edits and avoid reloading all TT/application context after a driver move.

Existing work added load/save/lock-phase timings and reduced logical calls. A count reduction is not a measured latency improvement. Measure browser-visible elapsed time, cold/warm conditions and actual service phases on comparable operations; don't turn one same-execution copy benchmark into a general speed claim.

An isolated formula cleanup replacing unused imports/bounding lookups did not show consistent improvement; operational formulas were left unchanged and the temporary copy trashed. Do not silently apply that abandoned experiment.

## Sheets and manual interoperability

Read exact headers, formulas, validation and ID columns before writing. Formats are not cosmetic if Sheets interprets qualifying times as dates/durations or plus-gaps as formulas. Preserve blanks/zero/DNF/DNS/DSQ distinctions. Tyre selection alone should not imply a result.

Before a schema change trace all readers: Portal, public parsers, bots, templates, exports, IMPORTRANGE views, history and manual fallback. Back up exact affected ranges; never clear/rebuild historical calculated regions containing manual facts.

Use current spreadsheet tools/authorized owner access; a public CSV is a reader, not an editing API. Connector login does not guarantee the right account/scopes; test current identity/capability. Never log raw Script Properties, OAuth codes or credentials to diagnose this.

## Cleanup

Delete only explicitly scoped disposable test artifacts after verification, retaining backups/history. The owner has requested cleanup of genuine unused test sheets in particular tasks; that doesn't authorize deleting every TEST-named book. Current FAP books and old source originals are operational/evidence. Native Drive Trash is preferable to irreversible deletion when authorised.

## Documentation maintenance

Update current state/decisions/backlog after material work, preserving old evidence. Label changed assumptions and supersessions. Run the pack's local builder/validator. No recurring automation is assumed active merely because the old August README mentioned a weekly review.
