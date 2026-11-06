# 5 November 2026 — Final data-change launch gate complete

Read-only final comparison passed at 13:03 UTC, S28 through R15. All 1,094 race rows, driver/team calculations, 155 cases/36 appeals and applied licences agree with the saved decisions; anonymous ticket/licence/ban feeds and direct overall/weekly output match. No new unexplained differences or data repairs. Approved assignment and newest zero-result entrant are accounted for. Portal v408 and prepared 37-file package verified; 21 preparation checks pass. Evidence: outputs/final-readiness-2026-11-05/verification.json.

Staff/phone sign-off is also complete. Remaining: agree quiet window, finish saves, verify backups/recovery, selectively switch the website/Portal links and check public/staff entry points; then follow the first genuine week. No production switch occurred. If there are later source edits, check that delta before promotion. Optional Discord/QOL/spreadsheet polish stays deferred.

# 5 November 2026 — Staff and phone launch gate complete

Owner confirms all post-v408 staff/phone checks are fine. Do not repeat the walkthrough or treat historical pending access/mobile checks below as blockers. Current Portal and prepared presentation baseline is v408. Remaining: final data-change comparison since the recorded R15 checkpoint, agreed quiet window with verified backups, selective website/Portal switch and public readback, then the first genuine week. Production website has not switched; no additional imports or Discord activation are authorised by this sign-off.

# 5 November 2026 — Switchover wording/links and ticket entry prepared locally

Prepared the production presentation patch from the fresh published v406 baseline (121 modules). Fifteen modules change only workflow labels/messages and the common website base URL; 106 others remain byte-identical, including access, Forms/intake, restored staff answers, simplified stream client and TP ticket visibility. Internal keys, workbook name guards, configuration IDs and the Google return page stay unchanged. The active Portal remains v406; no code, properties, Forms, Sheets, LIVE website or Discord changes were applied.

The website replacement retains submit-ticket.html as an off-menu compatibility entry to the already-connected improved S28 form. Confirmed open with 100 driver choices, four required incident sessions and combined response tab 546580155. Do not reconnect it or submit test entries. Eight focused workflow checks and thirteen website proposal checks pass; all 37 candidate file hashes match the manifest. Browser opening of the local preview was blocked by URL policy; no workaround attempted, so no new visual/browser sign-off is claimed.

Current release files: outputs/switchover-preparation-2026-11-05/prepared-project.json and proposed-portal/; merged into outputs/launch-handover-2026-11-03/manifest.json and proposed-portal/. The older v399 generator now refuses to overwrite this newer preparation. Before deployment, compare the fresh Portal source signature to the captured v406 baseline and apply alongside the public website cutover. Next: actual staff/phone access checks, final data delta and quiet-window backups/switch. Discord welcome automation remains parked.

# 4 November 2026 — S27 reserve teams confirmed; not a launch blocker

Owner confirms the two S27 archive entries previously described as numeric-zero placeholder teams are reserve teams. Preserve these legitimate entries. Do not delete or filter them solely because of their labels. The recorded S27 display follow-up is removed from launch blockers; The approved TEST display change now labels both entries Reserve, retaining their scores; commit 010ca14 is prepared for publication. The local future-release candidate includes the same label.

# 3 November 2026 — real intake ACTIVE; public website NOT switched

Owner explicitly approved the intake-only switch. Portal v399 now resolves applications, tickets/defences/appeals, staff/TP applications and self-TT to real Tickets & Apps (1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ). Improved Form 19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo now responds there through native Form Responses 6 / gid 546580155; legacy F1 Tickets and all other existing public Forms remain connected as before. Private profile=combined and enhanced response gid are set. Form accepting/published, neutral S28 text and 100-driver roster verified; its previous response count was zero.

Preflight found four legacy mis-mapped saved application snapshots (saxton_26, liamstoner, D4ZED FRAPPE, MxWhItTy11). Exact original identities and ten shifted-column relationships proved the issue. Corrected only Processed Applications!G96:G99, preserving IDs/keys/formats. Portal now shows ten pending applications, four already processed recognised; tickets/staff empty, self-TT two. No submissions accepted/imported/archived/deleted, no new profiles, placements/results/penalties unchanged. After that correction, 25 existing ranges verified unchanged. Six private recovery copies retained deliberately. Temporary owner helper removed; all 120 editor/published files and v399 restored unchanged. No public website/config change, commit/push, role/scope/sharing change or Discord send. Evidence: outputs/intake-activation-2026-11-03/verification.json and REPORT.md.

