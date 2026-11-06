# 4 November 2026 — TP submitted-ticket visibility checked/fixed (v403); Discord review alerts DROPPED

Owner dropped steward-ready, appeals-ready and TP Discord ticket-information posts. They are not pending work. Only the existing application Discord sender remains prepared/off. Do not propose more notifications automatically. Current task was ensuring normal principals can read relevant submitted tickets, statements and evidence within their TP hub before processing.

Fresh v402 baseline matched local sources; reproduced three faults: inbox exceptions disguised as empty, lost new-form session, and non-owner scrub removing Google Sheets evidence/statement URLs. Published v403 changes only TeamPrincipalHubService, TeamPrincipalHubClient and scoped AccessService sanitiser. All other 118 files preserved; source/HEAD/deployment verified. Combined legacy/improved inbox routing and server-side assigned-team/current-roster filtering verified. Public case fields only; no private reviews/notes. Added inbox-only Refresh, immediate check on Tickets reload, honest loading/error feedback, last-good list retention and stale-request protection; 30s visible-panel polling leaves full-ticket modal open. Recorded sessions now display; legacy blanks remain blank. Submitted evidence/statement links preserved on five scoped TP/coordinator ticket getters while internal workbook links stay hidden.

14 focused checks, 8 isolated browser checks and existing TP details/Ferrari-history/mobile regressions pass. Browser proved new arrival before processing, both involved sides/admins, statement/evidence/session, polling modal retention, failure recovery and 390px fitting. No real submissions/process/archive/delete, results/penalties/role/source/Discord changes, public website push or Google test files. Evidence: outputs/tp-submitted-tickets-2026-11-04/verification.json and REPORT.md. External staff login/phone permissions were not impersonated or changed.

# 3 November 2026 — application Discord sender built/proved, intentionally OFF (v402)

Owner requested new-application Discord messages, clarified these are Discord messages rather than Portal notifications, then confirmed no Head of Allocations is assigned yet. Real route remains OFF; no live recipient guessed, no roles/channel/settings changed, no background triggers installed. TEST Portal v402 adds DiscordApplicationService + four owner-only/gateway-checked endpoints and updates AccessPolicy/DiscordGithubClient/DiscordGithubView only (117 other remote files preserved). Final source/HEAD/deployment match. Commit 17972d3 (two new bot/workflow files only) pushed by owner and verified. Actual private example run 41653426607 succeeded, one quiet message 1567182821473128519; no application submitted/changed.

27 behaviour tests, 16 access checks, 12 control regressions, 18 role-policy checks pass. Existing broad access suite's stale Admin-TT assertion fails identically on original baseline; do not claim all broad tests pass. No Phone/Firebase modules deployed. New sender uses independent short GitHub runner, private queue/identity hashes, minimal count-only public jobs, durable receipts, no blind ambiguous retries. First activation baselines existing applications, installs form-submit + 15-minute reconciliation triggers and resolves an explicit active allocations_lead + saved Discord user ID; owner must provide/verify admin-notifications channel before enabling. No in-Portal notification feed/preferences added. Existing LIVE workflows/schedules, combined intake and public website unchanged.

Evidence: outputs/application-discord-2026-11-03/verification.json and REPORT.md. Next: recipient/channel setup and real-route verification when owner is ready; then enable. Stewards/appeals/quiet-TP event alerts remain separate. Decisions and outstanding-ban announcements stay manual.

# 3 November 2026 — Discord controls fixed and privately verified (v400)

Supersedes the earlier read-only audit's undeployed-control-fix status. TEST Portal v399→v400 changes only DiscordGithubService and DiscordGithubClient; all other 118 current remote files preserved. Source/deployment/HEAD readback match. Pending Pause/Resume/Finish labels and stale-response protection now live; reduced remote status reads preserve authority/revision checks. 12 control and 25 runner checks pass. Actual private practice run 41647463296 succeeded: two distinct example messages, no new messages while paused for >60s, resumed once, then stopped. UI showed all pending/acknowledged states correctly. No live channels/workflows/schedules/roles/credentials changed, no website push required, no active test remains. Evidence: outputs/discord-controls-release-2026-11-03/verification.json and REPORT.md.

Next separate work: role-recipient/channel verification and application/newly-released steward/appeal/quiet-TP event alerts. Those remain NOT enabled. Decisions and outstanding-ban posts remain manual. Individual phone choices stay in Discord. Legacy sender reliability/schedule/source-cutover findings from the audit remain outstanding.

# 3 November 2026 — Discord re-audited READ ONLY; individual notification choice confirmed

Owner asked to check the full setup after clarifying that individuals choose phone alerts in Discord. Fresh published v399/120-file HEAD parity and current main e4be23a/12 sender-workflow files verified; no Phone/Firebase modules deployed. Existing standings and team/calendar jobs remain active, latest 30 runs each successful on 2 November, but legacy code still swallows some delivery failures. Seventeen offline legacy faults reproduce; do not equate green jobs with confirmed messages. New Portal runner remains private-only/manual-only; latest job finished 15 October, current credential-authenticated status read succeeded. Historical 32-pick/four-standings/12-team/calendar private proof retained, not repeated with sends today.

New application/steward/appeal/quiet-TP event alerts and production routing are NOT implemented. Private sender intentionally suppresses mentions and pushes; staff alerts must omit forced silence and use explicitly allowed recipients. User preferences belong in Discord, not Portal account settings. Eight active people have Discord names, zero numeric user IDs, no allocations_lead/head_appeal explicitly assigned; one head_steward. Discord role IDs can be used for group pings without collecting everyone's personal ID. Agreed channels/manual exclusions unchanged.

Prepared two-module control fix remains undeployed: actual current Finish→Ready, early Pause and misleading Resume faults reproduced; candidate passes 12 checks and runner 25. Apply to fresh v399 only, not old v361 whole-project snapshot, then privately remeasure. Existing schedules still differ from preference (standings twice daily, teams Mon/Fri); exact replacements undecided. Existing live source pointers must move with eventual website handover. Dormant outcome/ban notifier and unsupported direct-send pilot must not be revived.

Discord/cron/GitHub settings browser sessions expired; desktop navigation did not verify channel view. Current channel/role/bot permissions and cron enabled state remain unverified (last cron observation disabled 14 October). Stored GitHub credential works for current reads; recorded 14 November expiry not freshly checked in account settings. No messages/dispatches/config/permission/role/source/deployment changes or new Google files. Evidence: outputs/discord-review-2026-11-03/verification.json and REPORT.md.

# 3 November 2026 — real intake ACTIVE; public website NOT switched

Owner explicitly approved the intake-only switch. Portal v399 now resolves applications, tickets/defences/appeals, staff/TP applications and self-TT to real Tickets & Apps (1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ). Improved Form 19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo now responds there through native Form Responses 6 / gid 546580155; legacy F1 Tickets and all other existing public Forms remain connected as before. Private profile=combined and enhanced response gid are set. Form accepting/published, neutral S28 text and 100-driver roster verified; its previous response count was zero.

Preflight found four legacy mis-mapped saved application snapshots (saxton_26, liamstoner, D4ZED FRAPPE, MxWhItTy11). Exact original identities and ten shifted-column relationships proved the issue. Corrected only Processed Applications!G96:G99, preserving IDs/keys/formats. Portal now shows ten pending applications, four already processed recognised; tickets/staff empty, self-TT two. No submissions accepted/imported/archived/deleted, no new profiles, placements/results/penalties unchanged. After that correction, 25 existing ranges verified unchanged. Six private recovery copies retained deliberately. Temporary owner helper removed; all 120 editor/published files and v399 restored unchanged. No public website/config change, commit/push, role/scope/sharing change or Discord send. Evidence: outputs/intake-activation-2026-11-03/verification.json and REPORT.md.

**Operational boundary:** real incoming submissions are now affected by Portal accept/archive/delete actions even while public results/tables still use the old LIVE site. Do not treat TEST-named Masters/intake as disposable QA. Use isolated copies for mutation tests. Preserve this active connection at the eventual public switch; do not reconnect the Form or guess/reuse its old response gid.

# 3 November 2026 — local root/cache/mobile rehearsal completed; no publication

Eleven proposed public root pages and all eleven responsive layouts (390 × 844, plus weekly points) were browser-checked. Fresh homepage and actual old-worker upgrade passed. Reproduced delayed obsolete-cache lookup; scoped lookups now prevent it. Prepared mobile result/ban scrolling fixes and remaining TEST-label cleanup, with 13 automated groups and 665 static references passing. All 37 product paths remain unchanged; no Google writes, Portal deployment, commit/push or Discord sends. Evidence: outputs/launch-rehearsal-2026-11-03/verification.json and REPORT.md. Page rendering used a read-only public-source proxy; native feed/cache GETs were separate. Temporary server/tabs/cache/worker/viewport state was cleaned up.

One visible follow-up: S27 archive shows two numeric-zero placeholder teams; inspect existing archive parser before full public sign-off. Minimal Portal display/link rehearsal, real staff/physical-phone access, final data delta/backups/trigger census and frozen release approval remain. Candidate release is launch-proposal-20261103-r3; this is still LOCAL ONLY.

# Handover documentation changelog

## 3 November 2026 — exact handover plan/local production proposal

