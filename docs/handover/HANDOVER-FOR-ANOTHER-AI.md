# F1XL — handover for another AI

Edition: 6 November 2026, pack 3.0. Generated from the maintained topic documents. Start with the first four sections; use the topic index for later detail.

This is a self-contained current briefing, not credentials or a complete live-data backup. The full handover folder adds preserved older notes, a dated Portal source reference and launch evidence. If attached alone, links to those files require the folder; the explanations here remain usable. The old chat is not needed to understand the core rules and decisions. Do not treat archived approvals or this briefing as authority to make changes.

## Contents

1. PACK-VERSION
2. START-HERE-AI
3. CURRENT-STATUS
4. PROJECT-PRINCIPLES
5. KNOWN-ISSUES
6. ARCHITECTURE
7. DATA-SOURCES
8. LEAGUE-RULES-AND-EXCEPTIONS
9. TICKETS-AND-PENALTIES
10. ROLES-AND-ACCESS
11. PRESEASON-WORKFLOW
12. WORKFLOWS
13. STATISTICS-AND-HISTORY
14. DISCORD
15. DECISION-HISTORY
16. OPERATIONS
17. RESULT-IMPORT-VALIDATION
18. TESTING-CHECKLIST
19. BACKUP-AND-RECOVERY
20. TRANSFER-AND-MAINTENANCE
21. EVIDENCE-AND-COVERAGE
22. CODE-MAP
23. GLOSSARY


---

Source: PACK-VERSION.md

# Pack version

- Version: **3.0**
- Refreshed: **6 November 2026**
- Scope: current live system, owner decisions and exceptions, historical context, succession and recovery.
- Website baseline: main, published commit **916a0c44e75e07e7cab21ec63560ecc86147d90c**.
- Website switch commit: **fb20b9ae6469daf2af48969d96672942c45db0e8**.
- Portal baseline: published **v409**, 121 files; parity verified 6 November at 11:35 UTC.
- Operational data checkpoint: S28, four divisions, reconciled through R15. No R16–R21 result inputs at launch.
- This refresh: documentation/reference packaging only; no production code deployment, spreadsheet change, permissions change, bot message, commit or push.
- Exact pre-refresh files: [preservation manifest](archive/2026-11-06-before-refresh/preservation-manifest.json).
- Source-reference hashes: [Portal manifest](reference/portal-v409/manifest.json).
- Selected live-switch evidence: [release record](reference/launch-2026-11-06/release.json).

Version numbers and counts above are dated checkpoints. A successor must inspect the actual deployed version and current data before changing them. The old v2.27/September front matter is superseded.


---

Source: ai-pack/START-HERE-AI.md

# Start here — replacement AI

This pack is designed to let you continue without the original conversation. The owner runs F1XL and is not a developer. The objective is a simple, fast league administration system, backed by manually usable Google Sheets, with a public website that preserves the league's history and established URLs.

## Read this first

1. [CURRENT-STATUS](ai-pack/CURRENT-STATUS.md): what is live, verified and not currently being changed.
2. [PROJECT-PRINCIPLES](ai-pack/PROJECT-PRINCIPLES.md): how to work with the owner and avoid repeating rejected approaches.
3. Select the relevant topic below. Read its rules **before** touching code or data.
4. Inspect the actual repository and relevant deployed source/data read-only. Identify drift since this dated pack; do not treat the pack as a live API response.
5. Give the owner a brief account of what you found and the next useful step. Do not resume a past “go”, reset, release, consent or deletion as if newly authorised.

**The website switched on 6 November 2026. /next/ is now a compatibility route, not an isolated test environment. TEST in a property/function name does not make an action safe for disposable testing.**

## Which topic to read

| Task | Read |
| --- | --- |
| Sources, Google IDs, website routing | [ARCHITECTURE](ai-pack/ARCHITECTURE.md), [DATA-SOURCES](ai-pack/DATA-SOURCES.md) |
| Any sporting/data change | [LEAGUE-RULES-AND-EXCEPTIONS](ai-pack/LEAGUE-RULES-AND-EXCEPTIONS.md) |
| Applications, TT, draft, season setup, ASR | [PRESEASON-WORKFLOW](ai-pack/PRESEASON-WORKFLOW.md), [WORKFLOWS](ai-pack/WORKFLOWS.md) |
| Tickets, appeals, penalties, licences | [TICKETS-AND-PENALTIES](ai-pack/TICKETS-AND-PENALTIES.md) |
| Historical statistics, identities, track/team records | [STATISTICS-AND-HISTORY](ai-pack/STATISTICS-AND-HISTORY.md), [RESULT-IMPORT-VALIDATION](ai-pack/RESULT-IMPORT-VALIDATION.md) |
| People, permissions, TP/coordinator/reviewer views | [ROLES-AND-ACCESS](ai-pack/ROLES-AND-ACCESS.md) |
| Discord and alerts | [DISCORD](ai-pack/DISCORD.md) |
| Designs, reasons and superseded choices | [DECISION-HISTORY](ai-pack/DECISION-HISTORY.md) |
| What to do next / what not to reopen | [KNOWN-ISSUES](ai-pack/KNOWN-ISSUES.md) |
| Release, speed changes, regression checks | [OPERATIONS](ai-pack/OPERATIONS.md), [TESTING-CHECKLIST](ai-pack/TESTING-CHECKLIST.md) |
| Another account, recovery, backups | [BACKUP-AND-RECOVERY](ai-pack/BACKUP-AND-RECOVERY.md), [TRANSFER-AND-MAINTENANCE](ai-pack/TRANSFER-AND-MAINTENANCE.md) |
| Earlier nuance or a disputed previous claim | [historical index](archive/HISTORICAL-INDEX.md), [evidence guide](ai-pack/EVIDENCE-AND-COVERAGE.md) |

## Authority and confidence

Current owner instruction governs task scope. Explicit sporting rules/confirmed exceptions govern interpretation; flag conflicts rather than rewriting them to fit data. Fresh verified sources establish implementation facts. The latest dated current documents supersede archived proposals. An old assistant conclusion is not proof, and a screenshot is not a database audit.

Use these labels when updating the pack: **Owner decision**, **Verified implementation**, **Recorded previous verification**, **Parked/rejected**, **Unconfirmed**. “Built”, “deployed”, “published”, “visually checked”, “owner accepted” and “fully exercised on genuine work” are distinct.

The source reference contains the 121 files verified as v409. Names such as DivisionDataServices and PreseasonPreperationService are real remote names, including historical spelling. Fetch fresh HEAD and published content before deploying; do not bulk-upload the local admin-app folder or this old reference.

## First response on a new account

Recommend a suitable model/effort before substantive new work; the owner chooses the switch. Confirm what files/access you actually have, current branch/dirty state, and whether the live baseline has changed. Explain only the implications the owner needs. If a connector is missing, continue safe local work and state the exact missing capability; never assume a different account inherits Google/GitHub/Discord sessions.

This pack is context, not authorization to send messages, alter roles, spend money, expose private data, close a season or rerun old maintenance scripts.


---

Source: ai-pack/CURRENT-STATUS.md

# Current operational state — 6 November 2026

## Live switch complete

- Public website: https://f1xl.co.uk/ — established public URLs retained.
- Staff entry: https://f1xl.co.uk/admincentre/ — intentionally off public navigation.
- Previous website: https://f1xl.co.uk/legacy/ — labelled reference, noindex, original sources retained.
- /next/ page links redirect to production, preserving query/fragment. **/next/fap-google-return.html remains the working Google sign-in callback.**
- Portal v409, 121 files, same project/deployment/owner/scopes. No new service introduced.
- 153 connected new-system workbooks/templates renamed from TEST to FAP. IDs and sharing unchanged by those renames; original historical/live source workbooks were not renamed.
- Real combined intake was already active on 3 November. The new ticket Form and existing application/staff/TT Forms keep their connected destinations.

## Data and checks at the switch

S28 has four divisions. The R1–R15 reconciliation includes D3's R14 rerun, tickets, appeals and confirmed ban/carryover decisions, with accepted differences from old LIVE retained. The last readiness checkpoint recorded 1,094 race rows, 155 applied cases and 36 appeals. Those are audit counts, not expected permanent constants.

The final bounded delta check found no new changes to previously verified R15 ranges. It did not establish that every cell outside those ranges was unchanged. Fresh backup comparison covered 169,852 input/formula cells in eleven private recovery copies.

Actual publication checks verified 61 published release files and all 18 established sitemap routes. The new source feeds returned four divisions in direct_division_v1 mode, 841 career rows, 1,502 honour rows and 216 track records with no feed error notes. These counts demonstrate the dated load, not blanket proof that every historical statistic is knowable.

Owner confirmed staff/phone checks on 5 November after v408. Launch browser checks confirmed owner entry, active S28 hub, result/standings loads, no unprocessed ticket submissions and R15 “Round complete”. No fabricated operational submission or save was performed. A final attempted phone-size screenshot did not actually apply the narrow viewport: it is not new mobile proof.

Evidence: [release](reference/launch-2026-11-06/release.json), [Portal parity](reference/launch-2026-11-06/portal-final-verification.json), [public publication](reference/launch-2026-11-06/public-publication-verification.json), [feeds](reference/launch-2026-11-06/public-feed-verification.json), [backup comparison](reference/launch-2026-11-06/backup-content-verification.json).

## Immediate continuation

Normal Portal operation can continue. There is no continuing launch freeze and no outstanding instruction to wait for all staff to join. Observe the next genuine weekly workflow and fix a reproducible fault if one occurs; do not manufacture a new full audit to keep busy.

Current handover update is documentation only. No post-launch operational data was changed during it. The dated snapshot cannot promise no newer submissions/results exist when another AI reads it.

## Boundaries that must remain intact

Private Master, People and Registry stay private. Public division workbooks and selected Config views are deliberate. Ticket Write Up public sharing was corrected to reader, preserving named editors and Portal owner writes. Current manual sheet updates feed public readers without a separate duplicate-public-workbook publishing step.

Old books and /legacy/ are recovery/reference assets, not the second place to enter new results. /next/ and TEST-named code are not disposable sandboxes. More staff can be onboarded later without moving the site again.

Discord standings/team/calendar jobs retain their schedules; only source pointers changed at launch. Portal-controlled private runner exists. Application-alert route is OFF with no assigned recipient. Review/appeal/TP Discord alerts were dropped. Firebase is rejected.

The authoritative open/deferred list is [KNOWN-ISSUES](ai-pack/KNOWN-ISSUES.md), not the old launch plan. The preserved running log is in [the archive](archive/2026-11-06-before-refresh/ai-pack/CURRENT-STATUS.md).


---

Source: ai-pack/PROJECT-PRINCIPLES.md

# Owner principles and working style

These are owner decisions extracted from the conversation, not generic advice.