**Operational boundary:** real incoming submissions are now affected by Portal accept/archive/delete actions even while public results/tables still use the old LIVE site. Do not treat TEST-named Masters/intake as disposable QA. Use isolated copies for mutation tests. Preserve this active connection at the eventual public switch; do not reconnect the Form or guess/reuse its old response gid.

# Admin Portal and website go live roadmap

Originally 23 October 2026; readiness priorities updated 3 November. Current verified TEST Portal: v399. The latest reconciled data evidence covers S28 R1–R15, including the D3 R14 rerun. Older R14-only/v388 checkpoints below or in historical notes are superseded. No LIVE switch, data import, role change or deferred implementation is authorised by this document.

The launch standard is that visitors retain the public information and familiar addresses they need, with any corrections or improvements accounted for. Staff must be able to run the normal week, and the spreadsheets must remain a usable fallback. Optional automation and presentation work must not keep delaying that standard.

## Before launch

### Current remaining launch list — 3 November

1. **Cleared 3 November: retired demo fallback removed.** TEST website commit `e4be23a` is published; all three files match prepared source over public HTTP. Config failures reject the read and show unavailable/Retry rather than a demo season; results stop cleanly and schedule no longer silently uses its old hard-coded source. Fourteen focused failure/recovery checks plus direct-source/historical/calendar regressions pass. TEST Portal v399 removes the maintenance input's demo default and related examples; all 120 files verified, 117 unchanged. Anonymous config reads resolve S28 and historical S27/S9; configured seasons are 1–28 including 7.5, with no 99/999/1000. Drive finds no matching active demo files; both old fallback IDs return NOT_FOUND, which is not proof of deletion. S99 cleanup was already completed in October. Evidence: outputs/retired-demo-cleanup-2026-11-03/. No operational data/source changes.
2. **Technical/assignment checks passed; actual staff/phone walkthrough remains.** The 3 November read-only audit checked eight active/one suspended accounts, no duplicate identities, valid assigned TP teams, and one exact steward-column match across all fifteen rounds. Forty focused/account/policy groups plus reviewer checks pass against deployed v399; every one of 277 registered entries rejects direct external calls in fixtures, and the actual Portal guard check also passes. People register unchanged. Existing Admin+Coordinator powers are intentional. Normal-browser sign-in/TP isolation was previously owner-confirmed, but this audit did not sign in as other people or use touch hardware. See LAUNCH-ACCESS-CHECK-2026-11-03.md for the short admin, TP/TT, steward and phone checks. Uninvited teams and roles not yet delegated are rollout tasks, not fabricated access defects.
3. **Local public website/root/cache rehearsal completed; final release still pending.** Eleven promoted root pages and all eleven narrow-screen layouts were checked, plus weekly points. Thirteen automated groups and 665 static references pass. Actual browser upgrade from the old worker passed after reproducing and fixing delayed obsolete-cache lookup; mobile result/ban containment and remaining TEST labels are corrected in the LOCAL proposal. The owner confirmed the S27 entries are legitimate reserve teams; preserve them. Minimal Portal patch rehearsal, real staff/phone checks and final delta/backups/trigger census/approval remain. No publication or Google writes. See outputs/launch-rehearsal-2026-11-03/verification.json.
4. **Final switch safeguard: latest changes, backups and recovery.** Before an approved quiet window, establish the final cutoff, reconcile only changes since the 2 November R15 evidence, back up the chosen operational sources and specify old writers/triggers to stop. Recovery must preserve new submissions and results. Carry out anonymous public and representative account readbacks after the approved switch.

Existing evidence is not a request to repeat the entire audit: the 2 November results/stat verification passed 1,888 driver metric checks across 1,094 race rows, and the ticket sign-off found no issues across 155 cases/36 appeals. Confirmed assignment repairs and accepted LIVE/TEST differences have their own subsequent records. Intake compatibility passed its native Google copy rehearsal on 3 November, with all nine temporary Google files deleted. These are cleared audit stages at their recorded cutoff, subject to changes since then.

Detailed spreadsheet layout/usability work and a complete first-time manual rehearsal move to L12 after launch, per the owner's decision. Retain direct manual updates and protect formulas/history; do not make additional spreadsheet polish a launch gate.