Prepared LAUNCH-HANDOVER-2026-11-03.md, a hash/source/path manifest, 37 LOCAL website candidate files and three LOCAL Portal label/link modules based on deployed v399. Preserves eleven public routes, unchanged content/forms/ASR index, private Master alias, existing auth/callback, current source IDs and internal TEST guards. Includes proposed cache version/workflow and track-record feed bypass fixes, preview compatibility redirects, off-menu old ticket URL and two existing bot config constants. Ten local proposal/cache checks and 665 static links pass with no introduced missing resource; unchanged Music background reference recorded. Existing bot parser reads pass against candidate sources without Discord transport/messages or schedule changes. Defines final cutoff/receipt checks, Form gid capture, trigger review, backups and recovery that preserves new work. Native root/cache/staff-phone rehearsal and approved frozen release remain. No product-path changes, operational source/Forms changes, deployment, Google file creation, commit or push.

## 3 November 2026 — read-only launch account/access audit

Inspected current TEST v399, People/register sharing, S28 teams and fifteen steward headers. No duplicate account, missing active profile or invalid current TP/reviewer assignment found. Eight active/one suspended accounts; People register unchanged on final readback. Forty deployed-source fixture groups plus reviewer-isolation checks pass, with 277 external direct-entry denials; actual Portal built-in guard check passes and short entry/owner/People UI works. Actual restricted staff/phone sign-in checks remain explicitly pending. No runtime, deployment, role, settings or operational data changes; no commit/push. Roadmap/current state and concise LAUNCH-ACCESS-CHECK-2026-11-03.md updated. Evidence contains sanitized register results, not raw People data or account identifiers. Existing unrelated local/deployed differences are retained; final releases must stay selective.

## 3 November 2026 — retired demo fallback removed; TEST v399

Published website e4be23a changes only next/config.js, next/results.html and next/schedule.html. All three match public HTTP readback. Config failures show unavailable/Retry instead of Season 1000/demo workbook sources; Results stops on failure, Schedule does not silently use its old source. Fourteen focused checks and direct-source/historical/calendar regressions pass. Anonymous loader verifies active S28 and historical S27/S9; browser owner Portal, S28 results/R15 and S28 schedule load normally. Portal v399 selectively changes Index/WebsiteDataService/SeasonStatisticsPreviewService defaults/examples, all 120 files verified with 117 unchanged. No operational data/settings/Form/role change or LIVE switch. Active Drive demo-name search is empty; old fallback IDs return NOT_FOUND rather than being claimed deleted. Audit/test fixtures and the deliberate rollback copy retained. Evidence: outputs/retired-demo-cleanup-2026-11-03/. Roadmap/current issues updated; detailed manual-sheet usability stays deferred after launch.

## 3 November 2026 — native combined-intake rehearsal and complete cleanup

Seven phases passed using actual Google Sheets/Form services in an owner-only, copy-allowlisted sandbox: prepare, original application, combined application/key reconciliation, staff/TP/self-TT, real copied Form submissions, ticket/defence/appeal import and rollback. Correct profile counts, archive retries, 31-second TT average, TP preferences/acceptance, session, repeat-safe import and twelve unrelated ticket cases verified; F2 preserved. Source settings/cache/owner context isolated; external publication and full UI reply rebuilding excluded. Initial copied Form was closed; restricted responders to owner, enabled the copy and retried successfully. Added final publication/description checks to cutover notes. No product code fixes were required. Deleted all eight disposable workbooks plus copied Form; nine NOT_FOUND readbacks, originals still available. Removed unpublished helper; all 120 HEAD files exactly restored, published v398 untouched. Evidence: outputs/combined-intake-native-2026-11-03/verification.json and audit.html. No live connection, operational Form, real profile/result/penalty, commit or push changes.

## 3 November 2026 — combined intake compatibility prepared, TEST v398

Deployed eight existing intake/form modules plus new IntakeConnections; all 120 deployed files verified against the selective release, v397 retained. The private source profile defaults to existing connections; no connection properties, Forms destinations, LIVE data, websites or sharing were changed. Prepared combined F1Apps/F1 Tickets/Staff Apps/TTSubmission routes, heading-based driver answers, explicit archive routing/blank Timestamp repair, existing processed-application and TP key reconciliation, both ticket layouts/session/evidence and schema-specific TT archives. Ten combined-profile service fixtures, seven regression groups (TT-import subset of the old cleanup suite), eight Form cases, thirteen current background checks, eight TT Team role checks, ticket delivery/workflow and reviewer isolation pass. Old standalone role expectation and stubbed staff-counter segment are superseded by current suites and not claimed as passing. Fixture loaders/headers/tab IDs updated to native source shapes; no browser harness invoked. Cutover instructions: docs/handover/ai-pack/COMBINED-INTAKE-CUTOVER.md. Evidence/backup/readback: outputs/combined-intake-ready-2026-11-03/. No commit or push.

## 3 November 2026 — combined LIVE intake workbook recognised across all areas

Owner confirms the combined Tickets & Apps workbook applies beyond driver applications. Read-only metadata and header checks map F1Apps/archive, F1 Tickets/TicketsArchive (including defences/appeals), Staff Apps (staff and TP applications), TTSubmission, and preserved F2 tabs. Recorded source IDs, incompatible header/index/archive assumptions, TEST ticket guard and improved form/session cutover requirement in the roadmap, known issues and outputs/combined-intake-source-map-2026-11-03/verification.json. No operational data, deployment, source configuration or Forms destination changed.

## 2 November 2026 — DH TEST ticket form refresh

Used the existing Portal Update form driver list control for S28. Saved status changed from 99 drivers (22 October) to 100 drivers, updated 02/11/2026 16:33:17, with no queued/error status. Fresh Google Forms preview confirms DH9982970 in both from/against lists; both complete lists match the 100 Season Entrants names from this session’s source read. DH’s existing permanent profile/placement retained; no fictitious record, code/deployment or LIVE change. Evidence: outputs/dh-ticket-form-refresh-2026-11-02/verification.json and portal-confirmation.png.

## 2 November 2026 — new-driver journey checks

Read-only real source trace and isolated local service rehearsal: application acceptance → permanent identity/tracker/TT queue/archive → completed trial → active placement/Season Entrants/division lifetime list → queued ticket form list generation. Six linked rehearsal steps pass with current production services and disposable in-memory adapters; no actual Google copies/submissions/fictitious profiles. Additional intake/naming/TT/form integration and eight TT Team permission checks pass; one old test expected the retired warning phrase and now checks current wording. Deployed v397 eight relevant modules match. All 100 season IDs found in permanent registry; 98 processed applications match queue records without duplicates. Actual TEST form browser inspection confirms published S28/four divisions/four sessions but BOTH lists have 99 drivers and omit DH9982970; sorted lists match exactly the other 99 entrants. DH profile/placement exists; do not duplicate. Existing Portal saves queue refresh, while manual/import writes bypass that hook; worker saved state not yet inspected. Next job: refresh TEST form using existing control and confirm worker/status. Public /applications.html is retained intentionally, not /next/applications.html; launch must align real public form response destination with the operational Portal source (currently TEST duplicate). Real staff/phone and external form submission not claimed. Old automated browser harness failed; actual read-only form inspection succeeded. No product/Google/deployment changes. Report: outputs/new-driver-journey-2026-11-02/audit.html.

## 2 November 2026 — three confirmed historical assignment corrections

TEST-only repairs: D2 R3 rigd12 C69/E69 and C108/E108 changed Ferrari #44 to recorded Aston Martin #14 free-agent assignment, preserving qualifying time/DNF/zero points. D3 Driver Assignments Tiggz row22 now ends R7; new row33 records R8 Ferrari Tier1 #16 only. D4 Sparky row26 now ends R7; new rows30–31 record R8 Racing Bull Tier2 #41 Free agent and preserve the original R9 McLaren Tier2 #81 assignment, with existing R10-onward Reserve interval retained. No new signing date inferred, no other rounds changed, current line-ups and Master records untouched. Native formatting/validation copied to appended rows; bounded prewrite checks and backups retained. Readback verifies all driver scoring tables, race times/order/points and integer constructor points/ranks unchanged; expected DNF countback epsilon moves Ferrari→Aston Martin for rigd12. All 24 affected full-team contribution totals reconcile using production TP calculation. Interval coverage/non-overlap and every other round's old assignment verified. No LIVE/code/deployment changes. Evidence: outputs/confirmed-assignment-tidy-2026-11-02/verification.json and before/after files. Audi R14 swap remains unconfirmed; old inactive occupied seats remain unchanged.

## 2 November 2026 — roster audit clarifications and rigd12 R3 origin

Owner confirms current TEST Chetty/Audi and Imi/Red Bull are correct; DeEchteChaz reserve/vacant Alpine T2 is acceptable. Historical manual practice could leave retired drivers occupying seats indefinitely; do not infer activity or invent retirement/move dates from that. Tiggz's D3 R8 #16 is correct; Audi historical swap remains unconfirmed. Investigated rigd12 D2 R3 after owner confirms never Ferrari: fresh LIVE and TEST both show #44/Ferrari at qualifying row69 and feature row108; original R3 import snapshot in S28RoundThreeImport also has those values. Therefore the incorrect TEST assignment was inherited from original LIVE data, not established as a later Portal save/reorder defect. Feature result DNF/0 points. Assignment history specifies Aston Martin #14 as Tier1 free agent for R1–4. Read-only evidence: outputs/rigd-r3-assignment-2026-11-02/. No data changed in this investigation.

## 2 November 2026 — Hakejowe public movement round correction

Wrapped the existing public movement QUERY input in ARRAYFORMULA(TO_TEXT(...)) so mixed numeric/text source rounds are retained. Updated only S28 Public Driver Movements A1 in TEST Website Config, preserving the same Master B:B/D:P public-column allowlist and excluding private notes/actor fields. Actual Google recalculation and full 73-row comparison confirm the only displayed difference is M45 blank → 4; Hakejowe's Master movement stays untouched. Updated SeasonLaunchService's direct-view generator to produce the same corrected formula for future seasons/reconnections. Existing public teams page browser read confirms “Hakejowe · From R4” for the Haas → Aston Martin move. Results, points, current placements and LIVE unchanged. Evidence: outputs/hake-movement-round-2026-11-02/; deployment readback recorded there.