1. **Make the job easier than Sheets.** The Portal is valuable only if routine work is clear and fast. The owner has repeatedly said slow saves/loads could make it not worth using. Prefer fewer round trips, focused/background saves, retained state and useful next/back links. Do not remove integrity checks merely to report faster timings.
2. **Sheets remain usable manually.** They are an operational fallback, not just unreadable storage. Multiple workbooks are acceptable if that helps, but no unnecessary copies, publication steps or complicated databases. Database migration and overnight-only synchronization are not approved.
3. **Assume a first-time operator.** Make actions, purpose, save state and next step obvious without walls of explanation. Do not add a hub inside a hub when a simple tab suffices. Keep technical connection/workbook links in maintenance where appropriate.
4. **Preserve data and identity.** Protect original history, literal corrections, permanent driver/case IDs, movement history, appeal reversals and raw submissions. A failure to join a record is not permission to invent one or merge similar names.
5. **Separate public access from staff authority.** Public pages need no account. Staff use Google identity and server-side roles. Ordinary admins can assist across routine jobs but confidential allocations, maintenance and permissions remain restricted.
6. **Keep costs and dependencies minimal.** No Firebase. Cloudflare relay was explored but not approved. Do not promise “free forever” for third-party services. Existing GitHub/Google/Discord infrastructure is preferred, with its real limits stated.
7. **Recommend model and effort before substantive work.** Let the owner switch; do not pretend to change it yourself. Use the cheapest reliable current option. As of this refresh, Astra High was selected for nuanced multi-source reconciliation; Sol High suits scoped implementation and routine follow-up. Reassess models when available options change; old Terra/Sol recommendations are not timeless policy.
8. **Act within existing authorization.** Do not repeatedly ask to do already-approved routine steps. For a genuinely new consequential scope, prepare a concrete reviewable change first. An old approval in the archive is not standing authority for new destructive work. Explain an actual approval block and its source plainly.
9. **Communicate concisely.** Main outcome first, plain words, small numbered steps for the owner. The owner can be tired/unwell and has said huge inventories are not useful to read. Keep detailed evidence for the AI; avoid jargon, mystery “snapshots” and speculative task lists.
10. **Protect discoverability and design continuity.** Preserve established public URLs, sitemap/canonical behavior and readable content. Staff entry stays off public menus. FAP is fine internally and as a workbook prefix; use Admin Portal and admincentre externally.
11. **Do not create unsolicited notifications.** Role-relevant information in the TP hub is not a request for Discord posts. Parked/rejected ideas stay that way.
12. **Finish verifiably.** Distinguish local edits from deployed Portal, committed source from pushed website, and fixtures from actual user transactions. Preserve unrelated dirty work; never stage all files by default. Keep handover current after material changes.

## Historical incident that explains the caution

A 4 September formula repair cleared/rebuilt derived historical ranges and overwrote manually preserved literals/formulas. The 69 S1–S19 division books were restored to the owner-selected pre-repair cutoff and compared exactly. Therefore “calculated” does not mean disposable, and manual historical overrides may be the only surviving authoritative facts. Historical Results Matrix was retired; do not revive it or perform blanket formula regeneration. Current template repair is intended to recognise and replace formulas only with backups and exact range checks.


---

Source: ai-pack/KNOWN-ISSUES.md

# Open work, deferred work and resolved traps — 6 November 2026

## Useful next work

1. **Follow the first genuine post-switch weekly cycle.** Check a real application/TT/placement, results, ticket/appeal completion and public readback as those occur. Don't create fake records in production or reopen the whole readiness audit by default.
2. **GitHub Discord connection expiry.** The configured token was due to expire 14 November 2026. Confirm current status with the owner and renew privately if still needed. Don't conflate this with Google sign-in.
3. **React to demonstrated faults.** Preserve unsaved editing, verify source/data vs presentation, and make the smallest justified correction. Do not invent another blocker list just because the switch is finished.

No unresolved launch blocker was recorded after the 6 November completion. This is a dated statement, not a claim future submissions/workflows cannot reveal a defect.

## Deliberately deferred / optional

| Item | Boundary |
| --- | --- |
| Manual spreadsheet readability/instructions | Improve over time; seven Master overall-principal labels and obsolete manual-publication help remain deferred. Public direct tables unaffected. |
| Legacy trigger housekeeping | Two unavailable-source leftovers were observed. Inspect ownership/target first; preserve current and legitimate historical triggers. |
| Performance | Major passes complete; further investigation parked after diminishing returns. Measure real operations before changing code. |
| ASR | Framework present; richer content, adaptable presentation and full event rehearsal later when needed. |
| Next preseason/end-season rehearsal | Improve stage 8/9/launch signposting during the next real cycle; exercise closure with preview/simulation before actual season close. |
| TP track library and guides | Structure accepted; specific content can be developed later. |
| More historical facts | Fill only with evidence; unknown early metrics/principals are coverage limits, not automatic defects. |
| Application Discord messages | Built/private proof, OFF until explicit recipient/channel setup. Not required for league operation. |
| Weekly-show information hub | Idea only; not commissioned. |
| Accepted-applicant welcome follow-up | Parked. |
| Poster generation / ChatGPT integration | Much later, explicitly low importance. Dates-copy popup is already the separate implemented requirement. |
| OneDrive/old backup cleanup | Read-only audit done, no broad deletion. Retain recovery evidence; user dislikes needless files but recoverability matters. |

## Dropped or rejected — not pending

Firebase, unapproved Cloudflare relay, in-Portal notification feed, automatic steward-ready/appeal-ready/TP Discord posts, forced driver departure workflow, unnecessary duplicate public workbook publication and a generic external database migration.

## Old warnings that must not be revived as present defects

- Sprint time-penalty badges were verified working on 22 October; the earlier missing-display note is closed.
- Driver streams directory exists and was simplified to three columns on 4 November.
- Head Steward covers appeals; Admin maintenance/reference restrictions and TT landing were deployed v408 and owner accepted.
- Staff/phone walkthrough is owner-cleared as of 5 November, not waiting for everyone to register.
- Real combined intake and improved ticket Form already active before website switch; do not reconnect/reimport it.
- 153 FAP renames and public switch are complete, not merely prepared.
- DH profile/season-entry catch-up and R14 rerun were completed; don't resume old pending questions.
- S27 Reserve rows are legitimate and labelled; do not delete them.
- TEST history-not-connected/snapshot problems were followed by feed/registry work and final successful feed checks. If such an error recurs, investigate current routing/cache/version; don't assume it remains unfixed from October.
- Old source benchmarks with known baseline assertion failures are not evidence of a new production failure. Use current inputs and compare baseline behavior.

## Limits of this refresh

The handover was reconciled against the supplied conversation, preserved local notes, launch reports and verified-source payload. It did not rerun every product test, log in as every role, enumerate every external scheduler or reopen every historical Sheet. It preserves the detailed logs to support further targeted investigation. No full transcript beyond what was available was independently recovered.


---

Source: ai-pack/ARCHITECTURE.md

# Architecture — live baseline v409

## Components and direction of data

Google Forms → real combined Tickets & Apps inbox → protected Apps Script Admin Portal → working season/ticket/identity spreadsheets → public website readers.

The public website is static HTML/JS on GitHub Pages in F1XL2010/f1xl2010.github.io, branch main, custom domain f1xl.co.uk. It reads Google CSV/public views and narrow Apps Script JSON feeds. It does not contain staff credentials or directly write league data.

The Portal runs in the existing Google Apps Script web app. Google sign-in identifies staff, People & permissions controls access, and the backend executes Sheets operations as the F1XL owner. A user's internal audit identity and Google's file-writing identity are therefore different.

## Storage boundaries

- Private Season Master: season setup, entrants, tracker/TT/placements, movement/administrative records, licences/ban administration and season coordination.
- Four public-readable S28 division workbooks: per-round input, historical team/seat attribution and calculated tables/statistics. Do not make the Master public to solve a reader issue.
- Separate Ticket Write Up: processing, reviews, final outcomes, appeals, case/transfer history and Website Export.
- Private permanent Driver Registry: permanent IDs/aliases, historical statistics/honours and track-record tables. PublicHistoryService and TrackRecordsService return selected public data only.
- Private People & permissions: staff identity, roles, assignments, exceptions and audit.
- Public Website Config: routing and selected live views imported from Master. This is not a second manually published copy of all season data.
- Real combined Tickets & Apps: multiple form destinations and archives. Preserve unrelated/F2 tabs and receipts.

## Why saving no longer means copying everything twice

Earlier designs wrote a separate public season copy. That added latency and made manual Sheets operation confusing. The approved direct-source change uses division workbooks directly and selected Master ranges through Config IMPORTRANGE views. Portal changes and manual edits therefore reach website readers after recalculation/fetch/cache delays. There is no requirement to click Portal Publish after every manual edit.

This does **not** make a manual edit equivalent to executing every Portal workflow. Formula-derived standings can recalculate; identity reconciliation, ticket/appeal ledgers, ban state and exports may need the corresponding manual procedure. Google Form driver-choice synchronization is service code, not an automatic effect of typing into an arbitrary cell. Diagnose each path rather than promise every edit instantly updates every integration.

Config S28's season_master_sheet_id intentionally points to the public Config workbook, **not** the private Master. Gids 22801001–22801008 are selected public views. This alias is deliberate.

## Protected URL/cache behavior

- Established root page paths are production. /legacy/ preserves old pages and sources, with noindex and current-page escape links.
- /next/ counterparts redirect to root. The Google return page /next/fap-google-return.html is the exception and must stay unchanged.
- /admincentre/ points at the same Portal deployment; keep it off public navigation/sitemap.
- Service worker keeps a release-specific shell cache. Public-history and track-record feeds are network-only; callback responses must not be cached. Updates must not force a reload over unsaved work.
- Keep _config.yml exclusions for docs/handover, admin-app, outputs, tools, scripts and dependencies. They are not public site content.

## Code reference and safe deployment

[The v409 reference](reference/portal-v409/manifest.json) was packaged from the payload verified against published source on 6 November, not from the potentially stale admin-app directory. It includes 121 files, including actual remote naming quirks. Treat it as dated evidence. Fetch current HEAD, published source and deployment before changes, preserve untouched files, and publish a selective reviewed release.

Current code retains TEST-named functions/properties/environment guards for compatibility and accepts TEST/FAP workbook names. Do not rename keys, drop guards or run TEST cleanup because of the wording.

See [DATA-SOURCES](ai-pack/DATA-SOURCES.md) for exact IDs; [OPERATIONS](ai-pack/OPERATIONS.md) for deployment and performance boundaries.


---

Source: ai-pack/DATA-SOURCES.md

# Operational source map — 6 November 2026

These IDs are routing information, not credentials. Names can change; verify identity by ID and current configured mapping. All rows below describe the live promoted system unless explicitly labelled old.

