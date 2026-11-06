# Combined intake — ACTIVE since 3 November 2026

Activated with explicit owner approval on 3 November 2026 at 11:33 UTC. This was an intake-only switch; the public website was not switched. Preserve this configuration during the later website handover.

## Current state

The Portal now uses the real combined workbook, with F1XL_INTAKE_CONNECTION_PROFILE=combined and F1XL_COMBINED_TICKET_FORM_SHEET_ID=546580155. The improved Form is connected to Form Responses 6 (thirteen columns) in that workbook; its prior TEST response tab is retained but no longer its destination. Existing live public Forms were not changed. Ten pending applications, four processed originals, zero tickets/staff and two self-TTs were verified. See outputs/intake-activation-2026-11-03/verification.json. `IntakeConnections.gs` defines the now-active combined profile. Every intake reader uses the corresponding resolved configuration, including counters, legacy viewers, archive/retry operations and reviewed TT imports. Public Ticket Outcomes still reads the existing Ticket Write Up Website Export; it is not a Form-response feed.

## Prepared sources

All combined sources are in `1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ` (Tickets & Apps):

| Area | Inbox tab / ID | Archive |
| --- | --- | --- |
| Driver applications | F1Apps / 278899100 | F1AppsArchive / 2137215564 |
| Tickets, defence and appeals | F1 Tickets / 2140272460 | TicketsArchive / 154195707 |
| Improved Portal ticket form (same tickets/defence/appeals reader) | Form Responses 6 / 546580155 | TicketsArchive / 154195707 |
| Staff and Team Principal applications | Staff Apps / 1200436264 | Original responses retained; staff review receipts remain a separate table |
| Self-submitted time trials | TTSubmission / 602943702 | TTSubmissionArchive, created on the first approved archive operation; numbered TT-only archives preserve later track/question schemas |

F2Apps and F2AppsArchive are recognised and preserved; no F2 module was added. No generic “pick any Archive tab” routing is used for combined driver or ticket inboxes. The verified blank F1AppsArchive Timestamp heading is repaired only by an authorised archive operation, after checking the other headings; no response row is overwritten.

## What the compatibility code handles

- Driver fields use question headings, so platform/controller, stream consent, aliases and gamertag do not shift when switching to the combined layout. Unknown/missing identity questions stop processing.
- Already processed driver applications retain their old keys in the Master/tracker/TT queue. The combined reader recognises the same original response using received time, submitted name and Discord ID. Changed answers, missing Discord identity or multiple saved matches require review instead of creating another profile. Name-only matching is not used.
- TP applications resolve their previously saved key when the exact old response identity matches, preserving votes/decisions. Source answer changes still need review. Combined staff branching positions preserve Ticket Team experience and all five TP team preferences.
- Legacy twelve-column tickets keep their original revisions. The improved thirteen-column Form maps the required incident session separately and keeps all four evidence links. Both sources can coexist in the combined workbook, using the explicitly configured response tab IDs. Unknown source IDs are rejected.
- Time-trial archives are scoped to their own named family; unrelated driver, ticket and F2 archives are not displayed as TT archives or selected for TT writes.

## Activation sequence (completed 3 November; do not replay at website handover)