## 2 November 2026 — current team/roster/movement read-only audit

Fresh Master line-ups/entrants/teams/73 moves, four division Data/assignment/scoring/constructor sheets, R1–R15 saved results and LIVE/TEST public team feeds. All 100 current division memberships (62 full team, 10 free agents, 28 reserves) match the public parser and Master; current numbers/tiers/principals validate; eight full and three free-agent teams grouped correctly per division. All 32 full-team TP totals AND individual driver contributions and all 44 constructor totals reconcile with 1,094 saved race/sprint rows; 22 former-driver scoring contributions retained, 118 scoring histories retained. Latest logged move destinations match current roster. Deployed v396 TP/active/movement modules and published teams page match local. Findings: Hakejowe Master movement row45 effective R4 is string-typed and becomes blank in public QUERY; three actual LIVE/TEST full-team seat differences (D1 Alpine T2; D3 Audi T1; D3 Red Bull T2), eleven other differences known aliases; 17 historical result/assignment metadata discrepancies, ten free-agent-only, seven involving full-team/seat (rigd12 D2R3, Tiggz D3R8, confirmed-free-agent Sparky D4R8, Audi tier pairs in both D4R14 races). Current totals remain reconciled. No data/code/deployment edits; role/account/mobile rehearsal not claimed. Report: outputs/s28-roster-audit-2026-11-02/audit.html.

## 2 November 2026 — final S28 ticket/penalty verification through R15

Fresh read-only snapshots of all 15 LIVE/TEST source rounds, TEST exports/ledger/additional penalties/baselines, Master licences/bans/carryovers, four division licence imports and all R1–R15 results, plus eight public feeds and deployment/page readback. All 155 TEST cases (36 appeals), 155 transfers and 102 driver contributions reconcile; 118 division licence histories/imports agree. All 19 expected accumulated actions and 13 direct bans exist once. Sixteen carryover records validate, no missing carryovers; four appropriately pending. All 72 race/sprint receipt checks pass without drift, pending journals, unconfirmed amounts or remaining time adjustment. Source appeal descriptions/evidence are present publicly; Jack reversal text verified. Public TEST ticket/licence/ban data matches sheets. v396 six audit modules and three public pages match local. Retained caveats: Senna confirmed served, actual round unknown; ThatAxolotlGuy D3 4.5 points supported by saved R2/R3 decisions versus LIVE 3, with no recorded deduction; obsolete LIVE Saxton ban notice remains LIVE-only. Old S27 export formula errors are outside this scope. No data, code, deployment or website changes during verification. Report: outputs/s28-ticket-signoff-2026-11-02/audit.html. This verifies recorded decisions, not incident adjudication or undocumented clean-race/discretionary deductions, and is not whole-Portal go-live sign-off.

## 2 November 2026 — historical game-penalty removals reconciled

Verified original LIVE/TEST decisions: Chetty2511 R5 USA #8 removes three seconds; Harrison R8 Mexico #2 reduces the original ten-second penalty to five, therefore removes five seconds. TEST final results match LIVE (+12.454 D3 R5 Chetty; 49:38.437 D1 R8 Harrison). Recorded signed submitter adjustments at Website Export X89=-3 and X113=-5; resolved shortened export name Harrison to existing TTREHarrison at D113 for exact permanent-identity matching. Updated only these two transfer-ledger applied contribution/revision/check records and the two race Gap-heading receipt notes, explicitly recording removals as already included. No licence deductions: both contributions have zero points/added seconds, removedSeconds 3/5 and resultAction=true. Actual production contribution/hash/calculator functions verify current decisions match applied/checked records, receipt fingerprints match final results, and zero adjustment remains. Fresh readbacks confirm all race inputs/formulas and Master licence inputs unchanged. TEST public ticket windows show three/five seconds removed. LIVE and application code unchanged; no deployment required. Backups, plan and verification: outputs/historical-removals-2026-11-02/.

## 2 November 2026 — TEST v396 appeal publication repair

TicketProcessingService now copies source appeal description and all three evidence fields into Website Export on initial publication and appeal saves, preserving manual public content when source fields are blank and preserving the final decision fields. Unified saves include this content before retry/idempotence comparison so resaving an unchanged decision can repair an older blank export. The same request reuses its source record for the amendment to avoid another workspace read. Deployed only this existing module; full project/version readback verified v396, previous v395 retained. Tests passed for appeal/reversal transfers, lost-response retries, unrelated balances, source evidence, backfill on unchanged decisions and preservation of manual content. Corrected only AC:AD for TEST R8 #8 (row119), R9 #3 (row125), R13 #1 (row171), and AC:AE for R13 #5 (row175), using existing source submissions and Jack's verified LIVE reversal explanation. Nine cells total; all other case fields and the complete penalty-transfer ledger unchanged on fresh readback. Actual public TEST browser checks confirmed restored descriptions/evidence in the four cases and Jack's correct reversal explanation; no browser errors. No race results, licence points or LIVE data changed; no website code push needed. Evidence/backups: outputs/appeal-publication-2026-11-02/.

## 2 November 2026 — confirmed historical penalty follow-up

Owner resolved three audit questions. Added TEST Master Time Penalty Carryovers rows 16–17: rigd12 R1 #4 five seconds Applied at D2 R2 feature, explicitly already included in final results; Voshund R3 #10 five seconds Cancelled as waived. Source case IDs and permanent driver IDs retained; no result or licence-total edits. Owner confirmed Senna served his R9 qualifying ban elsewhere but cannot identify when; after explicit approval, cleared only the incorrect R10 service reference at Outstanding Bans D13, retained Served=Yes, and corrected G13 reason/note to record the uncertainty. Fresh source read confirms Saxton R15 #7 was appealed from reprimand/10s to NFA; #10 and #12 leave six points, explaining the obsolete nine-point ban notice on LIVE. TEST has no Saxton ban and needed no balance correction; LIVE unchanged. Readbacks verified, backups under outputs/s28-penalty-followup-2026-11-02/. Appeal-publication fixes and historical Chetty/Harrison time-removal metadata remain outstanding.

## 2 November 2026 — TEST v395 Time Trial Team role

Added the owner-requested `time_trial_team` / **Time Trial Team** preset. After clarification, it grants application processing (`applications:2`) and TT recording (`time_trials:2`), plus the existing navigation/season-hub access. It does not grant allocation/movement tools, completed TT results/rankings, self-submission approval, track setup, race results, tickets, maintenance or people administration. Existing server-side TT redaction and completed-trial amendment restrictions apply. Other assigned roles and individual exceptions continue to combine normally; no accounts were reassigned. Updated AccessPolicy and the maintainer role-presets source. Eight focused checks passed, plus 18 existing role checks, seven account checks and reviewer isolation. Deployed only AccessPolicy to the existing TEST Portal; full project and deployment readback verified v395. No Sheets data, public website or LIVE edits. Evidence and prior remote project: outputs/time-trial-team-2026-11-02/. Refresh the Portal, then choose Time Trial Team under People & permissions.

## 2 November 2026 — final S28 standings/statistics verification passed

Fresh read-only capture of all eight LIVE/TEST division workbooks, R1–R21 and calculated tables, plus published page/config/feed reads. TEST R1–R15 passes 1,094 point awards, 1,888 driver metric checks, all driver rankings/gaps, constructor totals and team statistics, and 165 public weekly totals. No unmatched identities, duplicate driver results, missing seat-tier mappings or future result entries. Remaining LIVE/TEST row differences are classified: reserve exclusion/free-agent allocation, approved R14 sprint points, confirmed Sky/Lt Dan times, BigG Tier 2 seat and equivalent/corrected time formatting. Actual browser checks confirmed overall/weekly/Cool Stats, D2 Slowdog 88/rigd12 78 and Ferrari 138/Williams 124, plus D4 Racing Bull Tier 2 average 9.2. Only wording tidy: Cool Stats points cards should explicitly say feature-race points. No new product/data/deployment changes in this pass. Ticket/ban correctness and historical honours were outside this pass; this does not sign off the entire go-live. Readable report: outputs/s28-final-verification-2026-11-02/audit.html; detailed evidence alongside it.

## 2 November 2026 — TEST v394 shared free-agent seat averages

Owner confirmed Sparky0431 was a free agent at D4 R8. Both his and Dean1981's Racing Bull #41 entries remain; Dean's McLaren signing is effective R10. The first-match constructor-seat summary omitted Sparky's finish. Replaced the four tier-average formula generators with finish-weighted SUMIFS/COUNTIFS over historical team and seat, excluding non-classified results and other teams. Applied only H:I and L:M in S28 TEST Team Stats Calc Sheet across all four divisions (192 cells). All 192 actual Sheets formulas/values match independent recount; only D4 Racing Bull Tier 2 feature average changes, 8 to 9.2, also verified in the published TEST feed. No driver, tier, number, roster, results, points or LIVE edits. Only DivisionTemplateService deployed; all 119 files verified. Existing save/reorder regression still passes. Evidence/backups: outputs/shared-seat-statistics-2026-11-02/completion.json. This resolves the R8 duplicate-seat statistics question in the previous entry.

## 2 November 2026 — TEST v393 result reorder team/seat ownership fix