### 1. Establish the exact release and data checkpoint

- Inventory public pages, Portal areas, forms, workbooks, templates, configuration, scheduled work and dependencies. Mark each as replacing an existing function, new, retained unchanged or deferred.
- Record what is actually deployed on TEST and LIVE, including Portal versions and website files. Separate deployed work from local experiments and uncommitted owner changes; do not publish the entire working directory.
- Choose a common comparison cutoff: season, round and session, including which appeals are final. Refresh evidence for that cutoff rather than comparing data captured on different days.
- The latest recorded catch-up and reconciliation cover R1–R15, including the D3 R14 feature rerun. Use the 2 November results, totals, roster, ticket and subsequent repair evidence. Check for later edits before the switch; do not import additional rounds merely to make a comparison pass.
- Produce a source map showing where each kind of information is entered, stored, calculated and read publicly. Include the application form, agreed combined ticket response source, ticket export, division books, private Master, Website Config public views and permanent registry.
  - Intake source confirmed 3 November: combined Tickets & Apps workbook `1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ` supplies F1Apps, F1 Tickets (tickets/defences/appeals), Staff Apps (including TP applications), and TTSubmission. Use the explicit archive routes and compatibility checklist in outputs/combined-intake-source-map-2026-11-03/verification.json; preserve F2 tabs. Prepare mappings for every reader/count/processing/archive path before switching sources. No cutover is authorised merely by documenting this map.
  - Compatibility preparation complete in TEST v398; current connections remain active. Use COMBINED-INTAKE-CUTOVER.md for the approved final switch, including the improved ticket Form's actual new response tab ID, last-minute review receipts and end-to-end operational checks. Local fixtures are not evidence of a completed LIVE switch.
  - Native copy rehearsal completed 3 November: application/staff/TP/self-TT/ticket/defence/appeal persistence, actual copied Form delivery and rollback passed. All eight temporary workbooks and the copied Form were deleted and verified; helper removed. Evidence: outputs/combined-intake-native-2026-11-03/verification.json. This proves the intake compatibility route on copies, not a completed LIVE cutover or public website/real-staff walkthrough.
- Name the exact launch workbooks/deployment and the TEST environment retained afterwards. Decide whether the verified new S28 workbooks become operational; check every TEST-only guard, connection and label before promotion. Do not point the new Portal at older LIVE workbooks without checking their schemas.

**Exit:** one current inventory, release manifest, source map and comparison cutoff. Historical notes marked superseded must not reappear as current defects.

### 2. Compare every public page against LIVE and its underlying evidence

Use anonymous public access and the same data checkpoint. For each difference record the LIVE value/behaviour, TEST value/behaviour, verified expected result, source evidence, classification and resolution. Classify as TEST defect, LIVE defect corrected in TEST, intentional improvement, presentation-only difference or genuinely unavailable information. Investigate disagreements with the original records and agreed rules; neither site is automatically authoritative.

| Area | Required comparison |
| --- | --- |
| Home | Season state, next event/location/date, current-season indicators, sign-up action and application destination. Empty/off-season state must also work. |
| Standings | Every entered driver's points/rank/gap, constructors and overall totals, tie ordering, weekly totals, driver statistics and cool stats. Compare all four current divisions and all entered rounds, not a sample. |
| Results | Every populated qualifying/sprint qualifying/sprint/feature session, names, positions, times/gaps, points, penalties/removals, DNF/DSQ, fastest lap, safety cars/red flags, flags and pending/cancelled sessions. |
| Teams | Current full-team seats and principals, tier/seat numbers, vacancies, separate free-agent/reserve presentation and movement history. Distinguish current roster from previous contributions. |
| Ticket outcomes | Every case at the agreed cutoff, session, parties, final wording, points/time/bans, appeal status and final outcome; administrative and Codemasters cases included. Check agreement with licences. |
| Licences and bans | Every relevant driver balance, outstanding/served restrictions, affected rounds, accumulated penalties and carried seconds. Check reversed decisions and clear public labels. |
| Schedule | Dates, UK display, locations, sprint weekends, cancellation/pending state and next-race selection. |
| Past seasons | Every selectable season/division, official final standings and honours, correct names/ordering and available statistics. Active S28 stays out until closure. Check old formats, missing totals and links. |
| Hall of Fame / Records | Approved winners/runners-up, identities, team-name normalisation, points and record counts against the verified registry/original final sources. Confirm the new current-data feed loads without warning. |
| Track records | Track/layout, session type, timing format, driver, season and original evidence; unsupported times must not become records. |
| All Star Race | Existing public history, results, separate driver/team honours and correct configured event. Future event population must not erase existing history. |
| Applications and ticket entry | Correct accessible forms/destinations, agreed application questions and ticket session/driver lists. Everyone expected to submit a ticket/defence/appeal must have a working route without being granted staff permissions. |
| Rules and unchanged pages | Rules, merchandise, music and retained content remain reachable and correct. Check shared navigation/footer changes even where page content is unchanged. |