| Purpose | Workbook ID | Access / notes |
| --- | --- | --- |
| Website Config | 1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg | Public reader. Main gid 0; S28 gid 941487775 |
| S28 Master | 1ArcaVzI-2qTsaPmPI8IK8_pRCCVgs92wPwnq_ZncO-c | Private |
| S28 D1 | 1WyjXsSmmvX_5f_reIo71jlDKURiqKuhoV0h4b4gfTJg | Public reader |
| S28 D2 | 1IyyIjJrKUdmGtUy7oTWHUVss9TG9-GtjRTSXA_zyoBw | Public reader |
| S28 D3 | 1p0wdsZ3z41czUtGVLcT_afv8y9p7FzQ8Nma0d93YcD0 | Public reader |
| S28 D4 | 1aGiR3WLHatf9eiI_uM2jFEOwkPwMZ8u5FChb7obWxLE | Public reader |
| Ticket Write Up | 1xW2UqxG2joO1gpsUZobMM2qkTFDPLsZZQ78TvsmnlbI | Public reader; Website Export gid 1683645163 includes admin decisions |
| Permanent Driver Registry | 1Cn6FdLGjzrFpjXPyrd0ZimC46ieXDrdkPgez1TlS3-M | Private; public data through narrow JSON feeds |
| People & permissions | 1bcARUCd0sX3SwO9aXLtFdSRwl0sz2ySW6aCHuH5E588 | Private |
| Reference Data | 1_oomGdM8cKiah7jPjHc7PokEp3svQ_mhgfkvURIBjlI | Maintenance-controlled |
| Real Tickets & Apps intake | 1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ | Real multi-purpose response/archive workbook; do not replace |
| Historical team/principal source | 1f2ECx5qJxc18vFq62yUtdn_Hif6o0c-o_oibo6Pfwd8 | Legacy team facts; Seasons gid 0 |
| Historical ASR index | 1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk | Old Config deliberately retained for ASR gid 925717407 |

Public CSV pattern: https://docs.google.com/spreadsheets/d/WORKBOOK_ID/export?format=csv&gid=TAB_ID. Read current headers/layouts, not a guessed range from an old pack.

Selected Master-derived public views in Website Config are gids 22801001–22801008: teams, calendar, licence summary, bans, penalty guide, movements, overall and weekly views. The S28 season_master_sheet_id is deliberately Config's public ID. Current results/tables use direct_division_v1. Historical season routes must remain season-specific; don't replace them with S28 connections.

## Combined intake tabs

| Tab / function | GID |
| --- | ---: |
| Improved ticket FormResponses6 | 546580155 |
| F1 Apps | 278899100 |
| Legacy F1 Tickets | 2140272460 |
| Staff Apps | 1200436264 |
| TT Submission | 602943702 |
| F2 Apps | 1168768636 |
| F1 Apps Archive | 2137215564 |
| Tickets Archive | 154195707 |
| F2 Apps Archive | 1638862917 |

Current property names: F1XL_INTAKE_CONNECTION_PROFILE=combined and F1XL_COMBINED_TICKET_FORM_SHEET_ID=546580155. Historical source/receipt identifiers are not to be reset on a rename. Reconnecting a Form can create a new response tab even in the same workbook; always read back its actual ID.

Improved ticket Form editor ID: 19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo.
Public form: https://docs.google.com/forms/d/e/1FAIpQLScv3nAEp1TzO7pr_j1IeEucc6ZHkW9MrdWHdFlq63IQ16I1oQ/viewform.
It has the season-driver list and session question. Existing old links still work through the legacy reader; don't close the old Form without a deliberate migration.

Driver application public ID: 1FAIpQLSdYT9Bb6x-bPb7NKszdiF5Xc1ZkT1mYVJo4xR5Q4TCAYlZxsA. Other existing application/staff/TT Forms retain their routes. Check actual current public applications page and native Form destination before altering them; a public Form URL alone does not prove response routing.

## Portal identity

- Owner: f1xboxleagues@gmail.com (ordinary Google account, not an assumed Workspace domain).
- Apps Script project: 1aCtr-lzpVPSqiXEqP7IWLsKyfBs49-pT3T82I4V-qcDS67jwSFX4p1b_
- Deployment: AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ
- Execution URL: https://script.google.com/macros/s/AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ/exec
- Public selected feeds append ?view=public-history or ?view=track-records.
- Google callback: https://f1xl.co.uk/next/fap-google-return.html
- Staff-facing short URL: https://f1xl.co.uk/admincentre/

Deployment access ANYONE_ANONYMOUS allows sign-in/public feeds; protected staff operations are guarded server-side. Execution USER_DEPLOYING is intentional. Do not “secure” the deployment by changing access blindly and breaking sign-in/feed delivery.

## Original references, not the new current write targets

Old Config: 1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk; old S28 gid 1935684132.
Old D1: 1ttwqU3zDcLIG-PAjpqZKoObhVFr2GI6D8k1nhu1E5zs.
Old D2: 1H56yFQIbHp3TeMYi9utU40QBL8P3HGUGDuN9S4UXaZQ.
Old D3: 19A2QyuF3Qlj557D-uQUp0nt_pvzMA2NId1nSFwVZzVk.
Old D4: 1EfE1MePPePr0CVMrDawMtXqv8DH5pJ1Pa7k6kV6aPbc.
Old Ticket Write Up: 1018L2jzNseasQVfNNoZCh_fDUbMIQ93EP2ahJvNc6F0.
Old track records: 18vD7g_29uzRSr_GYbXkNjclCHe8F_bsp4cY69TjXrW4.
Old honours/records: 1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI.

Originals are retained. They may intentionally differ because of accepted corrections; don't use “match old LIVE exactly” to undo those corrections. The [153 rename pairs](reference/launch-2026-11-06/rename-progress.json) identify connected FAP copies, not original books. The archived August source map describes the old system only.

## Dependency discovery beyond this shortlist

Use current Config Main and each season tab, not hardcoded guesses, to enumerate all 29 season labels including S7.5. The 5 November audit recorded 149 anonymous-readable sources and 3,038 spreadsheet/tab routes. These were checked before launch, not re-enumerated during this documentation refresh. Read through both callers and formula/import targets when changing a schema; include bots, templates, manual helpers, history and current-season views.


---

Source: ai-pack/LEAGUE-RULES-AND-EXCEPTIONS.md

# Sporting rules and identity exceptions

These are owner-confirmed rules. They are not permission to change unrelated results. Validate current saved data and historical evidence before applying them.

## Driver identity, numbers and movements

- A permanent Driver ID identifies a person. A gamertag is a changeable display name/alias. Team-seat numbers identify a team seat/tier, **not** the person.
- Driver points stay with the driver within a division. Moving up/down does not carry that division's points into the new division. If the driver returns, their earlier division record/points remain and they pick up where they left off.
- Constructor points stay with the team that earned them. Leaving a team does not remove those points; joining another team does not bring previous points into it.
- Moving to a new team/free-agent seat changes the driver's number to that seat's number. Preserve the number/team that applied to each already-recorded session.
- Do not remove a driver completely from their former division. Historical entries and movement records matter. An inactive/retired driver can remain a reserve; the owner rejected forcing a departure workflow because people may return or never report leaving.
- Movements require a recorded effective round and auditable history in Master/public website. Backdating is a specific correction, not an assumption that a new signing applied to all previous results.
- Reserve participation is recorded as Reserve with no seat number, irrespective of which car they used that night. It does not earn constructor credit. Genuine free agents normally use the number corresponding to their tier; do not confuse that with reserve status.
- Old manually maintained roster seats often remained occupied after a driver stopped racing. A stale seat alone does not prove a race assignment or retirement date.
- Reordering race positions must move driver, team, seat, result and related fields together. Never leave team/number attached to the finishing-position row after sorting.

## Confirmed identity equivalences

These confirmations are available to a successor; first locate the existing permanent records/aliases so a repair does not create a second person.

| Names | Owner confirmation / boundary |
| --- | --- |
| Blazzed420#8088 / Tiggz9632 | Same driver; later requested season-wide rename to Tiggz9632. Earlier request to retain Blazzed was a temporary import choice, superseded. D3 Ferrari #16 is correct; do not transpose numbers blindly across divisions. |
| I_RICHY_I / I Richy M I | Same driver, D3 McLaren identity confirmed during R2 import. |
| GeorgeD2404 / GeorgeD204 | Same driver; D3 Tier 2 reserve at that import. |
| Fordie_1986 / Fordster147 | Same driver; owner chose Fordster147 for the replay and confirmed Mercedes signing. Effective-round history still controls earlier rows. |
| Uldz / uldzaa | Same driver; use existing uldzaa identity. |
| F1XL Punisher / GBR x Punisher / OG James 96 | Same person; explicitly approved historical profile reconciliation. |
| GRL Atom / FGE Atom77 / KGS Atom | Same person; explicitly approved historical profile reconciliation. |
| McLaren / mclaren / mcLaren | Same constructor; case differences must not split honours. This is not approval to merge all historical rebrands. |

DH9982970 was a genuinely new D3 Tier 2 driver, not a guessed alias. Their profile/season-entry issue was subsequently addressed during catch-up; don't ask the owner to create a duplicate because an old pending note says missing. Re-read their current record/assignment before new action. BobbyLyonsAFC was also a new driver, with owner placement completed before import resumed.

Phonetic resemblance, punctuation normalization and partial-name matches are review aids only. The old audit's “32 unmatched names” is historical, not a live unresolved queue.

## S28 exceptions not to “correct back” automatically

- cndelta and F1XL Kimi were intentionally reserves in the early results discussed; their 33 combined points were correctly excluded from constructors.
- Sparky0431 at R8 Mexico was a free agent. Dean was still a free agent then; recorded McLaren signing took effect at R10.
- The Audi tier question was revisited: final owner correction restores BigG3991 as Tier 2 and VERSTAPPEN95 as Tier 1. The earlier R10 “tiers swapped” answer must not overwrite the later correction.
- rigd12 has never been Ferrari. An erroneous Ferrari association was investigated/corrected; use the specific saved historical correction, not current-seat lookup as a substitute.
- S27's two formerly numeric/zero-labelled team entries were legitimate reserve teams. Display Reserve and retain their scores; do not drop them as junk.
- Hakejowe's Aston Martin signing/backdate was specifically requested and subsequently corrected. Consult recorded movement/effective-round evidence for the exact boundary; do not guess a date from this summary.
- D3 R14 sprint P7/P8 use the normal sprint scoring scale (2 and 1), per owner, even where old LIVE had 1/0 after penalties.
- Bahrain R13's TEST-only uldzaa ticket #6 was explicitly removed to match the legitimate source; do not resurrect its extra 3 licence points/10 seconds from old exports.

For bans, carryovers and served-round uncertainty see [TICKETS-AND-PENALTIES](ai-pack/TICKETS-AND-PENALTIES.md). For complete accepted import differences use current record/history and the dated reconciliation evidence; this list is not a substitute for reading every affected row.


---

Source: ai-pack/TICKETS-AND-PENALTIES.md

# Tickets, appeals and penalties

## Intended operator experience