Owner-confirmed follow-up: retain Sky D2 R13 +3.237 and Lt Dan D2 R4 +17.784 as correct TEST values. Corrected D2 R13 Slowdog76 to P10/1 point and rigd12 to DNF/0, preserving row ownership, formulas and already-included penalty amounts; the Gap receipt fingerprint was reconciled and annotated. Replaced R7 qualifying DSQ with no-time placeholders for rigd12 D2, SW155K1NG D3 and RamboJambo51 D4. Readback and public overall Ferrari 819/Williams 640 verified. Dean's recorded McLaren signing is effective R10; the R8 duplicate seat remains pending clarification of Sparky's actual status, with no R8 edits. Details: outputs/results-assignment-fix-2026-11-02/followup-confirmations.json.

Reproduced Bahrain's team corruption using the deployed save and history trigger: the calculator moved complete driver rows, but saving wrote names/times while frozen teams stayed attached to old positions. DivisionDataServices now plans historical team/seat ownership by driver before writes, preserves it across penalty/appeal/manual reorders, clears reserve seats and verifies ownership before confirming the save. A mismatch restores the prior round block. Race revisions include team/seat edits. One existing remote file changed; all 119 deployed files verified. Automated tests exercise the production save, calculator and history trigger with mock Sheets (1,440 ownership assertions), plus existing adjustment/history/performance/formula tests. Seven verified TEST R13 driver assignments repaired in D2/D3 (13 cells), with all other inputs, formulas and notes unchanged; public overall totals recalculated and verified. LIVE untouched. Other audit differences remain separate; this is not a declaration of complete LIVE parity. Evidence/backups: outputs/results-assignment-fix-2026-11-02/completion.json. Reload the Portal before further results entry.

## 14 October 2026 — restricted reviewer journeys checked

Steward-only and appeal-only automated end-to-end checks pass through actual access policy/client/gateway and ticket readers/writers, with disposable local sessions and mock Sheets. Cross-role/head-steward/people access denied, spoofed reviewer slots ignored, own-cell changes only, saved reviews read back in head-steward workspace, appealed-only/original context, mobile queued edits/local switches/session reload and audit actor verified. Seven tested sources match verified TEST v354. No product, real account/permission/data or deployment changes. Real external Google accounts and exact People-register assignments remain a human check. Evidence: outputs/reviewer-role-journey-2026-10-14/REPORT.md.

## 14 October 2026 — TEST v354 Stewards & appeals mobile review

Only StewardAccessClient changed. Mobile now uses page scrolling, 240px reasoning, 44px touch controls/16px fields and read-first local pane switching. Inline saving/saved/retry/view-only feedback sits beside the reasoning; existing unobtrusive background-save path remains. Peer reviews explicitly read-only. Existing own-slot server authority, appealed-only originals, local ticket navigation, delayed-save typing/retry/conflict and desktop/mobile regressions pass. No extra RPCs, backend/permission/season/LIVE changes. All 106 deployed files verified; previous v353 retained. Evidence: outputs/steward-mobile-2026-10-14/REPORT.md.



## 13 October 2026 — TEST v353 TP licences and outstanding bans

Current driver licence cards, division filtering, expandable earlier-division/served records and clear outstanding-ban/carryover cards replace the old appended table. Former drivers and served bans are excluded from current counts. Overview’s count opens the licence view directly. A protected independent Master-only read avoids ticket-history/division-book/Registry scans; ticket history loads only in its subview. Half-points, identity matching, failures and stale responses are handled. No season data or LIVE changes. Four existing modules, all 106 retained. Evidence: outputs/tp-licences-layout-2026-10-13/REPORT.md.

## 13 October 2026 — TEST v352 TP Circuit guide and handbook

Replaced Race week with a season-independent 36-circuit library (25 existing layouts; 14 sourced descriptions) and eight practical TP guides. Two content tabs in the existing TEST Website Config support manual maintenance and owner/God or maintenance-authorised in-portal editing. Principals are read-only; revision checks protect manual changes. Deferred loading and tab reuse preserve Overview speed. No season data, existing routes or LIVE changes. Four existing modules, all 106 project files retained. Evidence: outputs/tp-reference-library-2026-10-13/REPORT.md.

## 13 October 2026 — TEST v350 TP current drivers and team contributions

Your divisions now scopes current Ferrari/team drivers by division and retains newly signed drivers without results. Official constructor points/positions are preserved. Added a read-only, permission-scoped, lazy/cached Points earned for [team] breakdown with current/former drivers and permanent-identity assignment intervals. Reuses scoring helpers; no round scans, new worksheets, season/LIVE edits or website configuration changes. Real Ferrari totals reconcile across all four divisions; server access/history checks and desktop/mobile rendering/cache/retry/stale-response tests pass. Restored full 44-driver standings read. Evidence and rollback: outputs/team-principal-current-history-2026-10-13/REPORT.md. Four modules deployed; whole 106-file project readback verified.

## 13 October 2026 — TEST v349 qualifying ban/tyre correction

Only LicenceService and ResultsEntryClient deployed. Served-ban checks read F (qualifying time) for qualifying/sprint qualifying, G (gap) for race/sprint race. Previously a default Soft tyre falsely counted as participation; S28 D1 R14 Yaotzin row 18 confirmed this case. Explicit tyre edits, including blank choices, now survive default filling; other defaults/times unchanged. Scoped server/client regressions pass, deployed readback verified across the preserved 106-file project. No actual results, bans, LIVE or website files changed. Evidence: outputs/qualifying-tyre-ban-fix-2026-10-13/REPORT.md.

## 13 October 2026 — TEST direct-sheet migration completed

TEST deployment v348 and published website commit 4d0491e remove S28's routine duplicate publication. Four working division workbooks now provide results/rosters/stats directly; eight automatic allowlisted public views reside in the existing Website Config while the Master stays private. Overall/weekly public displays aggregate direct division sources. Existing ticket Website Export remains authoritative. Future launches default to direct_division_v1; legacy snapshot routes remain. All 28 historical mappings unchanged, 36 anonymous feeds checked, real-data totals parity and appeal/movement/rename regressions pass. Existing manual D2 edit reaches the public source without publication. Old public workbook retained for rollback; no LIVE data/routes changed and no D2/D3 manual roster work overwritten. Evidence and rollback notes: outputs/direct-sheet-migration-2026-10-13/REPORT.md. Manual guide website instructions updated; full manual-week trial and independent setup gaps remain.

## 9 October 2026 — Standings presentation Job 2 (local, not published)

- Updated only `next/standings.html`: overall team names removed from visible labels while retaining team-logo backgrounds, accessible team labels, principals and Free agent team indicators. Principal text/desktop row sizing matches measured LIVE (12px/36px). Catalunya uses existing Spanish vertical-flag artwork without changing the displayed circuit name.
- Division constructors adopt the centred Past Seasons-style four-column Pos/Team/Pts/Gap table, preserving official points, positions and source tie-break order. Driver/result sizes and weekly points were already the same as LIVE and are retained. Nine checks pass against four real division fixtures; local desktop/mobile preview confirms layouts, internal weekly-table scrolling and no captured console warnings/errors. Evidence: `outputs/standings-presentation-2026-10-09/REPORT.txt` and PNGs. No Sheets, LIVE page, archive or configuration edits; not committed or published.

## 9 October 2026 — TEST standings accuracy fixes (local, not published)

- `next/standings.html` now reads Gap past Raw Points without treating repeated calculation headings as display columns. Driver cards derive Grand Prix starts, finishes, DNFs and reliability from published feature-race finishing columns, excluding sprints, DNS and blank future rounds. Legacy calculation rows remain a fallback; when neither source is available the summary is explicitly labelled as including sprints.
- Team Stats follows the same authoritative constructor standings order, including sheet tie-breaks. Displayed points and points per round exclude hidden ranking fractions. Cool Stats keeps five rows per card, uses stable ordering for equal values and displays tied ranks; stops at the second Driver/calculation header.
- Standings/stats panels share sheet reads for the current page visit; failed requests are evicted for retry and reloading reads fresh data. No spreadsheet data, configuration or LIVE page was altered. Eight scoped checks cover all four audited TEST division fixtures, session/count boundaries, stable ties and retry behaviour. Local browser preview verified Gap, Harrison's 12 GP starts, team order and ties on desktop/mobile, with no captured console errors. Evidence: `outputs/standings-accuracy-audit-2026-10-09/fix-validation.json`, desktop/mobile PNGs. No commit or publication performed.

## TEST v336–337 — 8 October 2026

- Results Entry now offers Preview adjusted results for feature and sprint races, including inside the ticket results popup. The local calculator uses exact milliseconds, adds/removes selected penalty seconds, reorders timed finishers and rebases all gaps against the new winner. Use these results stages the preview; Undo restores the prior order/times while retaining other edited values; the existing round save persists it.
- Reads ticket contributions from the existing Ticket Penalty Transfers ledger. Original additions, removals and appeal revisions are compared against amounts already included. Previously manually adjusted times require explicit confirmation; tracked adjustments cannot be silently added twice. Lapped drivers, DNFs and other untimed statuses remain for manual adjustment. Carryover corrections can be entered explicitly after checking Penalties due this round.
- Stores a compact receipt/journal as a note on the existing session Gap heading (G36/G93); no new sheets. Server recalculates and checks result/decision revisions before saving. Interrupted saves are reconciled against before/after fingerprints, rather than guessing whether seconds were included. Regular saves without a preview retain their existing read path.
- v337 handles the real ledger's round-prefixed licence labels, such as R13 Race and R13 Sprint Race. Tests now use the actual existing session normalizer and these labels.
- Pure/service tests cover Bahrain winner rebasing, simultaneous penalties, exact reversal, removals, sprint isolation, ties, DNFs/laps, stale decisions, repeated application, edited times and interrupted writes. Actual UI exercised with memory-only saves: use, undo, save, reopen (zero further delta), appeal removal and repeat check. Desktop/mobile inspected; no console errors. Existing results-performance, access (235 denial cases), served-bans and ticket-time-removal suites pass. The legacy all-app release check has the same three pre-existing failures as deployed v335: postseason duplicate navigation, obsolete include matching, obsolete owner-only assumption.
- Deployed v337 verified read-only against actual S28 D2 R13: tickets 1/4/5 each propose +5 seconds; Ulsterstig wins at 45:33.981, Hakejowe +0.102, SkyTheSenpai +3.237. Closing returns No unsaved changes. Screenshot and verification.json are in outputs/results-time-adjustment-2026-10-08.
- All 102 remote file hashes verified. Changed only ResultsEntryService, ResultsEntryClient, AccessPolicy, Index plus new ResultsAdjustmentService and ResultsAdjustmentClient. R13 result corrections remain pending; no actual race values or licences changed by this implementation task.