1. Finish outstanding saves and take current backups of the combined workbook, the current TEST inboxes, affected Masters and Portal deployment. Re-read the actual form response headings before changing anything.
2. Review any already processed TEST applications that are still present in the real inbox. Confirm original-response identity; do not bulk accept them again. Check ambiguous/missing Discord details before activation. No ledger key migration is necessary for confirmed matches.
3. If `Staff Application Reviews` has been created in the old staff source since preparation, copy and verify its three-column identity/revision/date receipts into the combined workbook, preserving existing combined receipts. It did not exist in either source at this preparation read. Do not overwrite Form responses or TP selection tables. This final-data copy belongs to cutover, not to changing source IDs.
4. Connect the agreed improved ticket Form (`19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo`) to the combined workbook. Completed at the authorised intake switch: response gid 546580155 in the real combined workbook. Do not reconnect it again. Retain old response tabs/history. Read back the newly created response tab's ID and required thirteen headings. Do not assume it retains TEST's tab ID 483613087.
5. Set the private Script Property `F1XL_COMBINED_TICKET_FORM_SHEET_ID` to that verified new ID. Do not point it at the twelve-column legacy F1 Tickets tab.
6. Set `F1XL_INTAKE_CONNECTION_PROFILE` to `combined` and reload the Portal. This activates the four prepared routes together. The default/absent value, or explicit `test`, retains the old connections. No public UI can change these properties.
7. Use Update form driver list for the correct operational season. The worker verifies that the configured Form really responds to the selected workbook; no background function calls setDestination. In combined mode its title loses the TEST prefix. Confirm both driver lists and the saved sync status. Confirm the operational Form is published and accepting responses for its intended audience, and replace the TEST-only explanatory description before public use. A newly copied Form can be closed even when its destination is correct.
8. Check inbox names/counts and one suitable real pending workflow per area, with explicit attention to archive destinations. Verify accepted application → original permanent identity/tracker/TT queue, reviewed TT import, staff review, and ticket/defence/appeal receipt. Keep original evidence and stop if a source is unavailable; no repeated processing to clear a warning.
9. Confirm public application/staff/self-TT forms still deliver to their existing named combined tabs, and that the Portal ticket submission link uses the agreed improved Form. Do not redirect the public website or final outcomes feed as a side effect of the intake switch.

## Current recovery record

Six private recovery copies and the four-cell legacy mapping correction are recorded in outputs/intake-activation-2026-11-03/. Twenty-five source ranges were verified unchanged after that correction. No submissions were processed during activation. The published Portal remains v399; its temporary unpublished helper was removed. Do not run real workflow mutations merely to repeat the earlier isolated QA proof.

## Rollback

Restore `F1XL_INTAKE_CONNECTION_PROFILE=test` (or remove it), reload, and restore the agreed ticket Form destination separately only after reconciling any submissions received or processed since activation. Reconnecting can generate a different response tab: read the actual ID; do not assume 483613087 is reused. No source rows are moved between workbooks by the profile switch. Reconcile any operations completed after activation using their receipts; never replay them blindly. Previous TEST deployment v397 is retained for code rollback.

## Evidence and limits

Native Google rehearsal completed 3 November 2026: all seven preparation/workflow/rollback phases passed using eight private Sheet copies and one private Form copy. Production services ran in a copy-allowlisted lexical sandbox, with isolated connection properties/cache/owner context. Google persisted the old/new application records, archived matching copied applications without duplication, staff review, TP acceptance/preferences, completed TT/31-second average and the native Form's ticket/defence/appeal submissions. All three reached the copied inbox and were attached/archived correctly; repeat import added nothing and twelve existing copied cases were unchanged. All four old copied sources reloaded on rollback; F2 tabs were unchanged. The copied Form initially rejected submissions while closed; it was restricted to the existing F1XL owner, enabled and retried successfully. This was QA setup, not an operational connection defect.

Cleanup is complete: eight workbooks and the copied Form permanently deleted, all nine return NOT_FOUND, temporary helper removed, and all 120 HEAD files restored exactly to pre-rehearsal v398. Published deployment, operational properties, original destinations and sources remained unchanged. Nine original files still exist. Local evidence: outputs/combined-intake-native-2026-11-03/verification.json, intake-readback.json, master-readback.json, deleted.json, restored.json and audit.html. No real LIVE submission/cutover, staff/phone authentication test, results update or new penalty application is claimed. Public publication and complete UI response rebuilding were excluded from the sandbox.

`outputs/combined-intake-ready-2026-11-03/` holds the deployed project backup, selective release record, ten focused combined-profile fixture checks and service regression results. Tests execute production service code in local disposable adapters, not new Google submissions. They cover new/copy application processing, archive retries, counters, TP preferences/keys, TT import, both ticket layouts and complete ticket/defence/appeal imports. No actual LIVE submission or cutover has been performed. The old standalone FAP access suite contains a superseded Time Trial Team permission expectation; the current eight-case role suite and reviewer isolation checks pass. The old cleanup suite's stubbed staff-counter segment is superseded by the current thirteen-case background-counter suite; TT import checks ran. Fixtures now use real headers/tab IDs and explicitly load the new shared module.