The main Tickets area is for the head admin/head steward. Separate steward and appeal desks should be simple, preferably one screen, with large writing fields. Reviewers can see colleagues' decisions but may edit only their own assigned review. The appeal desk contains appealed cases. Head Steward manages both review and appeal leadership; no separate Head of Appeals role is needed.

Show details, evidence, session and linked defence together. An optional Head Steward Note is internal only; don't make it a required field on every case. A ticket against a steward must not disappear merely because they are involved; visibility is separate from permission to adjudicate. Preserve recusal/own-review controls.

TPs see relevant submitted tickets immediately, including statements/evidence, without waiting for processing/final decisions. Their hub must not expose confidential steward deliberations or internal notes. The November fix covers both submitted sides, game/admin cases, visible-panel polling, error reporting and modal retention.

## Source and processing

Real submissions arrive in the combined Tickets & Apps workbook. Improved and legacy ticket Forms have different schemas; keep both readers. Use the actual form session (Qualifying, Sprint qualifying, Sprint race, Feature race), not an assumption that every case concerns the main race. Older cases may need an explicit session.

Processing imports a case into Ticket Write Up with permanent identity/receipt links. Raw response row number or displayed round ticket number is not its permanent case ID. Keep linked defence/evidence when correcting a duplicate or wrong-round case. Moving a case requires all related links/history to move coherently; an old approval to clear three specific R7 rows is not authority to clear today's rows.

Admins is a valid administrative reporter. Codies/Codemasters is a valid game target; neither needs a fake permanent driver. Real punished drivers must resolve to one Season Entrants identity. Editing a raw submission after import does not necessarily update the already-created case; inspect the imported mapping and synchronization path. Never invent a driver record just to clear validation.

Application acceptance and ticket import use receipts/journals so retries do not duplicate work. “Missing or duplicate permanent case ID” is a case-link problem, not automatically a missing driver or permission to press Complete round and ignore it.

## Final decisions and appeals

The owner wants the simplicity of the old sheet: review → final decision → correct points/penalties → public outcome, without a separate confusing publishing ceremony. Final decisions/completion integrate licence/threshold/export handling; preserve actual pending/error indications. A harmless instruction must not make a fully completed round appear outstanding.

Appeals revise the effective outcome of the original case. If an original penalty was applied, the system must reconcile the difference, including removing points/time/bans where overturned. It must not leave the original penalty in the licence or add a second full penalty. An upheld appeal leaves the original effective penalty once.

An imported already-completed LIVE decision/result may already contain the adjustment. “Already included” means that recorded result time/order already incorporates it, so record/reconcile the decision without applying the seconds a second time. Do not use this flag as a way to hide an unexplained mismatch.

Case identity, round, division, session, driver, decision, licence effect, result adjustment, ban/carryover status and Website Export must agree before reporting fully concluded. Where results await a genuine adjustment, say so explicitly. A successful review-text save is not proof that all downstream actions completed.

## Penalty rules

- Reprimands may be issued with or without time. A time penalty is numeric seconds; a qualifying-ban label must not be put in a numeric seconds field.
- Race disqualification carries **3 licence points**, as requested.
- Time removal is supported: e.g. “3 seconds removed”, not a malformed negative “penalty” label. Only the intended time/result effect applies; do not invent accompanying licence points.
- Accumulated penalties progress through qualifying bans, further qualifying bans, race ban and admin review. **Read current Penalty Guide/code for numeric thresholds**; do not invent them from this prose or from another season.
- Threshold bans should be reconciled during final decisions/completion and shown clearly. A stray “Accumulated penalty check awaiting admin review” message is not proof of a real unresolved ban.
- Direct race/season bans need explicit recorded decisions and affected rounds; do not infer an unrecorded season ban solely from total points.
- Carryover: if a time-penalised driver DNF'd the source race, carry it to the **next race they actually participate in**, sprint or feature, including a same-weekend feature after a sprint. It rolls **once only**. If they DNF that next participating race, it is wiped. Missed races do not use up that one attempt.
- Carryover can be controlled from the ticket itself as well as Licences & Bans so staff do not have to remember which ticket generated it.
- Results-side outstanding penalties/served bans are handled in place/modal. Never navigate away and lose unsaved result input.
- A race-ban service can be recorded when the driver does not attend. Absence alone does not prove service without the decision/schedule or confirmation. Multiple qualifying bans: record only the one actually served at that session unless evidence says otherwise.

## Confirmed historical service notes

These confirmations justified the S28 replay, not a new bulk-write instruction:
- TheInfinityJims R1 qualifying ban served at R2.
- R10: AllOwaYaFace served one of two outstanding QBs; F1XL Senna was initially recorded there; Imi's ticket confirmed a QB; RPL Titan Iron's race ban was confirmed served.
- Senna was later clarified as having served elsewhere, exact round unknown. Owner explicitly approved retaining Served and replacing the incorrect R10 reference with “Served elsewhere; round unconfirmed”. **The later correction takes precedence.**
- R12: Imi and Scrubs each served one QB, not all Imi's outstanding bans.
- R13 Bahrain: Chetty and Contay each served the R12 QB.
- R14: rigd12 served one QB in feature qualifying, despite a sprint qualifying time.
- R14 rerun/R15: owner confirmed AllOwaYaFace and Imi's scheduled R14 race bans, AllOwa's remaining R15 QB, EliteLDOG's R15 QB and VERSTAPPEN95/Imi's R15 race bans.
- Voshund's questioned ban was waived; do not reopen it as unserved. Retain the actual recorded waiver evidence.
- Owner said all LIVE R15 data was up to date: BT7274#8138's R14→R15 five seconds must not be added again.

## Head steward's short operating checklist

1. Select the intended season/round; check incoming names, division, session and evidence.
2. Link a defence to its original case and resolve any real driver identity before releasing review.
3. Release new cases when ready; stewards can work incrementally before Tuesday night's deadline. Dates are useful reminders, not a reason to hide already-ready Monday cases.
4. Check each required steward review or recusal; use the head-admin process for a legitimate administrative case.
5. Set final outcomes and any intended points, time addition/removal or ban.
6. Review the actual result adjustment, including already-included changes and any carryover.
7. Complete/check the round's final-decision process and read its saved status; don't ignore an unconfirmed save.
8. If an appeal arrives, use its linked case, review it, save the effective appeal decision and complete the resulting reconciliation.
9. Confirm licences/bans/carryovers and public Website Export reflect the effective outcome once; check changed finishing positions where seconds matter.
10. Report any genuine unresolved item by case/driver/session. Do not mark “all concluded” if a result adjustment or confirmation remains pending.

Exact button labels can evolve. Re-read the current screen/service before giving click-by-click guidance.


---

Source: ai-pack/ROLES-AND-ACCESS.md

# Staff access and role intent

Verified default permissions are extracted directly from v409 AccessPolicy in [role-defaults-v409.json](reference/role-defaults-v409.json). Read that file and fresh deployed policy for exact actions. Permissions combine roles and individual exceptions; a role label alone is not the effective policy.

## Owner intent and important distinctions

| Role | Intended scope / current caution |
| --- | --- |
| F1XL owner / God | Full control; owner account is the master. Do not demote it to test restrictions. |
| Administrator | Broad routine help: applications, TT recording, results, tickets/appeals management, licences, movements, calendar and season work. **No default Maintenance, Reference Data, People permissions, permanent Driver Database or archive access.** Postseason/career are read-only defaults, not blanket finalization authority. |
| Head of Allocations | Completed TT results/rankings and allocations, including relevant movement/roster functions. Exact v409 standalone defaults do not grant application management; Admin or Applications coordinator can supply it where intended. Do not silently infer role inheritance from “Head”. |
| Time Trial Team | Manage/accept applications and enter TTs; not completed TT rankings or allocations. Defaults to TT screen, including common combined TP/reviewer roles; broader owner/Admin/head roles retain their normal landing. |
| Applications coordinator | Applications management and TT booking. |
| Head Steward | Ticket processing, final outcomes, appeal management and licences. Replaces separate Head of Appeals leadership; old head_appeal values normalize to head_steward without rewriting account rows. |
| Steward | Own reviews, peer reviews read-only; no ordinary head-admin final-outcome power. |
| Appeals reviewer | Own appealed-case reviews; not general administrative leadership. |
| Team Principal | Assigned team's hub and permitted actions; server-side team scope, not just a hidden selector. |
| Free Agent Coordinator | Review free agents and reserves together **inside Team Principal area**, no placement changes. An account that also has Admin naturally has Admin's separate powers. |
| Host / draft operator | Draft/presentation operations. A weekly-show information hub is only an idea, not permission to expose the whole active season. |

Race Admin and Season Viewer were considered redundant; do not recreate them merely to make a new role list symmetrical. Normal admins need to help each other, but the owner specifically ringfenced allocations/completed TT results and later removed maintenance/reference access. Draft roster corrections are a separate permission from confidential initial allocations; check the actual endpoint, not just a page name.

## Accounts

Staff sign in with a Google account; it need not be a Gmail address. Registration/profile uses gamertag and Discord name as well as Google identity. Approval/roles are controlled through People & permissions. Discord mentions need stable numeric Discord IDs when enabling a real tag; display name alone is not a reliable mention ID.

Sheets changes execute as the F1XL deployment owner; internal records identify the acting Portal user. Do not grant spreadsheet editor access to every staff member as a substitute for role enforcement.

The deployment's anonymous entry is intentional for login/public feeds. Every protected action must retain server-side gateway/entry and effective-role checks. Never rely only on menu visibility, client role fields or a chosen reviewer name.

## TP/coordinator privacy and presentation

The TP area stands outside the season hub. Show current drivers separately from former contributors: driver championship points and points earned for this team are different. Ferrari's earlier cross-division/current-name bug was fixed with division-scoped current roster and a former contribution breakdown; do not undo history to make totals align.

Tickets show relevant submissions, both sides, statements/evidence and session immediately; preserve private notes/reviews. Licence flags/outstanding bans need clear state and affected rounds, scoped to current people being looked after. Market availability is full/part time, with driver season-stat modal/filtering. The coordinator's people are essentially that market, so don't duplicate a market tab or irrelevant constructor-total tiles.

The old Race week idea was replaced by a season-available track-information library and TP guides/tips. Event details already appear in the main banner; driver flags already belong with licences. Briefing notes were declined.

## Verification boundaries

Technical role/gateway checks were recorded 3 November; owner confirmed actual staff/phone checks after v408 on 5 November. Do not repeat old “staff checks pending” as a launch blocker. Fresh changes still need relevant own-record/cross-team/direct-RPC tests. Owner/God testing alone does not prove restricted-user behavior.

Google multi-account browser routing caused “Sorry, unable to open the file” even before Portal login. Separate Chrome profiles/Guest helped diagnosis; the owner resolved the account separation. Do not prescribe incognito as the permanent product workflow or assume every future login failure has the same cause. Preserve current callback/origins/session handling and inspect the actual failing URL without logging OAuth codes.


---