## TEST v325–326 — 2 October 2026

- Restricted Stewards & appeals now uses one selected ticket, a large reasoning editor and evidence/decision tabs on the same desktop screen. Mobile has evidence/judgement tabs. Colleagues' decisions are readable but have no editable fields or review revision tokens; the server pins all writes to the authenticated reviewer and validates under the existing lock. Appeals filter to appealed cases and include original ticket, defence, steward reviews and preserved original/published decisions.
- Background autosave no longer disables the editor or reloads/redraws the board. Versioned local snapshots keep keystrokes made during saves queued; switching tickets is local and can continue while saving. Round/side changes flush pending edits. Errors preserve input for Retry; explicit discard/reload supports stale-judgement conflicts. No polling or second ticket store introduced; Refresh decisions obtains colleagues' latest saved reviews.
- Initial round list/board uses one RPC. One-review saves return only changed cases and remove three whole-board reads; the 20-case fixture response fell 18,772 → 1,965 bytes. Actual Google latency remains unmeasured for real steward writes; access checks, audit and lock/Sheets work are retained. See outputs/steward-desk-2026-10-02/performance.json.
- Four files deployed and all 100 file hashes verified: StewardAccessClient.html, StewardAccessService.gs, TicketProcessingService.gs, Index.html. Own-column spoofing, permissions, colleague writes, stale evidence/votes, appeal-only writes, original decision preservation, delayed/failed saves, continued typing/navigation, and desktop/mobile layouts tested. Existing ticket-final-decision and autosave regressions passed. No real steward judgements changed.
- v326 adjusts only the editor's minimum heights so its completion control stays visible on shorter desktop screens; 1280×676 is now explicitly tested, alongside larger desktop and 390px mobile layouts.

## TEST v324 — 2 October 2026

- New-ticket intake now requires a separate explicit destination round, blank on opening each review or after batch processing. The remembered round remains for reviewing existing cases. Processing buttons name the destination; published rounds carry a warning and late-ticket confirmation. Attaching evidence to existing cases retains the selected case's round.
- Moved Swissking → Codemasters, TotalCeaser → Sparrow (with defence), and STR TotalCeaser → tylerjames2001 from S28 R7 rows 7–9 to new template-based S28 R8 Mexico rows 2–4. Preserved case/submission IDs and all case columns; retained original snapshots in Ticket History, updated submission links and round registry, and cleared original rows after explicit approval. Five completed R7 cases and their published outcomes unchanged on readback. No live sheets touched.
- TicketProcessingClient.html and Index.html deployed; all 100 file hashes verified. Regression covers remembered published round, blank destinations, cancellation, no write on selection, individual/batch imports, existing defence attachment, R1 preservation, and desktop/mobile overflow. Ticket workflow and final-decision browser regressions also passed.

## TEST v323 — 2 October 2026

- Removed time propagation from Results Entry qualifying defaults, including sprint qualifying; driver/tyre changes still fill empty tyre fields only. Existing times are untouched. Updated the accompanying help text.
- ResultsEntryClient.html and Index.html deployed to TEST; all 100 file hashes verified. Focused checks confirm blank/existing times and tyre defaults. No spreadsheet values changed.

## TEST v321–322 — 2 October 2026

- Expanded the in-place Results Entry penalties dialog to include qualifying and race bans from the existing Outstanding Bans ledger, including race-banned drivers absent from results. Due, earlier-round, unassigned and served labels distinguish what needs checking.
- One batch save records selected bans served at the chosen round/session, preserving original reasons/ticket markers and noting previous scheduled rounds. Existing website licence refresh is queued; race results and licence points are untouched.
- Saved-session checks reject contradictory participation, missing results, cancelled rounds, stale/already-served rows and invalid sessions. Sprint sessions are explicit. Results-read plus licences-write access is required to confirm. Dirty results disable confirmation but remain intact while checking, closing or retrying the popup.
- Local service and browser regressions passed, including batch saves, absent race drivers, DNQ qualifying, failed saves, desktop/mobile, access boundaries and existing carryover/appeal workflows. TEST deployments v321–322 verified against all 100 files; only LicenceService, ResultsEntryClient and AccessPolicy changed remotely.
- S28 has three unserved qualifying bans scheduled for R7 (RamboJambo51, rigd12, SW155K1NG). These were left unchanged pending confirmation of where served. No R8 results were altered.

Deployed browser verification: S28 D2 R8 (Mexico) displays rigd12’s R7 qualifying ban as Earlier round — check, together with his R6 20-second carryover. Return to results keeps the loaded round with No unsaved changes. The actual saved penalties were not changed. Batch-write behaviour was exercised in isolated fixtures, not by inventing served bans in S28.

## TEST v320 — 2 October 2026

- Fixed rename continuation being rejected by its own pending-job protection: the rename-only flag now encloses the real Season Planning workbook access, with cleanup on every exit. Other writes remain blocked until the rename completes.
- Save profile routes an active-season gamertag change into the preview instead of merely telling the user to find a different button. The preview now explicitly says no change has been saved and points to Confirm name change.
- Regression uses the real Season Planning helper; it reproduced the self-block before the correction and passes afterwards. Browser regression covers the Save profile entry route. Existing access and ticket completion regressions pass.
- Deployed/read-back verified `DriverRenameService.gs` and `DriverDatabaseClient.html`; no user upload or website push required.
- Completed the requested S28 Blazzed420#8088 → Tiggz9632 rename (70 fields). Reopened profile confirms new current name and retained old alias. Website D3 row exactly matches before except gamertag: still P3, 79 points. Initial transient Drive timeout had no pending job; fresh preview/confirmation succeeded. Multi-workbook rename remains slow.

## TEST v319 — 2 October 2026

- Results entry now opens outstanding time penalties in an in-place dialog. Opening, closing, slow responses and failed carry-over saves do not navigate or rerender the results form. Confirmation requires saved results and the matching next participation; the original one-rollover policy is unchanged.
- Driver Database profiles now offer an active-season gamertag-change preview and confirmation. Permanent Driver ID, race/team/seat assignments, points, formula cells, original evidence and historical seasons are preserved. Existing current-season identity fields, round entries, licences, ticket decisions and public snapshot names are updated; previous gamertags remain aliases.
- The Master’s `Gamertag Changes` journal is created only on the first confirmed change. Interrupted writes resume by checking old/new cell values. Other portal writes pause while a change is unfinished. Applied and checked ticket decision hashes are updated with the labels, avoiding reapplication of penalties; original appeal histories resolve confirmed aliases without rewriting evidence.
- Requires write access to drivers, maintenance, results, licences and tickets. No real gamertag or race data was changed during deployment. TEST deployment v319 read-back verified. Create `DriverRenameService.gs`; replace `DriverDatabaseClient.html`, `ResultsEntryClient.html`, `SeasonProtectionService.gs`, `TicketProcessingService.gs`, `AccessPolicy.gs`, `AccessService.gs`. Already deployed; no user copy/paste, website push or deletion needed.
- Tests: `tools/test-driver-rename.cjs`, `tools/test-rename-carryover-browser.cjs`, `tools/test-ticket-completion.cjs`, `tools/test-licence-carryovers.cjs`. Service and browser checks pass, including mobile wrapping, interrupted-save recovery and unchanged points/seats. The old broad release checker still reports its three pre-existing navigation/include/auth expectations; it predates the current authenticated portal.

## 2.27 — 14 September 2026

- Team principals now contains Applications, Voting and Confirmed teams. Staff Team Principal responses open in review modals; season-specific acceptance/rejection preserves the source and acceptance alone admits a candidate to voting.
- Named voter columns and Yes=1 / Maybe=0.5 / No=0 match Team Owner Voting S28; blanks are unanswered. Saved totals rank candidates without choosing winners or assigning teams automatically. Confirmed teams selects accepted candidates and retains existing saved assignments. Removed announcement preview.
- New private Master tables TP Applications, TP Voters and TP Votes are created on first relevant save. Stable application keys/snapshots, stale edits, response changes, duplicate/invalid entries, rollback and private-sharing protection covered. Staff source remains the TEST duplicate and must switch at go-live.
- Create PreseasonPrincipalSelectionService.gs; replace Index.html, PreseasonPrincipalsClient.html, PreseasonPrincipalsService.gs, PreseasonHubClient.html and WebsiteDataService.gs. Delete nothing. Local service/browser/release and related draft/track checks pass. See outputs/principal-selection-2026-09-14/DEPLOYMENT.md; live deployment pending.

## 2.25 — 14 September 2026