Check desktop and real phone layouts: readable tables, useful scrolling, filters, links and long names. Test ordinary reloads and existing browser caches/service workers, not only a fresh private window. Inventory old public URLs, shared links and anchors; plan redirects where needed. Confirm the Admin Centre entry remains off the public menu as agreed.

**Exit:** a page-by-page comparison report with all material differences explained. Screenshots support layout findings; source-level checks support numeric findings.

### 3. Reconcile results, penalties and statistics across the system

- Reconcile all entered current-season sessions and official driver/team/overall/weekly totals at the cutoff. Separate unapplied adjustments, pending appeals/reruns and penalties already included in source times, so imports cannot apply them twice.
- Follow original decisions and appeal changes through penalty transfers, licences, accumulated bans, carryovers and public exports. Check additions, reductions, overturns, no further action, DSQ, time removals and administrative decisions.
- Verify served qualifying/race bans and future restrictions. Carryovers follow the next race actually participated in, sprint or feature, once only; a second DNF clears that carried penalty under the agreed rule. Absence alone must not be guessed into an unconfirmed served decision.
- Verify moves/renames preserve permanent identity, historical team seats and team points. Driver championship points remain within their division history; teams retain points earned for them; seat numbers belong to the team seat. Returning to a previous division must recover the correct retained history.
- Reconcile every public statistical metric's definition and ordering. Official championship totals retain applicable sprint points; general career/overall race statistics use feature races, with sprint statistics separate. ASR points, wins and podiums stay outside general totals. DNF points follow the agreed zero-points rule.
- Recheck approved historical winners/runners-up and known prior corrections. Previous audit evidence includes 1,524 matched S16–27 checks and preserved approved honours; confirm the release still reads those repaired sources. Unknown historical values remain unknown, not zero-filled or inferred. Recovering genuinely unavailable historical information is a later job.

**Exit:** reconciled current totals, penalty state and public statistics, plus a short exception register. An unexplained score, title, restriction or record is a blocker for replacing that information.

### 4. Rehearse the Portal workflows and real role access

Use disposable TEST copies for scenarios that would otherwise alter operational history. Check the full route from an action to saved sheet data and public output, including reopening the screen. Existing automated tests support this work; they do not replace real-account and phone checks.

| Workflow | Required proof |
| --- | --- |
| Applications | New and returning driver, match/name choice, accept/archive/retry, tracker, time-trial booking/result, placement and updated ticket-form choices. Saved stream link/public-use labels must appear in Administration. |
| Results | Standard and sprint weekend, clear/correct an entry, DNF/DSQ, penalty due/served popup without losing inputs, time-adjustment assistance and correct points/public output. |
| Tickets | Ticket plus defence, explicit correct round/session, ordinary stewards, recusal, own-edit/peer-read protection, final decision and Complete round. Include Admins/Codemasters and identity matching. |
| Appeals | Only appealed cases visible to appeal reviewers; original context readable; upheld/changed/overturned decision correctly updates every affected licence/ban/export consequence. Final race-order adjustments remain clearly identified where manual. |
| Driver movements | Reserve to team, team to free agent/reserve, promotion/demotion, immediate team transfer, return to previous division and gamertag change. Preserve historical points/seat assignments; confirm the movement appears publicly. |
| Season operation | Correct active-season selection, calendar and links; no ordinary save needs an extra website-publication step in direct mode. Failures show recoverable, truthful status. |
| Roles | Owner/God, ordinary admin, Head of Allocations, head steward, steward, appeal reviewer, TP and Free Agent Coordinator. Check both visible UI and denied server actions. Confidential allocations/TT results and maintenance exceptions remain protected. |
| Team views | Actual assigned-team accounts see the right current drivers, tickets/evidence/licences and historic contributions. Coordinator sees the combined read-only free-agent/reserve group within the TP section. |
| Account experience | Google sign-in in a normal browser and on a phone, refresh/reopen/session expiry, changed/revoked permissions and profile/team/reviewer assignments. No account changes without the intended person's approval. |