Source: ai-pack/PRESEASON-WORKFLOW.md

# Preseason and draft — current intent and retained nuance

The Portal supports preseason while an existing season is active. A demonstration season must never become the public current season just because its number is higher. Read explicit active/current selection and protect operational sources. Old S99/S1000 demo state has been retired; don't resurrect fallback IDs.

## Applications and tracker

1. Start a new season through the existing setup; its dates remain editable.
2. Carry forward previous-season drivers where appropriate and record responses. A tracker No excludes that driver from the available pool.
3. Process each application in its review dialog. Choose a clean display name or existing alias/profile match, not a combined “Xbox... EA...” string.
4. New acceptance links/creates the permanent profile, adds the season tracker/entrant/TT queue records and preserves the full application response before archiving. Returning acceptance reuses the existing person. Rejection should not create a fictional permanent profile.
5. If archival fails after processing, retry archival without duplicate downstream writes. The owner clarified that acceptance supplies the tracker entry; a separate prominent Add driver manually path was unnecessary.
6. Keep tracker controls and Save together; the setup/start box should disappear once no longer useful. Incoming-application content belongs in Applications, not duplicated on the driver tracker.

Application counts/unhandled-inbox indicators are useful; do not scan/read whole inboxes just to render a badge. Self-submitted TT confirmation should feed the completed TT workflow and archive correctly, not remain a disconnected inbox. Native processing receipts and mappings govern retries.

## Time trials and allocations

TT bookings, entry and confidential results/allocations are different permissions. Admin/TT Team can record times; Head of Allocations or an explicit exception can see full ranked times and assign division/tier. Do not leak the completed ranking through a convenient booking endpoint.

The older “time trial queue” standalone screen was consolidated into the time-trial workflow. Keep applications → time trials → placements navigation obvious. During an active season, late joiners use the same season records and individual placement; do not reopen the whole draft.

Qualifying result entry's old auto-filled time was requested removed; tyre fields must be clearable and must not alone make a session look like saved competition results.

## Social races

A simple pasted Discord entrant list, lobby shuffle/assignment and results record is the requirement. Permanent-driver matching is not mandatory; social entrants may never apply for the league. Do not turn this into a compulsory registry onboarding process.

## Track draw, dates and principals

- Season dates popup is required: chronological “what, date”, ending with Season Opening Race, easy to copy. AI poster generation is explicitly much later.
- Track draw and principals are separate. Tracks absent last season are guaranteed selection among eligible tracks, but not a privileged position. Fill remaining eligible tracks without repeats, then shuffle order.
- Sprint rounds defaulted to 3/9/14/19 where present and remain editable; moving a circuit does not implicitly move sprint designation.
- Save draw/principal preparation privately before the deliberate later launch. Keep statistics/presentation/check acknowledgement buttons alongside related controls.
- Principals may be entered before their chosen team is known; the owner objected to validation demanding a team first. Save-principals control belongs beside team count.
- Racing principals own their team's relevant seat/tier and must not be drafted by someone else. Non-racing/reserve principals do not consume a full-time seat.

## Draft and presentation

Draft order is confirmed per division; each normal principal turn picks Tier 1 and Tier 2 together. Explicit open-seat handling covers shortage. Free-agent teams do not participate as full principal teams. Part-time drivers default to reserves for preseason full-team allocation; don't use that old default as a global prohibition on a reserve later signing to a team.

Confirmed picks save as the draft progresses. A proposed single deferred draft save was set aside. Tentative selections may be shown publicly with awaiting-confirmation styling, but don't become assignments until confirmed. Preserve that highlight across refresh; don't let polling close editors or erase tentative selection.

After picking, allocate the remaining drivers to free-agent seats/reserves and Finish division. Stage 8 Division allocations is a review/correction route to the same roster checkpoint; it is not mandatory duplicate confirmation if Finish division already completed it. Stage 9 prepares real division workbooks/connections and launch readiness. The owner found this journey circular; improve signposting without adding another required hub.

Preferred presentation: Broadcast grid for normal draft, Grid reveal for division summaries, Team gallery for all teams. Different division colour profiles are fine. Free-agent/reserve sections are smaller, especially empty ones. Use real logos, big readable text, a working division dropdown and fullscreen; no “your season starts here” filler.

## Two different presenter predictions

- Draft-pick predictions: after order/presenters are confirmed and **before** draft, presenters predict who each principal will pick in each division. Correct = 1 point; incorrect = 0. Portal entry and presentation were requested/built; do not call this an unspecified future idea because September notes say so.
- Championship predictions: driver/constructor winner per division plus overall constructor champion. Separate records; not the draft-pick scoring competition.
- Pick-prediction presentation should show one selected division at a time, all presenters side-by-side, larger readable tables. Don't reveal total score immediately; optional selector/disclosure instead.
- Full future-season rehearsal remains useful at the next actual preseason; building a screen isn't proof of running a complete new draft with real presenters.

## Division preparation and launch

Create from verified templates, retain the Master, confirmed roster and drawn calendar, finish both Sheet connections, and check licence/results readiness. A trigger-limit interruption after a workbook was created should resume Finish existing workbook rather than create duplicates. Keep current version capacity limits in code, don't assume an old 40-driver figure is universal forever.

Do not launch merely by adding a high-numbered Config row. Use the protected current launch path and exact direct-source routing. The completed 6 November public switch is separate from a future season's launch process.


---

Source: ai-pack/WORKFLOWS.md

# Working journeys and retained product decisions

## New driver during a season

Form → combined Applications inbox → application review/match/name choice → permanent person + current season tracker/entrant/TT context → TT recording → authorised division/tier placement → working division roster/history and public views.

Do not force every applicant to be a new profile. Do not create made-up people to test the operational system. Form driver-choice updates are hooked into season/new-signing/rename workflows; a division move for the same person should not add a duplicate choice. Read TicketFormService if a manual edit bypassed those hooks.

Accepted stream links are already collected with the application response and made available under Administration → Driver stream links. The final owner request is just a table: Gamertag, Discord name, Stream link; search/season/refresh are fine. Invalid legacy non-URL text displays a dash without destroying the source. Consent/source fields still exist behind the simplified view; simplicity does not imply permission to publish private links elsewhere.

## Results, moves and public updates

Select the actual round/session. Input complete rows; retain the user's unfinished entry and show outstanding penalties/served bans in a modal. The result-adjustment helper must make changed gaps and a penalised race winner's total time understandable. Avoid applying seconds twice to imported already-adjusted results.

Moves preview the effective round, destination division/tier/seat and public reason; historical attribution must survive. Save feedback must be clear and the editor must survive unrelated refresh. An error naming a historical row may belong to another driver in that division, so inspect the identified session/driver rather than changing the person currently being moved.

Public division calculations and selected Config views follow saved Sheets values without a separate duplicate public-copy publication. Some workflows still have deliberate confirm/finalise operations for substantive transitions; don't confuse them with the removed duplicate publication step.

## Manual Sheets fallback

The objective is day-to-day operability when the Portal cannot be used. Use current FAP working books, not the old LIVE books. Choose one operating method for a task to avoid conflicting edits; do not imply manual users must also click the Portal after each input.

Application acceptance still needs identity/season links; results need valid row/team/seat/session values and intact formulas; ticket decisions and appeals need the effective licence/ban/result/export state, not just copied review prose. Manual formulas/imports propagate some data but do not execute all Portal services. Before giving exact cell steps, inspect the current tab layout and dedicated manual guidance.

Two manual-only refinements were explicitly deferred: seven Master overall-principal labels follow setup rather than sorted-team order, and old manual-update help mentions obsolete publication. Website direct aggregation is unaffected. Fix these when requested; don't make them an invented launch blocker.

## All Star Race (ASR)

Top qualifiers from each division, typically 20 or 22 places (possibly 24 later). Count/qualification remains manual and adaptable, not a fixed “top five everywhere”. A simple top-ten-per-division tracker helps. Declined invitations move to the next driver.

Usual pairing is top qualifier in top division with bottom qualifier in bottom division, continuing inward. Admin chooses track. Single normal qualifying then 100% feature race; descending points 20→1 or 22→1 as field requires. Celebrate driver winner and at least as strongly the winning team. Car allocation is randomized; invitation Save belongs at the top; confusing “next to invite” indicator was dropped.

Framework includes editable event/places, invitations, teams, announcements and race-night results/presentation. ASR has its own connected worksheet/workbook in the current implementation. The owner accepted leaving that arrangement until later performance review; do not reorganise it merely because an earlier discussion favoured the Master.

Announcements use the supplied Google Slides/PowerPoint-style reference, not a generic slideshow invention. Adapt to 10/11 teams, potentially 12. Race-night presentation reads normal-style input; lap-by-lap manual entry was discussed as onerous, not a mandated new feature. Specific content, automation of circuit facts and full late-season rehearsal remain deferred.

Reference deck from owner: https://docs.google.com/presentation/d/1cSQQKWD5ZiV064Wk_pP4mXsD68Ihzbr3iO7azwmFlg4/edit

## Season close

Postseason is a focused set of actions, not another sprawling hub. Results/team pages remain; standings become past-season tables; current/schedule/home indicators reset appropriately. Career statistics, accolades and Website Config transition must be included, not only a Closed flag.

Use the current preview/rehearsal to show exactly what Close season will do without committing stats or closing the live season as a test. Verify all unresolved tickets/appeals, final results and source coverage first. Current season has not been closed by this handover.

## Mobile and presentation

General Portal: Deep Forest dark green/charcoal, lime active/confirmed, amber attention/editable. Earlier light concepts were explicitly rejected. TP: black background, team-colour cards/sidebar, faded team-logo heading, compact next event. Use flags for races, a stopwatch for TT, a calendar for dates; random team-car imagery in an unrelated card was rejected.

UK dates: day/month/year. Avoid unwanted decimal points in ordinary totals; preserve legitimate fractional values such as half licence points. Remove unnecessary heading taglines/status badges/“connections ready” clutter. Long ticket lists can collapse. Mobile must be a genuinely usable layout, not a desktop view scaled smaller.

Homepage approved text: “This isn't sim racing — this is casual league racing, built for everyone. Racing every Sunday since 2010 on Xbox, PlayStation and PC. Open to all skill levels and ages across multiple divisions, no custom setups required. Currently racing on F126 DLC”. Sign up here links to application entry.


---

Source: ai-pack/STATISTICS-AND-HISTORY.md

# Statistics and historical records

## Definitions the owner explicitly settled

1. General overall career race totals are **main/feature-race statistics**, not sprint totals added on. Three sprint podiums do not contribute three overall podiums.
2. Sprint wins and other sprint metrics belong in separate fields. ASR points, wins and podiums never enter general season/career totals; record surviving ASR evidence separately.
3. Do not confuse that display definition with official championship points. A championship table may legitimately include sprint points under its season's scoring rules. Preserve official final championships; do not subtract sprint points from standings merely because career podiums are feature-only.
4. Track records are **qualifying sessions only**, including valid sprint qualifying, not race fastest laps. A faster race lap is not a qualifying record.
5. Missing historical data is unknown/partial, not zero. Do not award “no participation”, zero poles or a complete lifetime total from a missing source.