- Split Track draw and Team principals into separate preseason hub/sidebar entries. Team-principal controls, saves and copyable preview now concern teams only; obsolete race payloads cannot write Calendar. Updated the later draft prerequisite wording to the new screen name.
- New Track draw screen has Track pool and Prepared order & sprints tabs. The Master’s available reference tracks form the pool; a connected previous Master’s complete Calendar can mark omitted tracks as guaranteed, with manual review/overrides when no source is connected. Import retains current eligibility exclusions. Invalid/incomplete calendars are not used to infer omissions.
- Random selection includes all eligible guaranteed tracks, draws the remaining places without repeats, then shuffles the entire selection into round order. Preview/redraw performs no writes. Admins can adjust tracks/order and weekend types; sprint defaults are Modern Sprint on rounds 3/9/14/19 that exist. Track moves leave dates and sprint rounds fixed. Saves validate enough eligible tracks, feasible guaranteed count, no repeated selections and guaranteed inclusion.
- Save preparation writes only to a private Track Draw tab in the existing TEST Master, created on first save. It preserves Calendar, dates/ASR, team data, previous sources and website configuration. Saved preparation includes pool, source reference, order, weekends and timestamps. Stale writes/formulas/unrecognised layouts fail without discarding local edits. Added Track Draw to the private-Master sharing guard for later operational status.
- Six relevant suites passed: track draw, principals, season planning, principal draft, live draft and release. Includes guaranteed membership/positions, seeded repeated random-selection checks, round defaults, source reading, saved reload, stale saves, rollback, separate routing, mobile/desktop and publication boundaries. No live Sheet/config/deployment changes.
- Replace Index.html, PreseasonHubClient.html, PreseasonPrincipalsClient.html, PreseasonPrincipalsService.gs, PreseasonDraftService.gs and WebsiteDataService.gs. Create PreseasonTrackDrawClient.html and PreseasonTrackDrawService.gs; delete nothing. Deployment: outputs/track-draw-2026-09-14/DEPLOYMENT.md.

## 2.24 — 14 September 2026

- Completed drivers automatically leave the Bookings list on successful completion or refreshed data. All filters/searches exclude them; filters now cover All outstanding, Booked and Not booked. The editor closes and its displayed lap/booking fields clear after completion. Completed trials remains a non-clickable names/date list. Stored Sheet records are preserved; later permissions remain separate work.
- Time-trial service/browser suite and release checks passed, covering removal on load/save/refresh/filter/search, cleared editor, preserved records and pending-driver editing/conflicts. Replace only Index.html and PreseasonTimeTrialClient.html for this incremental change. No creation/deletion or live edits.

## 2.23 — 14 September 2026

- Replaced the below-page Completed rankings panel with a visible secondary Completed trials tab next to Bookings & recording. Owner clarified names only, with completion dates; the list is alphabetical and displays no ranks, lap times, averages or gaps. Removed the saved-averages/rank summary from the recording editor. Tab switching preserves unsaved edits.
- Added Completed at as column I in the existing Time Trial Queue, recorded on the transition to Complete and preserved on later edits. Clearing completion clears it; re-completing records the new transition. Earlier completed trials show Not recorded. Six/eight-column queues remain readable and upgrade on explicit save; opening performs no writes.
- Four suites passed: time trials (including timestamp lifecycle/legacy upgrade/tab retention/alphabetical order), intake, placement and release. Desktop/mobile checked. Lap-entry inputs and stored calculations remain available; this is a presentation change, not implementation of the later access restrictions.
- Replace Index.html, PreseasonTimeTrialClient.html, PreseasonTimeTrialService.gs and PreseasonIntakeService.gs. No files to create/delete or manual sheet edits. No live changes. Deployment: outputs/time-trial-tabs-2026-09-14/DEPLOYMENT.md.

## 2.22 — 14 September 2026

- Restored the original Applications table and full review pop-up inside preseason, adapted for profile linking, late acceptance and processing. Retains rejection, search, summaries, 50-row pagination and the pending badge/15-second updates. Processed/All filters retain saved application reviews after archiving.
- Processing saves permanent driver/aliases, tracker, TT queue and full application snapshot before automatically archiving the complete source response. Archive copies are verified before deletion. A failed archive offers Retry archive without repeating processing; interrupted append/delete retries avoid duplicate copies. Pre-existing processed active rows also offer Retry archive. Season-scoped rejection retains explicit delete confirmation and creates no downstream records.
- Disabled buttons no longer use a wait cursor. Actual saves display Saving; concurrent changes show a modal explanation and Reload application. Polling compares sorted identity fields instead of incidental registry metadata/row positions.
- Eight relevant suites passed: application review, application updates, intake, tracker, time trials, placement, allocations and release. Desktop/mobile reviewed. Includes missing-header/extra-column preservation, interrupted archive/delete, repeated retries, rejection and stale identity recovery. No live data or deployment changed.
- Replace Index.html, PreseasonIntakeClient.html, PreseasonIntakeService.gs and ApplicationService.gs. Create/delete nothing. See outputs/application-review-2026-09-14/DEPLOYMENT.md. Test response source remains configured; original-source cutover remains required at go-live.

## 2.21 — 14 September 2026

- After the owner deployed 2.20, verified the configured source is TEST duplicate of F1 Application (Responses), Form Responses 1. The live-source switch is explicitly recorded as future go-live work; no connection was switched.
- Reproduced the missing test applicant: Ancient Chap's A5 timestamp is a text value, 14/09/2026 08:02. Preseason now accepts validated UK/ISO text timestamps as well as native spreadsheet dates. Date boundaries remain enforced and visible, with excluded-row counts and readable timestamp/source errors.
- Added an awaiting-processing count on the Application processing tab and background reads every 15 seconds while the intake screen is visible. Viewing does not decrement the count. Updates retain tracker edits, selected application and current filters; concurrent record/profile changes require review/reload. Late responses from earlier loads are ignored. Source failure retains the last loaded list and marks the count unavailable.
- Diagnosed Archive row 1 as an applicant record, not headers. On an explicit archive action the service can insert missing headings above a native dated first response, preserving it, or extend an exact matching header prefix. Other mismatched schemas still stop the action. No archive or source cells were edited remotely.
- Seven relevant local suites passed: application updates, intake, tracker, time trials, placement, allocations and release. New tests cover native/text timestamps, the actual missing-row pattern, boundaries, polling, edits/selection, concurrent identities, stale responses, failures, badge counts and archive-header preservation/rollback. Desktop/mobile checked with synthetic data; S99 live verification awaits deployment.
- Replace Index.html, PreseasonIntakeClient.html, PreseasonIntakeService.gs and ApplicationService.gs. Create/delete nothing. Deployment notes: outputs/application-updates-2026-09-14/DEPLOYMENT.md.

## 2.20 — 14 September 2026

- Following the owner's walkthrough, restored previous-season import as the main tracker starting action. Manual entry is secondary. Tracker, Application processing and Statistics have separate views within the selected preseason.
- Restored previous-division/group/status/search filters, 50-row pagination, editable response/chase/platform/controller/commitment fields, notes, applicant classification, self-recording references and eligibility review markers. The table scrolls within its panel with sticky headings/names. Summary counts and percentages use the actual roster; overall totals do not double-count multi-division reserves.
- Upgraded the existing Applications Tracker schema on explicit save, retaining its first ten columns. Legacy processed entries retain status; re-import preserves responses/chasing/processing and carries platform/controller metadata. Manual response and application processing remain distinct. Unsaved edits survive tab/page/hub navigation and stale saves. Tracker commitment corrections reach placement; booking/completion remains managed by Time Trials.
- Added standalone Start new season navigation and renamed existing management Season archive. Removed the planning season selector; hub Season dates edits its selected season, and Start new season opens a fresh form. Included the previously pending 19:00 UK defaults for announcements and draft. This does not archive the previous season or implement publication.
- Twelve local suites passed (new tracker plus all prior preseason/release/history suites). Inspected desktop/mobile screenshots. Google services are mocked; no live Sheet or deployment changed.
- Replace Index.html, PreseasonIntakeClient.html, PreseasonIntakeService.gs, PreseasonPlacementService.gs, SeasonPlanningClient.html and SeasonPlanningService.gs. Create/delete nothing. Full upload links and instructions: outputs/tracker-workflow-2026-09-14/DEPLOYMENT.md.

## 2.19 — 13 September 2026

- The owner confirmed deploying Live draft and clarified that part-timers go to reserves, unpicked drivers go to free-agent teams/reserves, and full-team seats must be filled. They then specified that allocations can be completed division by division while other divisions continue drafting.
- Added Division allocations to the hub/submenu and an Allocate this division button to Live draft. Saved draft seats are fixed; unpicked drivers can be allocated to free-agent teams or reserves. Known part-timers default to reserves and are now excluded from the live draft pool. Empty free-agent seats are allowed; confirmation requires the selected division's principal turns and full-team seats to be complete.
- Season Allocations is created in the same TEST Master only on explicit save/confirm. Permanent IDs retain ownership; each division has its own confirmation and source/row revisions. Other divisions' normal draft/allocation progress does not invalidate a confirmed division. Shared reserves can have a tier in multiple divisions; competing regular-seat allocations are blocked. Saves merge under the script lock and roll back partial writes.
- Eleven local service/browser suites passed. Checks include PT handling, immutable saved picks, independent division revisions, stale same-division edits, empty free-agent seats, reserve eligibility, source/manual changes, failed-write recovery, privacy/history boundaries and desktop/mobile layouts. Google services are mocked; no real season, live spreadsheet or deployment changed.
- Deploy: replace Index.html, PreseasonHubClient.html, PreseasonLiveDraftService.gs, PreseasonLiveDraftClient.html and WebsiteDataService.gs; create PreseasonAllocationService.gs and PreseasonAllocationClient.html. Delete nothing. Actual division creation/population is next; public/principal access and season launch/archive transitions remain separate work.