Record real open/save times during meaningful work. Performance is judged by whether the routine journey is usable, including feedback, background saving and protection of unsaved input. Further speculative optimisation can wait; freezes, lost edits, unreliable saves and unusable waits cannot.

**Exit:** each routine workflow has a recorded successful run, failures/retries are understood, and role checks pass with actual intended accounts. No fabricated operational drivers or repeated real penalties for QA.

### 5. Preserve manual operation; detailed usability review follows launch

Owner decision, 3 November: the full manual walkthrough, worksheet presentation and guide improvements below are ongoing work under L12, not prerequisites for this switch. Keep working direct feeds and existing manual capability; resolve an actual data-loss or formula/public-feed defect if found.

- Give a first-time operator a short numbered guide covering a new application, results, ticket/defence/appeal handling, licences/bans/carryovers, driver moves and returning to the Portal.
- Rehearse the essential manual paths in copies. Confirm formula, validation and layout usability; identify exactly which cells are inputs, not calculated outputs.
- Confirm direct division edits feed results/standings and the existing ticket Website Export feeds outcomes/admin decisions without relying on an extra Portal publication command. Check Master-to-Website Config formula-fed views and recalculation delays separately.
- Demonstrate how to reconcile manually applied penalties or roster changes before resuming Portal processing. No instructions to fabricate hashes, JSON or internal journal receipts.
- Distinguish a Portal UI outage from an Apps Script outage and a Google Sheets outage. Explain what can still be recorded, what can be published directly and what must wait; a spreadsheet cannot provide an offline fallback for Google Sheets itself.
- Provide a concise weekly head-steward checklist and an owner connection/recovery sheet. Keep technical workbook links in the maintenance guide, not ordinary admin task cards.

**Before-launch requirement:** preserve existing manual/direct-source capability and truthful instructions; no known regression that loses data or corrupts history. **Later completion:** rehearse the full fallback and resumption journey and improve the manuals against the current direct-source design.

### 6. Fix blockers and approve the release candidate

Combine findings into one numbered register. Severity is based on operational/public impact:

- **Must fix before launch:** incorrect/missing public results, points, honours or penalties; broken forms or required role access; exposed private data; data loss; duplicate application; a confirmed regression in existing manual/direct-source operation; unworkable routine journeys; no dependable switch/recovery procedure. Full manual rehearsal and spreadsheet presentation improvements are deferred under L12.
- **Can wait with a documented limit:** cosmetic differences, clearly labelled unavailable historical data, optional automation, additional statistics and refinements of future-event workflows not needed at launch.
- A later enhancement cannot excuse replacing an existing working public function with a broken one. Retain its verified existing page/source until the replacement is ready if necessary, and test the combined navigation/configuration.

Fix in focused batches, then rerun affected checks and integration checks justified by each change. Freeze the approved website/configuration/Portal versions for rehearsal. Avoid continual redesign during the release audit.

**Exit:** no unresolved launch blocker; intentional differences and bounded limitations are recorded; exact versions and source IDs agreed.

### 7. Rehearse the switch and recovery

- Create verified backups of operational workbooks, current code/configuration and non-secret connection mappings. Keep credentials private; test recovery access, not merely the existence of a backup filename.
- Prepare the exact production website files/routes, Portal deployment and settings, forms/response sources, current-season configuration and public-feed permissions. Retain a separate safe TEST environment.
- Keep existing public page URLs where possible. Verify the short Admin Centre address and Google sign-in callback with the intended production deployment. A bulk `/next/` folder copy or a single URL change is not an adequate switch procedure.
- Confirm the private Master stays private; only intended public division data, ticket export and selected config views are readable. Check read access anonymously, not only as the owner.
- Rehearse the ordered changes, form handover, caches, dependency checks and recovery in TEST. Identify which old writers/triggers must stop so two systems cannot edit or announce the same update.
- Preserve the existing Discord jobs unless specifically approved otherwise. Optional new Discord controls/alerts are not part of this switch.
- Define recovery triggers and the responsible owner. A code/configuration rollback must preserve and reconcile any entries made since launch; do not restore an old Sheet over new submissions/results.