## Evidence and why old LIVE differs

The owner wants certainty about the reason for differences, not blind visual parity and not reassurance that “new must be better”. Trace each significant discrepancy to original final tables/session rows, identity aliases, formula/parser definitions and accepted corrections.

Original accolades and final championship classifications may retain information not recoverable from surviving R tabs (e.g. later penalties). Keep those official final facts distinct from reconstructed session statistics. Manual values in calculated areas may be intentional evidence.

Historical audits found identity splits, parser omissions, sprint/ASR contamination, malformed time formats, incorrect season labels and formula/row-assignment defects. Some were corrected, others are unavailable-data limits. A successful feed load cannot by itself establish perfect historical accuracy.

Known coverage limits retained from audits: many S1–S9 detailed race metrics are not recoverable; S14 D1/D5 and S15 D3/D4 have missing detailed sessions; S11/S12 team poles and multiple historical points values remain unknown. Counts of unknowns in old audits are dated. Re-read the current completeness metadata instead of fabricating fields for uniform cards.

## Permanent sources and identity

The private permanent Registry stores driver identities, aliases and historical records. The public site uses selected public-history/track-records feeds, not a copied local fixture or whole private workbook. Case-insensitive constructor normalization must unite McLaren spelling variations. Owner-confirmed driver merges are listed in LEAGUE-RULES-AND-EXCEPTIONS; do not fuzzy-merge the rest.

The repaired historical workflow calculates directly from recognised R-tab facts and preserves official/manual overrides. Historical Results Matrix is retired. Read the September incident in PROJECT-PRINCIPLES before any bulk repair.

The owner authorised 17 evidence-backed corrections to the shared original track-record workbook: five time-format fixes, five mistyped lap times, four season labels and three damaged D5 Australia cells. That was specific shared-source approval, not general authority to rewrite old sources.

## Track records now

The track-record feature was consolidated into the permanent Registry. The verified v409 service names these tabs: Track Records, Record Sources, Track Record Review and Track Record Candidates. Season/division creation registers source links and candidate formulas; read-only public records are served through ?view=track-records.

Automatic candidate discovery is not automatic unquestioned ratification. Validate qualifying session, timing format, circuit, season/game context, identity and source evidence before replacing a confirmed record. Inspect TrackRecordsService and the current review records when extending the process. The old separate record workbook remains historical/reference, not the new current website source.

## Team histories

The published team-histories.html was added from confirmed honours and season records; previous principals are shown where explicitly recorded. Source work covered 118 division workbooks across 29 season labels and 115 historical plus eight current principal entries at the time of the feature. Earliest recorded principals included S8. These are coverage snapshots, not guarantees that every old principal is known.

Use recorded OWNER/principal evidence, never guess from a driver's championship position or current TP. Missing means unknown. Keep genuine team identities/rebrands distinct unless confirmed equivalence. Free-agent/reserve teams should be separated/subdued where appropriate, not mixed into the full constructor gallery as equal full teams.

## Current and past seasons

S28 remains current until closed; it must not appear as a completed past season merely because configuration exists. At close, results/team history remain accessible; standings move to past seasons, current-season/schedule/home indicators clear/update, and career/accolade commits are handled explicitly. Cool stats/weekly totals may remain accessible. Use Postseason preview/rehearsal to inspect intended effects before executing; do not complete a season just to test it.

Compare four things separately: raw session facts, calculated division stats, official final championship tables, and public presentation/aggregation. A fix in one does not prove all four correct.


---

Source: ai-pack/DISCORD.md

# Discord — deliberately limited scope

## What exists

F1XLDataBot is the existing bot identity. The Portal's controls use GitHub Actions to run the sender; the Portal is the control surface, not a replacement always-running Discord host. Existing calendar/standings/team jobs remain. Direct Apps Script→Discord requests proved unsuitable in the earlier investigation; do not resurrect that failed route simply because UrlFetch is available.

Source: bot/ and .github/workflows/ in the website repository, plus DiscordGithubService/Client/View and DiscordApplicationService in Portal. Portal controls use the discord-control branch for small job/control state. This is not a new database for league results.

The private rehearsal channel is https://discord.com/channels/1186298584203800687/1329444470881648762. Bot membership and permissions were confirmed. Actual private delivery tests included real draft picks, four standings, team/calendar messages and pause/resume/finish controls. A successful private test is not permission to send to public channels.

## Current status at launch

- Standings job schedule retained: 0 12,18 * * *.
- Team/calendar job schedule retained: 0 9 * * 1,5.
- Legacy draft job and Portal runner are manually dispatched; don't assume a draft-night schedule is active.
- Standings and team/calendar Config pointers changed to current FAP sources during the website switch; no schedule/channel/token changes or launch test messages.
- Application alert sender is implemented and privately proved, but real route is **OFF**. Nobody is explicitly assigned the intended Head of Allocations recipient and the real channel must be verified before enabling.
- Steward-ready, appeal-ready and quiet TP Discord ticket posts were explicitly **dropped** by the owner. They are not an open implementation queue.
- Stewards-decisions and outstanding qualifying/race-ban posts remain **manual**.
- Accepted-applicant welcome/follow-up messages were discussed, then **parked**.
- No in-Portal notification feed, Firebase deployment or phone push service is wanted.

## Agreed channel intent, not blanket activation authority

| Event | Intended place / boundary |
| --- | --- |
| New applications | admin notifications; tag explicitly assigned Head of Allocations once configured |
| Standings | S(current)-standings |
| Teams | S(current)-teams |
| Calendar | S(current)-race-calendar |
| Draft / signings / movements | driver-changes; inspect the implemented controls and approved job before sending |
| TP ticket visibility | TP Portal hub, **not** a Discord notification |
| Decisions / outstanding bans | Existing manual channels, leave manual |

The owner does not need frequent checking: standings a few times weekly, drivers about daily, draft messages every five minutes would be acceptable. Those were desired tolerances, not proof that the retained cron expressions were changed.

## Reliability and costs

GitHub scheduling can be delayed; draft-night late/missing messages motivated the controls. A green legacy job may swallow delivery errors, so verify message receipt/status rather than equating Actions success with delivery. Preserve durable receipts, revision checks, expiry, pause/finish controls and ambiguous-send handling; don't blindly resend after an uncertain timeout.

People choose phone notifications in Discord. Bot messages/mentions do not guarantee a phone alert; server/channel/mute settings remain theirs. Do not add Portal preference screens to solve this without a new request.

No Firebase. Cloudflare relay was proposed but never approved; the user requires thorough viability/cost scrutiny before another service. Don't promise any provider “no costs ever”. Check current account plan/quota only when needed, and do not enable billing.

The owner-created GitHub connection was set to expire **14 November 2026**. It is a near-term maintenance item: inspect the current connection before that date, explain expiry plainly, and let the owner enter any replacement privately. It is not the Google sign-in session. Approved repository was F1XL2010/f1xl2010.github.io with Actions and Contents read/write; Contents is broader than just starting jobs. Never print/store token values in this pack or reset the bot token casually; existing jobs share it.

An old cron-job.org draft-night scheduler was inspected in the earlier audit. Recheck its current jobs read-only before changing/supplementing them so two senders cannot race. No current live state of that external account was rechecked during this handover refresh.


---

Source: ai-pack/DECISION-HISTORY.md

# Current decision register and supersessions

This is the current interpretation of owner decisions. Full earlier wording/reasoning remains in [the historical decision file](archive/2026-11-06-before-refresh/ai-pack/DECISION-HISTORY.md), [running status log](archive/2026-11-06-before-refresh/ai-pack/CURRENT-STATUS.md) and [topic index](archive/HISTORICAL-INDEX.md). Old approvals and deployment instructions are not executable authority.

| Topic | Current decision | What it supersedes / why |
| --- | --- | --- |
| Public launch | Completed 6 Nov; root URLs stay, old pages /legacy/, /next/ compatibility | “Still preparing TEST switch” notes; protect established search visibility |
| Workbook names | Connected new-system copies use FAP prefix, exact IDs preserved | TEST prefix; do not rename originals or unused inconsequential leftovers |
| Website updates | Direct division sources plus selected Config imports | Extra public season-copy and repetitive Publish after saves; manual fallback must work |
| Private boundary | Master/People/Registry private; division Sheets intentionally public-readable | Do not create extra workbooks just to hide already-public racing data |
| Tickets | Original Ticket Write Up Website Export includes normal and admin outcomes | New separate publication sheets/copies were rejected |
| UI | Deep Forest general Portal; black TP background/team-colour cards/sidebar | Light/bright general designs and black TP cards on tinted background were superseded |
| Names | Admin Portal publicly; admincentre short entry; FAP okay internally | Avoid FAP in external invite URL, not a total code/key rename |
| Workflow | First-time operator, obvious action/save/next/back, short optional help | Walls of explanation, nested hubs and technical links in routine screens |
| Performance | Focused reads/batched writes/background UI; measure genuine operations | Speculative database move, overnight-only bulk persistence and endless micro-audits not approved |
| Driver identity | Permanent ID + aliases; team/tier owns number | Number must not be treated as person identity |
| Team history | Keep points at the team/session where earned; preserve former contributions | Current roster lookup cannot rewrite historical constructors |
| Inactive drivers | Reserve is acceptable; old divisions/history retained | Mandatory season departure/deletion workflow rejected |
| TT privacy | Recording/bookings distinct from completed ranking/allocations | Admin/TT-entry access must not expose confidential allocation data |
| Roles | God full; Admin routine broad but restricted maintenance/reference; Head Steward covers appeals | Redundant Race Admin/Season Viewer, separate Head of Appeals |
| TT Team | Manage applications AND enter TTs; default TT landing | Read-only application interpretation rejected |
| TP/coordinator | TP outside season hub; coordinator within TP area, combined FA/reserve review only | Separate coordinator top-level hub, constructor/market widgets for coordinator |
| TP content | Current/former driver contributions separated; submissions/evidence visible immediately | Ferrari cross-division name matching; only processed-ticket visibility |
| Race week | Track-information library available all season plus TP guide | Repeated event banner, repeated licence flags and briefing notes declined |
| Social races | Paste names, shuffle lobbies, record results; no profile matching required | Forcing casual guests into permanent driver records |
| Application handling | Acceptance creates/links tracker/entrant/TT context and preserves response; canonical-name choice | Separate prominent manual-add driver action and duplicate tracker inbox |
| Draft roster | Finish division confirms same checkpoint as allocation review | Compulsory duplicate stage confirmation/circular launch journey |
| Draft-pick predictions | Before draft after confirmed order/presenters; 1 correct, 0 wrong; Portal input | Earlier “rules not supplied/parked” notes now superseded |
| Presentations | Broadcast grid, division Grid reveal, all-team gallery, compact FA sections | Smaller spreadsheet-like prediction tables, immediate totals, filler headings rejected |
| ASR | Manual variable field/invitations, random cars, separate framework retained for now | Automatic fixed qualifiers, confusing next-to-invite marker, premature workbook reorganisation |
| Appeals | Reconcile effective original penalty including reversals and thresholds | Adding appeal on top of original / leaving revoked licence points |
| Carryover | Next participated sprint/feature once, second DNF clears | Next calendar round regardless of attendance or sprint-only carryover |
| Special parties | Admins reporter and Codies/Codemasters target supported without driver profile | Universal requirement that every ticket party be a driver |
| Overall stats | Feature race totals; sprint/ASR separate; official championship totals preserved | Sprint/ASR contamination and blind recalculation from incomplete R tabs |
| Track records | Qualifying only; permanent Registry + sources/candidates/review | Mixed race-fastest-lap records and standalone current source |
| History repair | Original evidence, verified identities, unknown coverage explicit | Broad formula resets, fuzzy aliases and “TEST is better” without proof |
| Staff onboarding | Doesn't block launch; assign additional people later | Waiting for every person before switching |
| Notifications | Existing Discord jobs; application route optional/off; personal phone choices in Discord | In-Portal alerts/Firebase; review/appeal/TP Discord alerts dropped |
| Optional ideas | Poster generation much later; welcome bot and weekly-show hub parked | Do not reframe these as launch blockers or implicit requests |
| Manual sheet polish | Ongoing post-launch work; specific harmless issues deferred | Owner rejected making all manual layout refinements mandatory for switch |
| Housekeeping | Audit obsolete assets first; only scoped approved deletion | Don't remove old backups/history/unused-looking tabs by name alone |