## 2.18 — 13 September 2026

- The owner confirmed deploying Draft preparation and clarified that each principal chooses Tier 1 and Tier 2 together on the same turn. Built the admin Live draft screen using the saved per-division order and confirmed placement pools.
- Two selectable driver pools show PT/Maybe markers, search and availability. Confirm both drivers saves a pair together and advances that division's principal. Admins can select the division, correct an earlier pair without changing other seats, and undo the latest recorded turn. Exhausted tiers require an explicit open-seat checkbox; a seat cannot be left open while an eligible unselected driver exists.
- Draft Picks stores paired permanent IDs and name snapshots in the same Master, with revision metadata. Reads never create it. Stale/admin conflicts, invalid IDs/tiers/divisions, duplicate allocations, skipped turns, changed sources and manual edits are checked. Failed writes restore completed changes; a lost response requires refresh before retrying. Started drafts lock the principal order against replacement.
- Active-view polling refreshes every ten seconds, preserves pending choices on conflicts and stops confirming until refreshed. Presentation view shows saved draft information without editing controls, tentative choices or private source notes. It uses the existing admin session; no public/principal access or sharing was added.
- Ten local preseason/release/history suites passed, including paired selection, correction, explicit vacancies, concurrent admin updates, response loss after commit, manual/source review, rollback and desktop/mobile/presentation browser checks. No live season, spreadsheet, deployment, operational division or publication changed.
- Deploy: replace Index.html, PreseasonHubClient.html, PreseasonDraftService.gs, PreseasonDraftClient.html and WebsiteDataService.gs; create PreseasonLiveDraftService.gs and PreseasonLiveDraftClient.html. Delete nothing. Remaining work includes free agent/reserve handling before launch, division generation/population, public/principal access and season publication/archive transition.

## 2.17 — 13 September 2026

- Added Draft preparation to the preseason hub and submenu after the owner supplied Team Owner Voting S28 and confirmed that the first-picking principal is chosen randomly. The reference uses changing division orders and average pick calculations; several old arrangements are present, not a single authoritative current matrix.
- A random principal permutation establishes D1. Complementary division pairs and a balanced triple for odd division counts give equal average picks where mathematically possible, otherwise integer totals differ by one. All supported 1–12 principal / 1–8 division combinations are covered; one division is simply a random order. This generalises the reference's balancing approach rather than copying a historical matrix.
- Reads confirmed placement divisions and current full-team principals; explicitly excludes free agent teams. Displays tier/PT counts, each division's picking positions and average picks. Previewing is read-only, saving creates Draft Order in the same Master, and saved order text can be copied. A redraw requires an explicit action; navigation/refresh never redraws automatically.
- Source/manual order changes flag review while preserving the old draw. A valid unchanged arrangement can be confirmed after review without rerandomising. Saves validate unique teams/picks, current source revision and balance, with lock/rollback protection. Private-Master sharing protection includes Draft Order.
- All nine local preseason, release and historical-protection suites passed, including 960 mathematical checks and browser desktop/mobile flows. The planning test's expected active hub-button count increased from five to six. No real season, live spreadsheet or deployment changed.
- Deploy: replace Index.html, PreseasonHubClient.html and WebsiteDataService.gs; create PreseasonDraftService.gs and PreseasonDraftClient.html. Delete nothing. Tier 1/2 pick rules, live driver selection, principal access/stream presentation and launch remain to be agreed/built.

## 2.16 — 13 September 2026

- Built the season-specific Placement screen after reviewing the original template. The TT-ranked pool sits beside colour-coded division/tier columns, with a wide meeting view, adjustable tier sizes, Host/RC fields, driver selection/dragging, swaps, reserves, not-selected decisions and undo.
- Full-time / Maybe / PT / unknown commitment comes from processed applications by permanent ID. PT drivers are highlighted in pool, slots and details; optional season-only corrections preserve original answers. Driver details include TT averages/laps/notes, application commitment/reason, previous division, social observations and placement notes.
- Placement Drivers and Placement Divisions are created in the same Master on explicit save. Source refreshes never move decisions. Confirmation requires a disposition for each driver and at least one placed driver per division; changed sources/manual board edits invalidate the confirmation until review. Operational Master/division creation and draft remain later stages.
- Extended private-Master publication protection to the placement tabs. Refactored the TT response into a shared read-only helper, preserving existing calculations. No live season, workbook or deployment changed.
- All eight local preseason/release/history service and browser suites passed; inspected dense meeting and mobile screenshots. Deploy: replace Index.html, PreseasonHubClient.html, PreseasonTimeTrialService.gs and WebsiteDataService.gs; create PreseasonPlacementService.gs and PreseasonPlacementClient.html. Delete nothing.

## 2.15 — 13 September 2026

- Added Principals & tracks to the preseason hub/submenu, storing team choices and winning principal names in Teams & Principals and race track/weekend order in Calendar. Dates, All Star Race and team lookup formulas are preserved; divisions remain undecided. Partial details can be saved before the team count is known.
- Added saved announcement preview/copy, completeness guidance, reference-list choices, duplicate-team validation, intentional repeated-track support, stale-save detection, rollback and desktop/mobile checks. Voting itself remains the existing admin process, linked through Staff applications.
- Website review found that the current publisher shares the entire Master, and the website chooses the newest registered season as current. Added a publication guard for preseason/private-data Masters. A selected public-data export and independent preseason website route are required before website announcements or launch; neither is deployed or implemented here.
- All seven local preseason/release/history test suites pass. No real season or Google Sheet was created or changed. Owner confirmed Time Trials files were deployed, then explicitly reminded us no new season exists: do not ask for a live preseason check yet.
- Deploy: replace Index.html, PreseasonHubClient.html and WebsiteDataService.gs; create PreseasonPrincipalsService.gs and PreseasonPrincipalsClient.html. Delete nothing.

## 2.14 — 13 September 2026

- Added season-specific Time Trials from the Sxx Pre-season hub and submenu, with a back link. The existing Time Trial Queue now owns bookings, UK time, conducting admin, notes and completion; TT Results in the same Master owns tracks, lap inputs and formulas. No extra workbook.
- Retained the original SS.SSS entry convention and verified source calculations: exclude lap 1, average laps 2–5 per track, then average both track averages. Partial results remain provisional; completed trials with all eight scored laps enter rankings, with shared positions and positive gap to the fastest.
- Existing six-column queues are recognised and upgraded on save. Repeat application processing preserves the extended booking fields and results. Added stale-edit checks, formula/input validation, failed-save restoration, search, 50-row booking pagination and desktop/mobile verification.
- Local integration/browser tests and existing release, planning, intake and historical protection tests pass. Source template was read only. No real season, live workbook or deployment changed.
- Deploy: replace Index.html, PreseasonHubClient.html and PreseasonIntakeService.gs; create PreseasonTimeTrialService.gs and PreseasonTimeTrialClient.html. Delete nothing.

## 2.13 — 13 September 2026

- Enabled Applications & tracker from each preseason hub. Owner clarified that the first setup starts from scratch: manual driver addition is primary, linking an existing permanent profile or explicitly creating one. Previous-season import is optional and collapsed.
- Manual addition writes the season tracker only (plus a new registry profile/alias when requested). It does not mark an application processed or create a TT entry. Application processing links identity, updates the tracker and creates one awaiting-TT row per driver; repeat applications reuse that row and preserve its status/booking/notes.
- Added season-date scoping, late-application confirmation, current-name/alias/Discord suggestions, manual profile search and tracker matching, optional permanent gamertag update preserving aliases, green processed markers, revision checks and partial-write restoration. Removed TT completion controls from the global application inbox; existing historical columns/data remain.
- Added optional read-only roster previews from a previous Master or division Data name/reserve/retired columns, preserving existing statuses on import. No actual season, Google Sheet or deployment changed. Local service/browser tests and existing release/historical regressions pass.
- Deploy: replace Index.html and PreseasonHubClient.html; create PreseasonIntakeService.gs and PreseasonIntakeClient.html. Delete nothing.

## 2.12 — 13 September 2026

- Added a conditional Sxx Pre-season hub and expandable sidebar group, discovered read-only from Masters explicitly marked Preseason. Opening FAP does not create a season. Successful first save reveals the entry; refresh/reload discovers it again.
- Moved Start new season into Season Master and collapsed the legacy fixed-division setup under Advanced workbook setup. The dates screen has a season-specific back link; unsaved edits survive hub navigation and require confirmation before a new draft replaces them.
- Hub shows saved dates, its Master link and seven stages. Only dates are actionable. Applications/tracker is the next build, followed by the other agreed stages. Existing legacy workflows remain available separately.
- Local browser, release and historical protection checks pass. Replace Index.html, SeasonPlanningClient.html and SeasonPlanningService.gs; create PreseasonHubClient.html. No deletions, real workbook creation or live deployment in this change.

## 2.11 — 13 September 2026

- Added New Season date setup using the existing Season Master registry. Calendar owns race dates; Preseason holds UK deadlines, date rules and social Sundays. No separate planning workbook.
- Added editable defaults, shared save/reload, stale-edit detection and partial-save restoration. Existing Calendar tracks/weekend types and historical records are protected.
- New Masters leave divisions undecided and defer career registration. Existing operational Masters open without duplication; premature setup/repair actions are blocked.
- Recorded the agreed workflow in ai-pack/PRESEASON-WORKFLOW.md. Only stage 1 is implemented locally. Add two files and replace three for TEST deployment; no removals or real season creation in this task.

## 2.10 — 13 September 2026