**Exit:** a concrete switch checklist, restore/recovery checklist, backup locations and responsible people. User approval applies to that prepared, reviewable release.

### 8. Perform the agreed live switch

1. Use a quiet agreed window between work periods; briefly stop affected edits/imports and record the final cutoff.
2. Back up and reconcile any data received since the final audit.
3. Apply only approved sources/configuration, forms, deployment and public website changes in the rehearsed order.
4. Verify public home, results, all division/overall standings, teams, outcomes, licences, archives/records and forms anonymously, on desktop and phone.
5. Verify owner and representative staff/TP sign-ins through the short address; confirm actual production destinations and access restrictions.
6. Reopen submissions/operations, give staff the concise links/checklists and record the release. Keep the previous setup available for controlled recovery.

**Exit:** published readback checks pass and new work goes to the intended single operational system.

### 9. Support the first real race week

Follow the first real application/result/ticket/appeal/movement that occurs, rather than manufacturing production activity. Check recalculation/public visibility, permissions, save feedback, bans/carryovers and staff experience. Record errors and meaningful timings, fix launch defects promptly and keep optional feature work separate. Close launch only once an actual weekly cycle is reconciled.

## Separate work after launch

These items do not block normal weekly operation, provided existing public functions work and the boundaries above hold. Being listed here does not unpark or authorise implementation.

| ID | Work | When to address it |
| --- | --- | --- |
| L1 | Portal-controlled Discord updates, notification channels, role mentions and connection/token maintenance | Resume separately when requested. Keep current working jobs and manual stewards-decisions / qualifying-and-race-ban posts. No Firebase or new paid service assumed. |
| L2 | Further performance profiling and code consolidation | Use real first-week timings to choose material improvements. Preserve fresh validation; stop work that cannot demonstrate a useful gain. |
| L3 | Ticket-workbook end-of-season cleanup, archival and tab-purpose guide | Explicitly parked. Resume before closure with dependency/backup checks; do not delete live evidence or journals. |
| L4 | Full season-close rehearsal, accolade/stat commitment and website transition | Basic compatibility and source isolation checked before launch; complete the rehearsal before real closure, in copies without permanent stat writes. Current standings move to history, current/schedule/home state changes, results/teams remain available. |
| L5 | Full next-preseason rehearsal, launch signposting, draft/prediction and presentation refinements | Before next pre-season or draft. Existing functional paths receive inventory/smoke checks before launch; avoid delaying weekly operation for broadcast polish. |
| L6 | ASR invitations, manual selection, pairing/car allocation, announcements and race-night presentation refinement | Before ASR. Retain known history/public links now; dedicated rehearsal can wait until its event window. |
| L7 | Additional TP Circuit guide/handbook content, weekly-show view and visual refinements | After correct team/ticket/licence information is proven. |
| L8 | More Hall of Fame/record-card statistics and recovery of unavailable historical data | After the currently displayed counts/awards are verified. A known wrong displayed title or total belongs in pre-launch corrections. |
| L9 | Optional self-submitted TT automation and weekend-format conversion improvements | Check present capability in the inventory. If a required route has no usable manual alternative it becomes a blocker; otherwise schedule before its next use. |
| L10 | Stream-directory improvements and gathering missing channels | Directory is implemented in TEST v388. Collect better answers naturally through applications; no invented links/consent or mass historic edits. |
| L11 | AI poster generation | Much later, explicitly low priority. Copyable dates remain available independently. |
| L12 | Spreadsheet-only usability/layout improvements, full first-time manual rehearsal and expanded guides | Ongoing after launch, explicitly agreed 3 November. Preserve current direct feeds/manual inputs now; do not delay the switch for presentation work or an exhaustive fallback walkthrough. |

## How to track progress

Maintain one row per finding: ID, area, LIVE behaviour/value, TEST behaviour/value, expected result, source evidence, severity, owner, fix/retest status and accepted limitation if applicable. Use Pending / Checking / Fix needed / Verified / Accepted limitation; do not mark an area verified merely because its code exists or an older release passed.

Recommended immediate next job: **rehearse the three minimal Portal display/link changes**. The public root/cache/mobile rehearsal is complete locally; real staff/phone checks and final data delta/backups/trigger census/approval remain. No LIVE switch is authorised by this document.