## Disputed facts and later corrections

A later explicit clarification wins over earlier provisional answers (e.g. BigG/VERSTAPPEN tiers, Tiggz display name, Senna served-round uncertainty). The owner accepted specific LIVE/TEST differences; preserve them. Historical approved corrections are described in LEAGUE-RULES-AND-EXCEPTIONS and TICKETS-AND-PENALTIES, but exact present rows must be read before any further write.

A record saying “local upload pending” is dated implementation history. Verify the deployed v409 module before calling it unfinished. A new idea being discussed is not proof it was built. This distinction is why the current backlog is separate.


---

Source: ai-pack/OPERATIONS.md

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


---

Source: ai-pack/RESULT-IMPORT-VALIDATION.md

# Results import and assignment validation

**The S28 reconstruction is complete through R15 and the working system is live.** The old instruction “TEST writes only / LIVE read-only” described the replay before 6 November; it no longer identifies a safe sandbox. Scope any new import/correction explicitly.

1. Read both the intended target and original source. Confirm round, division, sprint/feature format and whether source penalties are already included.
2. Match each person to exactly one permanent/current season entrant; use recorded aliases and owner confirmations. Unknown identity requires confirmation, not fuzzy invention.
3. Preserve team/seat valid for that historical session, not the present roster. Reserve = Reserve and blank seat. Use tier/seat mapping for real teams/free agents.
4. Read actual saved rows after writes/flush, not merely your submitted payload or an alias-normalized comparison. Run the deployed validation equivalents of resultsEntryRoundValues_ and divisionResultsSavedIssues_; locate them in current remote source (module names have historical singular/plural differences).
5. Run the read-only driverMovementScan_ for affected divisions across their configured entered rounds. It may propose history snapshots: do not commit those writes unless executing an authorised move. Fix/report existing historical blockers rather than leaving them to surprise the next user.
6. Verify qualifying/sprint qualifying, sprint/feature rows, statuses, tyres, fastest laps, SC/red flags, times/gaps, penalties, positions and scoring. Sorting after adjustments must preserve the whole driver's identity/team/seat tuple.
7. Reconcile driver totals, team totals and relevant current/career metrics separately. Respect official/manual historical facts and feature/sprint/ASR definitions.
8. Verify unaffected input/formula ranges and public readback. Current direct-source mode requires no duplicate snapshot-publication command.
9. Record any agreed difference from old LIVE with evidence and reason. Never overwrite an accepted correction simply to make a visual comparison identical.

Built-in Portal saves canonicalise unambiguous names, reject duplicates/unknowns and validate saved assignments with rollback. Direct Sheet writes or bespoke helper scripts bypass parts of that protection, so the above checks remain necessary. A failed move's error may identify another row/person in the division; do not disable the guard or guess a seat to get past it.


---

Source: ai-pack/TESTING-CHECKLIST.md

# Verification checklist — choose checks for the change

This is an AI checklist, not a demand that the owner recheck the whole system each task. Record fixtures, source inspection, published readback, physical phone use and real transactions separately.

## Any change

1. Record relevant baseline, branch/dirty files, deployed version and source mappings.
2. Preserve unrelated changes and back up intended mutable data.
3. Check exact diff, syntax and encoding; no secrets/private record exports.
4. Test relevant behavior and failure/retry/stale-state cases. Don't write tests that merely repeat a trivial implementation.
5. Verify actual saved/published state, not just the outgoing payload.
6. Report outcome, scope, evidence and limits, then update the handover.

## Results / movements

- Permanent identity and historical team/tier/seat travel with result rows through reordering.
- Reserve/FA distinction, intra-division move, up/down and return to old division preserve correct balances.
- Blank tyre-only sessions, DNS/DNF/DSQ, qualifying and sprint layouts, plus-gap/time formats remain correct.
- Source-already-adjusted results do not receive a second penalty.
- Historical validation across affected rounds and unaffected formulas passes.
- Saved result, standings, constructors and public display agree within the correct definition.

## Tickets / appeals

- Legacy/improved Form schemas, session, both involved parties, admin reporter and game target.
- Import receipts, wrong-round correction, linked defence, permanent case ID and real driver match.
- Own-review edit / peer read-only / recusal and appealed-only reviewer scope.
- Final effective decisions, upheld/reduced/overturned appeals, licence deltas and threshold bans once.
- Positive time, removal, DSQ, carried seconds, first next participating race and second DNF expiry.
- Served/waived/unknown-round bans distinguish facts from guesses.
- UI stays open across background refresh and preserves unsaved fields; no navigation away from Results to settle a penalty.
- Website Export/public readback and honest round completion state.

## Roles / mobile

- Effective multi-role/exception policy, direct action denial and own-team/reviewer scoping.
- Admin routine work available, restricted maintenance/reference/allocations remain protected.
- Time Trial Team application processing and TT landing.
- TP/coordinator relevant submitted statements/evidence and correct current/former driver scope.
- Actual viewport dimensions, navigation, readable large forms, keyboard/touch and no horizontal overflow. A file called “phone.png” is not proof it was captured on a narrow viewport.

## History / records

- Official final classifications vs reconstructed session stats remain distinct.
- Feature-only overall metrics, separate sprints/ASR and legitimate championship sprint points.
- Verified aliases only; unknown values remain unknown.
- Qualifying-only track candidates and correct source/circuit/session.
- Team principals recorded only where supported; current season excluded from completed archive.
- Accepted corrections not overwritten just to match old LIVE.

## Publishing / recovery

- Root URLs/canonicals/sitemap, /legacy/ noindex and /next/ redirects preserved.
- Google callback untouched/noncached; /admincentre/ off menu.
- Current Config/private boundaries and history feeds remain reachable.
- Existing-cache browser upgrade and fresh browser work without losing form input.
- Only reviewed files staged; published commit/Pages build/content verified.
- No bot messages unless explicitly authorised for that destination.
- No old version rollback incompatible with FAP names; newer raw submissions/receipts/accounts preserved.

Pack-only validation is provided by maintenance/validate-pack.cjs. It checks documentation links, exact archived bytes, reference hashes and common credential patterns; it does not certify live product behavior.


---

Source: ai-pack/BACKUP-AND-RECOVERY.md

# Backups, recovery and succession

A repository is not a backup of live Google data or account access. This pack is a knowledge/source reference, not a full system restore image.

## Verified launch recovery

Eleven private owner-only native Google copies were created on 6 November for Master, D1–D4, tickets, Config, permanent Registry, People, real intake and Reference Data. Their IDs/links are in [release.json](reference/launch-2026-11-06/release.json). A comparison of 169,852 captured input/formula cells passed in [backup-content-verification.json](reference/launch-2026-11-06/backup-content-verification.json).

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


---

Source: ai-pack/TRANSFER-AND-MAINTENANCE.md

# Transfer to another AI/account and maintain this pack

## Transfer options

**Minimum:** give HANDOVER-FOR-ANOTHER-AI.md and the owner copy/paste prompt to the new AI. This is enough to understand intent, boundaries, current system and next steps without the chat.

**Full working handover:** supply the entire docs/handover folder plus the website repository, and arrange authorised account/connector access separately. The folder contains the old notes and verified v409 reference; the repository supplies website/bot code and assets. Neither contains the live private spreadsheet data or all raw audit exports.

The owner authorised committing this refreshed pack on 6 November. Use a repository revision containing that handover commit, or copy the complete local folder. The earlier website-switch commit alone does not contain this refresh. The included verified source reference is separate from the untracked admin-app folder. The owner does not need to publish documentation to the public website to transfer it.

## What does not transfer automatically

Google/Drive connector logins, Apps Script deployment rights, GitHub credentials, Discord server/bot rights, browser sessions, installed triggers, private Script Properties and local scheduled automations belong to accounts/environments. Access must be provided by the owner through the relevant service, not by pasting tokens into chat.

The old README said a weekly review was configured in an earlier Codex task. That is historical and unverified now; don't claim it transferred or create a recurring job without a request.

On a new machine, use available runtime/tooling rather than hardcoded C:/Users/mjc19 paths. The folder and its Markdown links are relative. The current computer's repository is under OneDrive/Documents/F1XL Back Up/F1XL Codex/f1xl2010.github.io. Some paths in archived notes remain machine-specific on purpose.

## Maintaining the pack

1. Update current documents after a material verified change; add the reason and superseded behavior where relevant.
2. Keep CURRENT-STATUS short and current. Put detailed older reports in the archive/evidence and link them, rather than endlessly prepending logs.
3. Keep KNOWN-ISSUES honest: implemented, verified, optional, parked, rejected and uncertain are different.
4. Update VERSION/changelog and source/date references. A changed file date is not evidence of deployment.
5. Refresh the source reference only from a fresh verified deployed snapshot; review for secrets and exclude Properties/session/private-record exports. Store source hashes and matching deployment provenance.
6. From this handover folder, run node maintenance/build-briefing.cjs then node maintenance/validate-pack.cjs. These only read/write the local pack, make no network requests and never deploy.
7. Review the changed files and transfer method. Do not stage unrelated work or publish audit/source folders accidentally.

Do not regenerate the preserved 6 November pre-refresh archive from current files. Its manifest exists to prove the old notes remain intact. Older report references to unavailable outputs are evidence pointers, not runnable missing dependencies.

