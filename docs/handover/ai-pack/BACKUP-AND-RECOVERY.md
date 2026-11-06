# Backups, recovery and succession

A repository is not a backup of live Google data or account access. This pack is a knowledge/source reference, not a full system restore image.

## Verified launch recovery

Eleven private owner-only native Google copies were created on 6 November for Master, D1–D4, tickets, Config, permanent Registry, People, real intake and Reference Data. Their IDs/links are in [release.json](../reference/launch-2026-11-06/release.json). A comparison of 169,852 captured input/formula cells passed in [backup-content-verification.json](../reference/launch-2026-11-06/backup-content-verification.json).

Original source books and website are retained. These are deliberate recovery assets, not disposable QA sheets. Native workbook formulas can still recalculate against external dependencies, so dated captured inputs/formulas matter alongside a Drive copy.

Original local recovery package:
- outputs/cutover-package-2026-11-06/recovery/published/ — old published website.
- recovery/repository/ and recovery/owner-working-copy/ — distinct pre-switch captures.
- recovery/portal/published-project.json — v408.
- recovery/portal/name-compatible-recovery-project.json — pre-switch UI with TEST/FAP name compatibility.
- outputs/cutover-execution-2026-11-06/ — actual execution, source captures and verification.
These large raw/private captures are not all included in this transfer pack. Locate them on the owner's machine/backups if needed; the packaged selected evidence and v409 source do not replace them.

## Fault-first recovery

1. Pause only the affected work if necessary; preserve new submissions and unfinished saves.
2. Determine whether the fault is public UI/cache, a feed/permission, Portal code, source input/formula, identity mapping or a failed transfer.
3. Compare the relevant current state to the dated evidence. Never restore everything because one parser or page is wrong.
4. Prefer a targeted code/UI fix that continues reading current operational books. Restoring old-site sources after new writes can show stale data.
5. If restoring data is necessary, verify exact workbook/tab/range, newer records and backups; get current authorization for the concrete restore.
6. Verify state after recovery and document what changed, including any still-pending work.

**Do not deploy raw v408 against FAP-renamed workbooks.** Use a verified name-compatible recovery baseline if rolling UI back, retaining current Properties/intake/roles. Never restore old Script Properties wholesale over new receipts, accounts, job state or new source connections.

Do not reconnect a Form as a casual rollback. It may create a new response-tab ID. Preserve all raw responses, archive links and processing receipts and reconcile actual tab IDs before any switch.

## What a successor needs protected elsewhere

- Repository/history and current source, not only a preview.
- Apps Script project/deployment access and securely backed up/recoverable settings.
- Master/division/ticket/config/registry/people/reference books and required originals.
- Form definitions, ownership and actual response destinations.
- Rules Doc, reference Slides, historical sources and any external media assets.
- Domain/DNS, GitHub Pages/Actions access and service-worker release behavior.
- Discord application/server/channel access and current bot/GitHub credentials in secure storage.
- One authorised human who can recover each owning account.

Never place tokens, passwords, OAuth codes, recovery codes, raw People rows or private intake exports in the public repository or handover. Workbook IDs are not credentials, but private files still require correct account access.

## Testing recovery

Check files open, exact source IDs/tabs exist, saved values/formulas match intended cutoff and newer work survives. A backup folder name or successful copy call is not sufficient. Record tested scope and limitations. Preserve old checkpoints until a newer backup is verified; don't overwrite the only recovery copy.