- Cleared team-coloured fills in the connected reusable Division Template's Data!I2:N25 and made its body text black. All 17 tabs' cell contents, formulas, validations, merges, column definitions and conditional rules were preserved in before/after export comparisons.
- The reusable template already had no Historical Results Matrix. New-copy generation now explicitly removes an inherited matrix; completed historical copies are not cleaned or rebuilt.
- Added neutral seat-table formatting to template creation, template repair and new Division creation. DivisionTemplateService.gs is the only source file requiring a TEST Apps Script update. Live template formatting is already saved.

## 2.9 — 13 September 2026

- Driver Database now displays 50 profiles per page with a bottom page selector and Previous/Next buttons; all profiles remain searchable and reachable.
- Searching resets to page one; refreshes clamp the selected page if the result count shrinks. Career Records moved between the two summary boxes and the search bar.
- Only Index.html and DriverDatabaseClient.html need updating for this local change. Existing release and browser regression checks pass, including pagination, search, profile access and mobile layout.
- Separate new-season workflow and any Season Master rename remain for discussion with the owner; no season was created.

## 2.8 — 13 September 2026

- Simplified the Driver Database career panel to Career Stats / Accolades links, retaining setup and backup access under Maintenance.
- Moved statistics preview and verification to Season Master with a connected-season selector; reset previews and ignore delayed responses when the selection changes.
- Moved season repairs into selected-season maintenance, and template/connection setup into Setup maintenance. Historical restrictions and server code are unchanged.
- Made Modern the creation default and left the season number blank. No season was created. Five HTML files require a TEST deployment update.

## 2.7 — 13 September 2026

- Archived and removed the finished Full Stats identity import/preview, retired Historical Results Matrix implementation and dormant standalone Overall module.
- Removed the import panel and its binding from the active Driver Database; preserved profile maintenance and career/accolade links.
- Kept all historical protection and shared calculation services. This cleanup is local; its TEST deployment remains pending.

## 2.6 — 12 September 2026

- Protected completed Seasons 3–27 plus 7.5 from FAP writes, including indirect career refresh and historical round-edit triggers.
- Historical connection checks now only read existing links; historical edit, repair and discard controls are hidden or disabled.
- Retained historical viewing, manual Google Sheets corrections and future-season workflows.
- Source backup and regression tests added. Local implementation only; deployment remains pending.

## 2.5 - 7 September 2026

- Confirmed that the failed Season 21 Division 5 build was a temporary Google
  Spreadsheet-service interruption during round creation, not invalid season
  setup: the clearly labelled incomplete copy stopped after R13.
- Made generated round creation retry only explicit temporary Spreadsheet
  service failures and reuse an already-created named round on retry.
- Batched each round's constructor helper formulas into one write instead of
  ninety individual Spreadsheet-service calls, reducing generator load without
  changing any formula or visible workbook behaviour.

## 2.4 - 7 September 2026

- Recorded the deferred requirement for an administrator-facing permanent
  driver profile merge workflow. The registry already has merge storage and
  redirect-aware readers, but the active Driver Database UI has no merge
  action yet. Implementation is deliberately deferred.

## 2.3 - 6 September 2026

- Corrected the confirmed historical fastest-lap bonus window to Seasons
  20–25 inclusive; the Main/Feature Race, classified top-ten and one-point
  restrictions remain unchanged.
- Corrected generated Legacy Sprint weekends to use Qualifying, Sprint Race
  and Feature Race, while retaining a hidden compatibility grid for the
  established vertical workbook calculations.
- Corrected Legacy Sprint pole, driver-stat, constructor and licence sources
  to use the real qualifying session rather than the Sprint Race grid.
- Corrected Results Entry detection of the `Legacy Sprint` calendar label and
  replaced copied `#REF!` driver validation with the generated driver list.
- Allowed a recoverably binned TEST Division workbook to be generated again
  without introducing another reset or repair button.
- Corrected the Season Master list and connection check so that a binned
  Division displays its normal Create action instead of a stale Open action.
- Replaced per-Division Drive bin checks with one targeted query and made the
  browser wait and recheck registration after a long Division build, avoiding
  both a slow Season Master list and false `not registered` failures.
- The normal Create Division action now adopts one exact, completed and
  unregistered workbook beside its Season Master after validating its season,
  division and round tabs; it stops on duplicate ambiguity and never creates a
  second copy in that case.

## 2.2 - 5 September 2026

- Recorded the exact restoration and content verification of all 69 Season
  1–19 Division workbooks after the unsafe live formula rebuild.
- Retired the Historical Results Matrix from new workbooks, active FAP actions
  and Division formula dependencies while preserving existing matrix tabs.
- Replaced live clearing/rebuild repair with a current-template, backup-first,
  formula-only repair plan which never writes non-formula cells or changes tabs.
- Changed the historical audit basis to R tabs, standings, statistics and career
  exports, with manual overrides reported rather than automatically rejected.
- Recorded that these source changes remain local and undeployed.

## 2.1 - 4 September 2026

- Removed automatic per-workbook backup copies from routine historical Division
  formula repair after the controlled Season 3 Division 1 verification. Google
  Sheets version history and the existing audit exports remain the recovery
  routes; confirmed matrix-to-R-tab conversion retains its verified backup.
- Replaced the invalid Seasons 1–19 audit findings with the corrected
  formula-versus-historical-data audit.
- Recorded the constructor helper column repair and name-matched Driver Stats
  calculation.
- Recorded the preservation-safe Historical Results Matrix upgrade for final
  points, optional tie-breaking positions, count statistics and comparison
  outputs.
- Recorded the owner's deployment and the successful controlled repair of
  Season 3 Division 1. The subsequent no-extra-backup adjustment remains local
  until the owner pastes and redeploys the changed files.

## 2.0 - 17 August 2026

- Added the TEST-only permanent driver registry foundation.
- Recorded that permanent identities live outside individual seasons and use
  stable `driver_id` values plus separately recorded aliases.
- Recorded recoverable archive and preservation-safe merge behaviour.
- Replaced ambiguous driver archiving with reason-required quarantine for
  mistaken or invalid profiles; former drivers remain active identities.
- Confirmed that historical import remains disabled until it can be tested
  separately, with manual driver and alias entry retained as the fallback.
- Added the TEST application-intake schema, public/private field separation,
  dummy submission workflow and minimal gamertag-based decline retention.

## 1.9 - 17 August 2026

- Added the read-only permanent driver-history source and identity audit.
- Recorded current and historical coverage for aliases, standings, teams,
  statistics, Team Principals, ASR participation and season bans.
- Recorded the existing Hall of Records matching, row-offset and season-block
  weaknesses without changing the public site.
- Defined the source-linked, completeness-aware permanent profile model and
  safe migration sequence.

## 1.8 - 17 August 2026

- Recorded the distinction between permanent F1XL driver IDs and season-specific real-world car numbers.
- Recorded that car numbers repeat across divisions and remain in generated backup Sheets.
- Recorded the TEST-only Teams & Seats workflow and schema 0.8.0.
- Defined the permanent driver-profile scope, alias/merge requirements and excluded history.
- Recorded the future requirement for public team histories.

## 1.7 - 16 August 2026

- Replaced the all-division board with a compact one-division-at-a-time view.
- Added ordered Tier 1, Tier 2, Tier 1 Reserve and Tier 2 Reserve groups.
- Recorded Yes/Maybe as full-time and the eligibility rules for No-commitment reserve drivers.
- Extended the test schema for commitment, individual time-trial laps, driver type and placement order.

## 1.6 - 16 August 2026

- Added the restricted provisional Division Placement board.
- Added drag-and-drop placement and a compact dropdown alternative.
- Kept placement cards limited to the agreed essential information.

## 1.5 - 16 August 2026

- Added the Yes, Maybe or No every-race commitment answer to application profiles and the tracker design.
- Recorded the compact requirements for the future restricted Division Placement tab.

## 1.4 - 16 August 2026

- Recorded the three-tab Application Centre structure.
- Recorded clickable applicant profiles, permanent-driver linking and embedded gamertag history.
- Recorded two five-lap trials and narrower access for time-trial results.
- Recorded tracker division, status and search filters.

## 1.3 - 15 August 2026

- Recorded the agreed streamlined Application Centre tracker.
- Recorded automatic loading of previous-season drivers and application-to-driver matching.
- Recorded that team information and the legacy `Sheet11` tab are excluded.

## 1.2 — 15 August 2026

- Recorded the shared pending-application inbox and notification badge.
- Recorded that accepted applications move into restricted processing while declined dummy applications are deleted.
- Recorded contextual season navigation, draft dates and the automatically calculated two-day application deadline.

## 1.1 — 15 August 2026

- Recorded the beginning of the isolated F1XL Control Centre test application.
- Recorded that its first active workflow is a configurable Start New Season plan.
- Recorded the deliberate separation between the test application, live Sheets and public website.
- Recorded that no Apps Script project, Google Drive test folder or live deployment has yet been created.

## 1.0 — 14 August 2026

- Created the AI Project Handover Pack.
- Created the New Owner Quick-Start Pack.
- Recorded the current website architecture and public data sources.
- Recorded the current Season 28 configuration and historical configuration registry.
- Recorded project principles, known risks, testing, backup and recovery guidance.
- Recorded the weekly documentation-review policy.
## 9 October 2026 — TEST Audi tier correction

Restored current BigG3991 Tier 2 and VERSTAPPEN95 Tier 1 on owner instruction, with corresponding D4 Audi seats, assignment history and public roster/stats refreshed. R14 audit movements preserve completed race history; both driver points and all 21 D4 race tabs verified unchanged. No LIVE changes or deployment.