## Commit/packaging caution

Jekyll excludes docs/handover from the public site, but a public Git repository would still expose committed files. The selected references contain code, IDs and public/historical racing context, not raw staff/private intake tables. Recheck before committing future additions. A ZIP is optional convenience only; the maintained folder is authoritative and the owner prefers files in their proper locations.


---

Source: ai-pack/EVIDENCE-AND-COVERAGE.md

# Evidence and conversation coverage

## Basis of this refresh

This pack reconciles the supplied conversation history, the 26 existing local handover Markdown files, current repository at 916a0c4, the cutover execution reports and the 121-file v409 payload whose published parity was verified at launch.

It is a curated durable handover, **not** a claim to have recovered a verbatim complete chat or re-audited every live cell. User confirmations are preserved as such. Historical artifacts are retained separately so a new AI can inspect nuance beyond the current summary.

## Pack-contained evidence

| Evidence | What it establishes |
| --- | --- |
| reference/launch-2026-11-06/release.json | Actual completed switch, commits/version, eleven backup IDs and limits |
| portal-final-verification.json | HEAD/published/reviewed payload parity at recorded time |
| public-publication-verification.json | Published file hashes/routes and build checks |
| public-feed-verification.json | Actual feed loads and dated counts |
| backup-content-verification.json | Captured source/copy input/formula comparisons |
| rename-progress.json | 153 exact before/after names/IDs and unchanged-sharing check |
| reference/portal-v409/manifest.json | Complete dated source-reference inventory and hashes |
| reference/role-defaults-v409.json | Role defaults extracted from that source, not inferred from labels |
| archive/2026-11-06-before-refresh/preservation-manifest.json | Exact preserved previous documents, including local uncommitted work |
| archive/HISTORICAL-INDEX.md | Searchable route to old decisions, experiments and evidence pointers |

Dates are not expiry guarantees. Re-read fresh live state before acting. A source code reference does not prove that every feature has been exercised on real users.

## Conversation coverage map

| Owner's concern / nuance | Current home |
| --- | --- |
| Costs, model switching, nondeveloper explanations, avoid needless confirmation | PROJECT-PRINCIPLES |
| Sheets manual fallback, direct public reads, no extra copy/publish, private Master | ARCHITECTURE, DATA-SOURCES, WORKFLOWS |
| IDs vs seat numbers, retained points/history, reserve/FA, signed drivers, aliases | LEAGUE-RULES-AND-EXCEPTIONS |
| Processing existing applications, display-name choice, No tracker entries, TT privacy | PRESEASON-WORKFLOW, ROLES-AND-ACCESS |
| Social pasted entrants, track/principal preparation, dates popup | PRESEASON-WORKFLOW |
| Draft paired picks, racing principals, stage 8/9, presenter predictions, presentation | PRESEASON-WORKFLOW |
| ASR manual qualifiers, invitations/teams, own workbook, race-night framework | WORKFLOWS |
| Appeals usability/reversals, session, admin/game cases, defence and wrong rounds | TICKETS-AND-PENALTIES |
| Time removals, DSQ, thresholds, carryover once, bans despite nonattendance | TICKETS-AND-PENALTIES |
| TP own-team tickets/evidence, Ferrari current/former scope, reserves coordinator | ROLES-AND-ACCESS |
| Deep Forest vs earlier light concepts, team-colour panels, relevant graphics/mobile | WORKFLOWS, DECISION-HISTORY |
| Feature/sprint/ASR definitions, official history vs reconstruction, unknown coverage | STATISTICS-AND-HISTORY |
| Qualifying records, shared repairs, consolidation/source helpers, principal history | STATISTICS-AND-HISTORY |
| Google accounts/sign-in, owner-executed Sheets writes, staff exceptions | ROLES-AND-ACCESS, DATA-SOURCES |
| Slow saves/polls, dialog closure, batching, actual timings vs call counts | OPERATIONS, TESTING-CHECKLIST |
| Discord bot/Actions/control, rejected Firebase, dropped alerts and token expiry | DISCORD, KNOWN-ISSUES |
| Public URL/search continuity, legacy route, TEST→FAP rename, completed release | CURRENT-STATUS, DATA-SOURCES |
| Apps/tickets real combined feed, old Form compatibility, archive receipts | DATA-SOURCES, TICKETS-AND-PENALTIES |
| Stream directory simple table, welcome/posts parked, post-launch improvements | WORKFLOWS, KNOWN-ISSUES |
| Historical corruption incident, backups, newer work protection, selective deploy | PROJECT-PRINCIPLES, BACKUP-AND-RECOVERY |

## Evidence outside the portable folder

Raw source exports, row-by-row correction plans, private data, full code baselines and screenshots largely remain under repository outputs/ and tools/, many untracked and excluded from Pages. Archived notes give their names. These may not exist on another account/machine; state that limitation and inspect fresh permitted sources rather than fabricate the missing results.

Particularly useful local evidence families:
- outputs/cutover-execution-2026-11-06 and cutover-package-2026-11-06.
- outputs/spreadsheet-switch-audit-2026-11-05 and final-readiness-2026-11-05.
- outputs/stats-deep-audit-2026-10-26 and later identity/formula/track repair folders.
- outputs/launch-access-check-2026-11-03 and staff-role-check-fixes-2026-11-05.
- outputs/tp-submitted-tickets-2026-11-04, driver-streams-table-2026-11-04.
- outputs/sprint-penalties-2026-10-22 and the scoped October performance reports.

Do not bulk-copy these folders into the public repository: some contain private raw account/intake material. Package only the evidence needed and review its contents first.

## Avoid false certainty

“Unknown historical fact” is not a code defect. “Previously tested” is not “tested again today”. “Owner confirmed” is stronger evidence of a league exception than a guessed current-roster join, but doesn't license unrelated changes. “Recorded as served, round unknown” is an acceptable faithful record. “All nuance included” means the durable decisions plus preserved source notes, not invented certainty where the conversation or evidence was incomplete.


---

Source: ai-pack/CODE-MAP.md

# Finding the relevant implementation

The source reference is dated **v409**, verified at the 6 November launch. Read the [manifest](reference/portal-v409/manifest.json) for exact names/types/hashes. Some remote filenames have historical spelling or pluralisation; don't “fix” them by bulk upload. A future release must start with fresh deployed source.

| Area | Starting modules / repository files |
| --- | --- |
| Entry, navigation, theme | Code, Index, NavigationClient, AccessClient, AdminCentreDesign |
| Login, roles, gateways | AccessPolicy, AccessService, AccessClient; admincentre/ and next/fap-google-return.html |
| Real intake routing | IntakeConnections, ApplicationService, StaffApplicationService, PreseasonIntakeService, TicketSubmissionService, TicketIntakeService |
| TT / placement | PreseasonTimeTrialService, SelfTimeTrialSubmissionService, PreseasonPlacementService, ActiveSeasonService, DriverMovementService |
| Permanent identity / rename | DriverDatabaseService, SeasonDriverIdentityService, DriverRenameService |
| Season setup / draft | SeasonPlanningService, SeasonMasterService, PreseasonPrincipalsService, PreseasonPrincipalSeatService, PreseasonDraftService, PreseasonLiveDraftService, PreseasonAllocationService |
| Division build / launch | PreseasonPreparationService and historical PreseasonPreperationService, DivisionTemplateService, DivisionDataServices, SeasonLaunchService |
| Results / adjustments | ResultsEntryService/Client, ResultsAdjustmentService/Client, DivisionDataServices |
| Tickets / reviewer work | TicketSeasonService, TicketProcessingService/Client, TicketDeliveryService, StewardAccessService/Client |
| Licences / bans / carryover | LicenceService, LicenceSetupService; results/ticket callers and public drivers-licence.html |
| Form driver-list integration | TicketFormService; acceptance/rename/season hooks |
| TP / reserves coordinator | TeamPrincipalHubService/Client, FreeAgentHubService/Client |
| Streams / rules | DriverStreamsService/Client, LeagueRulesService/Client |
| ASR | ActiveAsrService/Client, ActiveAsrRaceNightClient, AsrService |
| Postseason / history | PostseasonService, HistoricalSeasonService, AccoladeService, CareerFormulaService, PublicHistoryService |
| Track records | TrackRecordsService; public track-records.html |
| Discord | DiscordGithubService/Client/View, DiscordApplicationService; bot/ and .github/workflows/ |
| Public current/history pages | Root HTML, config.js and its shared readers; inspect actual imports before editing |

Matching Client files generally render the UI; Service files perform server operations. This is a starting map, not a complete call graph. Search callers, constants, template builders and public readers before changing a schema. The exact role defaults are in [role-defaults-v409.json](reference/role-defaults-v409.json); endpoint-level and own-record restrictions still apply.

Old tools/test-*.cjs/.js and release helpers are local evidence, often untracked and version-specific. Do not execute a script just because its name contains test: some create helpers or mutate connected workbooks. Inspect each script first. The pack's maintenance scripts are local documentation tools only.


---

Source: ai-pack/GLOSSARY.md

# Project glossary

- **FAP / Admin Portal:** league administration application, running in Apps Script. Public short entry is /admincentre/. FAP is the approved working workbook prefix.
- **TEST:** historical environment naming still present in keys/functions; after 6 November it is not proof of isolated/nonproduction data.
- **LIVE / old LIVE:** before 6 November meant the original manual system. After launch, root website uses FAP sources. Specify date and workbook ID to avoid ambiguity.
- **Legacy:** preserved previous public pages at /legacy/ and original source books; reference/recovery, not today's second write target.
- **Master:** private season coordination workbook.
- **Division workbook:** one division's session input, standings and statistics, intentionally publicly readable for website use.
- **Website Config:** public routing and selected imported views; deliberate public alias for some Master-derived data.
- **Permanent Driver ID:** identity key, unlike a gamertag or team-seat number.
- **Seat/driver number:** number belonging to a team/tier position, not permanently to a person.
- **Free agent / reserve:** distinct result/constructor treatment; combined only for the coordinator's review experience.
- **Case ID:** stable ticket identity; display ticket numbers restart by round and are not durable IDs.
- **Receipt / journal:** records of processed imports/applied effects enabling retry/reversal without duplication.
- **Already included:** result time/order already incorporates the decision; do not add it twice.
- **Carryover:** a time penalty deferred to the next participating sprint/feature, once only.
- **Feature race:** main race, distinct from sprint and ASR.
- **ASR:** All Star Race; separate points/honours.
- **GID:** numeric Sheet tab ID, not workbook ID.
- **Snapshot:** a dated captured state; say source/date/purpose explicitly. It is not automatically a current feed, backup or publication.
- **HEAD / published version:** editable Apps Script source vs immutable deployment version; verify both.
- **Direct-source mode:** public readers use working division data plus selected Config imports rather than a manually refreshed duplicate season workbook.
- **Source reference:** bundled dated code for understanding/recovery planning; never blindly deploy it over a newer live project.
