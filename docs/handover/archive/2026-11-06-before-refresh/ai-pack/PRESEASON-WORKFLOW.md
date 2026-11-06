## Active season continuation — 16 September 2026

Applications and time trials must continue after launch using the same Season Master and permanent driver records. Late joiners compare against the full season TT list and are placed individually; do not reopen the group placement meeting or draft. Owner explicitly chose selecting division, tier and Reserve/available Team seat together. Part-time drivers stay reserves. Calendar dates/tracks can change for unstarted rounds; shortened seasons retain unused rounds as cancelled (owner agreed), with tabs/numbering retained. Weekly results entry shows only the active season and coloured R1–R22 buttons instead of season/round dropdowns. Local implementation and upload list: outputs/active-season-operations-2026-09-16/DEPLOYMENT.md. Permissions for detailed trials and the known licence/ticket repairs remain later work.

## TEST launch and active season — 15 September 2026

Season launch is now implemented locally as the transition to the TEST website and active-season hub. It requires confirmed/current preparation for every division, both workbook connections, a complete Master calendar and the matching TEST config. A separate values-only public export prevents sharing the private Master. Explicit active_test_season selects S99 even alongside S1000. Completed launch sets I7 Active; the season menu points to its active hub. Saved preseason records remain in the Master. Update test website deliberately refreshes public snapshots; no extra triggers. Licences/tickets and their template repairs remain the next agreed work, and are marked pending on the hub/test site. Deploy admin and /next/ changes before clicking Launch. See outputs/test-season-launch-2026-09-15/DEPLOYMENT.md.

# Preseason workflow — agreed 13 September 2026

## 15 September — Guidance and handovers

Every working preseason screen now has a compact Step-by-step help disclosure, closed by default. Purpose, instructions, next steps and navigation links are all inside it to keep the working screen clear. The hub is a navigation map: Available does not mean complete, and applications/time trials plus track/principal preparation overlap. Finish division and Confirm this division refer to the same roster checkpoint; no second confirmation is needed if already Confirmed. Division preparation now explicitly walks through Google’s two permission directions and only displays Preparation complete when its prepared roster/workbook and both connections are ready. Season launch/publication remains later. Upload/review: outputs/preseason-signposting-2026-09-15/REVIEW-AND-DEPLOYMENT.md.

## 15 September — Confirmed rosters to division workbooks

After finishing each division in the draft, open Division preparation from the preseason hub. Copy the confirmed roster and saved track draw into the existing Master, create that division’s workbook from the clean template, then approve/check both Google Sheets connections. Other divisions need not have finished drafting. The placement board supplies the division count. Principal own-team seats, free agents and division/tier reserves carry forward. The Master stays in preseason and the new workbooks are private; publication/current-season launch is separate and remains to be built/reviewed. Previous seasons close at their own season end.

A trigger-limit failure after a completed build now offers **Finish existing workbook**; keep the copy and resume its final setup. Obsolete F1XL triggers are checked conservatively before creating a new handler. See `outputs/division-trigger-recovery-2026-09-15/DEPLOYMENT.md`.

Only explicit preparation actions write operational Master data. Direct Master edits and structural changes after workbook creation require review rather than silent replacement. The proven workbook supports 40 total drivers and 24 reserve names; larger rosters stop with a clear capacity message. See `outputs/division-preparation-2026-09-15/DEPLOYMENT.md` for upload, first walkthrough and recovery instructions.

## 15 September — Racing principals own their team seats

Racing team principals must not enter the available-driver draft pool. They are automatically assigned to their own team in the division and tier selected during placements. In that division, their team's draft turn selects only their teammate. Other divisions draft normally. Permanent Driver ID links and a unique tracker-name match connect principals to their racing profiles; non-racing/reserve principals take no full-time seat. Existing incorrect picks are flagged. The owner chose to reset all draft picks/allocations and start again, preserving preseason setup and the saved draft order. The reset also clears championship predictions while keeping presenter names and backs up previous draft data before writes. Deployment/run instructions: `outputs/principal-auto-seats-2026-09-15/DEPLOYMENT.md`.

## 15 September — Presenter championship predictions

After the draft, presenters predict Drivers' and Constructors' champions in each division and the overall Constructors' champion. Use Edit predictions in normal Live draft: a modal manages named presenters once, division choices, and overall choices. Every change autosaves and appears on the matching existing presentation tab; there is no Reveal step or separate screen. Division tabs include presenter prediction cards below the roster; All teams includes overall constructor cards and omits reserve-labelled teams, retaining free-agent teams. The presentation remains display-only. Records persist in the Master independently of draft picks; predictions are not competition scores. The previously noted future picks competition still needs rules and scoring. Deployment: `outputs/live-draft-predictions-2026-09-15/DEPLOYMENT.md`.

## 15 September — Provisional selections visible on stream

Owner explicitly approved broadcasting tentative driver selections from the admin instance to the presentation. This supersedes the earlier private-pending-pick behaviour for normal current principal picks. Highlight selected drivers in amber with an awaiting-confirmation label; only Confirm both drivers changes saved team assignments. Clear/replacement updates follow the admin selection. The lightweight highlight channel polls every two seconds independently of the slower full draft read; actual delivery includes server/network delay. Summary tabs remain saved-data-only. Corrections/allocation forms do not broadcast provisional edits. Implementation/deployment: `outputs/live-draft-highlights-2026-09-15/DEPLOYMENT.md`.

## 15 September — Draft completion, presentation summaries and future competition

Owner approved completing each division directly in Live draft: click an undrafted driver after principal picks finish, assign a free-agent team or reserves in a small pop-up, save, then Finish division. Keep the existing Division allocations screen for full-roster review/corrections. Continue saving each paired pick to the Season Master; deferred/batched draft saving was discussed and explicitly set aside. Performance tweaks can wait.

Presentation should include visual tabs for each division's team line-up and an All teams view showing each team's complete roster across divisions. Basic styling now; a more polished broadcast design later. Summaries use saved picks/allocations and show unfinished state rather than implying confirmation. Host may show presentation on a computer and control the draft from mobile; separate instances and independent presentation division/tab selection are accepted.

Future feature explicitly requested: a **"picks" competition**. Remember for later planning. Rules, entrants, scoring, timing and integration have not been specified; do not invent them or build a competition yet.

## Track draw clarification — 14 September 2026

Track draw and Team principals are separate areas. Tracks omitted last season are guaranteed inclusion among currently eligible tracks, with no priority round position. Randomly fill the remaining places from other eligible tracks without repeats, then shuffle the full selection into round order. Admins can review the pool and adjust the resulting order. Sprint weekends default to rounds 3, 9, 14 and 19 where present and remain editable; moving tracks does not move sprint round designations.

No wheel or reveal presentation is needed in FAP. The owner uses PowerPoint; that is a later discussion. Save preparation is private and must not trigger website publication. Pack 2.25 saves into Track Draw inside the same Season Master, leaving Calendar and website settings unchanged. Publication/export into the public/operational calendar must be an explicit later step. The existing team-principal screen is separated with team-only saves/preview; wider TP process changes await the owner’s next discussion.

## Latest application-review clarification — 14 September 2026

Reuse the original Applications layout/functionality inside the preseason area, with the full application in a review pop-up. The owner likes this pattern and wants it used where it reduces unnecessary permanent screen content. Processing belongs in this pop-up and links/creates the permanent driver, updates the tracker and creates the awaiting-TT queue entry. Only after these records and the full response snapshot save should the source response move automatically into Archive. Retain explicit rejection/delete before processing; no downstream records should be created by rejection. Do not retain a TT-completed checkbox in Applications.

Pack 2.22 implements this locally, retaining search, summary counts, 50-row pagination, badge and 15-second updates. Saved applications remain reviewable under Processed/All. Failed automatic archive leaves a processed entry with Retry archive, which cannot duplicate downstream records. Existing processed active rows can use the same action. Stale selections have a modal explanation/reload control; disabled buttons no longer show a wait cursor. Deploy the four files listed in outputs/application-review-2026-09-14/DEPLOYMENT.md; create/delete nothing. Test source remains configured until go-live cutover. No live changes made in this implementation turn.

## 14 September walkthrough corrections — supersede earlier setup defaults

Previous-season import is the normal first action; manual addition is an exception. The previous first-setup manual instruction must not dictate normal tracker design. The owner reports creating S99 for the walkthrough. They approved the tracker correction and separate new-season navigation. Start new season opens a fresh form without an existing-season selector; hub Season dates edits its season. Draft and track/principal announcements default to 19:00 UK local time, editable. Closing the previous season belongs at season end, not at the next season's launch.

Implemented locally in pack 2.20: previous-division tracker with response/chase controls, platform/controller/commitment, classification, notes and original new-driver review fields; separate application processing and statistics; TT progress reads existing queue state. Permanent profiles/aliases and processed/awaiting-TT integration remain. See CURRENT-STATUS.md and outputs/tracker-workflow-2026-09-14/DEPLOYMENT.md for storage, pending six-file upload and validation. No live Sheet changed.

This is the owner's current specification. Season 28 is still in progress outside the new setup; no real Season 29 has been created. July dates below are the owner's example, not instructions to create or publish a season.

## Latest clarification — initial setup starts from scratch

### Division allocations — latest owner clarification and local implementation

After deploying Live draft, the owner specified: unpicked drivers go into free-agent teams or reserves; part-timers go into reserves; full-team seats must all be filled, while other empty seats depend on numbers. **This can be done division by division as the draft progresses.** It does not wait for every division to finish. The PT rule supersedes earlier draft eligibility described below.

Division allocations now sits in the hub/submenu, with Allocate this division in Live draft carrying the current selection. Admins can save partial decisions, allocate remaining drivers and confirm one division while others are still being drafted. Saved full-team pairs remain fixed; changes use Live draft. Known PT drivers default to reserves and are excluded from full-team picking. Other local drivers may take free-agent seats at their confirmed tier or become reserves. The wider reserve pool can be assigned with a chosen tier; a reserve may be eligible in several divisions, but a regular team allocation cannot conflict with another division's assignment.

Confirmation requires that division's principal turns complete, every full-team seat filled, and all its local unpicked drivers allocated. Empty free-agent seats are valid. Season Allocations in the existing private Master holds A:F roster records and H1:L9 per-division confirmation metadata, with the version/season marker in N1:O1. It is created only on Save/Confirm. Each division's revisions depend on its own roster and relevant sources; normal progress in another division preserves its confirmed state. Source/manual changes, shared-driver conflicts and stale same-division saves still require review.

Eleven local service/browser suites passed, including confirmation while another division is drafting and desktop/mobile allocation editing. Deploy: replace Index.html, PreseasonHubClient.html, PreseasonLiveDraftService.gs, PreseasonLiveDraftClient.html and WebsiteDataService.gs; create PreseasonAllocationService.gs and PreseasonAllocationClient.html. Delete nothing. No actual new season or live spreadsheet was created. Creating/populating operational divisions from these saved rosters is the next stage; publication, principal access and season launch/archive transitions remain separate work.

### Live draft — paired turns, implemented locally

After deploying Draft preparation, the owner confirmed that both drivers are chosen together: a principal selects one Tier 1 and one Tier 2 driver on the same turn. They approved building that screen. The existing per-division principal order is used; admins choose which division to work through. No specific global division sequence was supplied, so none is forced.

The Sxx hub's Draft card links to order preparation and Live draft. Two searchable placement pools show PT and Maybe markers; each pool is restricted to that division/tier and excludes already selected IDs. Confirm both drivers persists one paired turn, then moves to the next principal in that division. Corrections can replace a saved pair while keeping other turns; undo removes the latest recorded turn. If a tier has no eligible unselected drivers, the admin must explicitly mark its seat open. Open seats, unselected placed drivers and excluded free agent teams remain visible. Reserve/Not selected placement decisions are not draft-eligible; deliberately Placed PT drivers are eligible.

Saved pairs live in Draft Picks within the same Master, created only on first explicit save. A:J stores turn key, division/pick/team/principal, both permanent IDs/name snapshots and timestamp; L1:M4 stores version/season and source/picks revision metadata. No extra workbook, operational division or live season is created. Preserve this table for later division/line-up generation. It stores current turns; corrections replace the row and undo removes it, so it is not a permanent event log.

All paired saves enforce current revisions, existing TEST/history boundaries, saved order, correct divisions/tiers and unique IDs. Source/manual changes pause inconsistent picks without discarding them; valid changes can be explicitly reviewed. Redrawing/replacing the principal order is blocked after picks begin. Polling every ten seconds refreshes active views, preserving pending choices and disabling stale confirmation if another admin changes the draft. A lost response after a successful save is recovered by refresh without duplicating the pair. Presentation mode is an admin-session display of saved draft information with no source notes or edit controls; a shareable principal/public view has not been created.

Ten local service/browser suites passed, including desktop/mobile/presentation layouts. Deploy: replace Index.html, PreseasonHubClient.html, PreseasonDraftService.gs, PreseasonDraftClient.html and WebsiteDataService.gs; create PreseasonLiveDraftService.gs and PreseasonLiveDraftClient.html. Delete nothing. The owner has not created a real new season; testing used synthetic in-memory fixtures only.

Remaining work after division allocations: creation and population of operational divisions from confirmed rosters; principal/public access and any additional stream design; public announcements, launch/current-season switch and previous-season archive. Do not interpret all principal turns recorded as completion of those steps.

### Draft order — reference, clarification and local implementation

The owner confirmed deploying Placement. They then supplied Team Owner Voting S28: https://docs.google.com/spreadsheets/d/1IbPf1f3M8DqUmEoRi663stbauUGJmSJbNEnv_3RnZ_I/edit. Read-only inspection of Draft order (gid 327669098) and Draft Order calc (gid 804407870) found varied division orders with average picking positions. One eight-principal / six-division example averages 4.5 for every principal. Other historical arrangements coexist; do not assume they are current or infer Tier 1/2 sequencing from F1–F8 labels. The owner explicitly confirmed that the principal who gets first pick is randomly selected and approved preparing a balanced order across divisions.

Implemented Draft preparation in the Sxx hub/menu. The first division uses a random principal permutation; complementary pairs and a balanced triple support the configured division count. Totals are equal where possible; for even principal counts and odd division counts of at least three, totals differ by one, the mathematical minimum. With one division there is only the random order. This is a general implementation of average-pick balancing, not a claim to reproduce any exact old matrix.

Prerequisites: current placements confirmed, teams/principals entered, explicit full/free-agent team types, no duplicate teams/principals. Full teams participate; free agent teams do not take principal picks. Per-division tier/PT counts come from placement decisions. Calendar tracks need not be complete. The UI shows all division positions and average picks, highlights first picks, and previews before an explicit save. Redrawing is explicit and leaves the existing saved order intact until the replacement is saved.

Draft Order is created inside the same Master only on save: A:D = Division / Pick / Team / Team Principal; G1:H5 = marker+season / source revision / order revision / drawn at / saved at. Preserve these headers and metadata for manual fallback. Source changes or manual order edits require review; a valid balanced arrangement can be retained by confirming it, otherwise generate a fresh preview. Saved copy text is available. No automatic redraw, driver assignment, operational divisions or public publishing. The private-Master publication guard now includes Draft Order.

Nine local service/browser suites passed, with all 1–12 principal and 1–8 division combinations checked. No real season or Google Sheet was created. Deploy: replace Index.html, PreseasonHubClient.html and WebsiteDataService.gs; create PreseasonDraftService.gs and PreseasonDraftClient.html; delete nothing. Tier 1/2 order, live picks, access for principals and stream presentation remain to be discussed before implementation.

### Latest placement and public-display guidance

The owner is happy to defer public announcements, even if they appear a week later. Previously they entered the website configuration GIDs and set the division count to 1 to reveal teams/calendar: this did not spoil anything because everyone knows there will be at least one division. Preserve that user-facing flexibility when public integration is built; it does not remove the private-Master sharing restriction described below.

Before designing Placement, the owner requested review of the original uploaded spreadsheet and stressed that there will be a lot of information: the replacement must be at least as intuitive and easy to use. They like automatic population from Time Trials, potentially ordered by overall average, and explicitly require part-time drivers to be highlighted.

Read-only review on 13 September of `Sxx Placements sheet Template` (`1LG_5LPl1MPtOhXY-vshrCGLqzzbwoExJe82PQP2KeVw`) found: an imported Time Trial Results tab; a Placements board with four colour-coded divisions side by side, Tier 1 / Tier 2 columns, ten slots per tier and counts, Host and RC per division, and separate Yes / Maybe / No commitment lists with counts. The template is blank, so this inspection confirms structure, not a populated meeting example. Unexplained working notes A24:A27 and I54 were not interpreted or changed.

The owner subsequently approved and we implemented the design locally: a compact ranked pool beside a division/tier board, a wide meeting view, adjustable division sizes, counts and Host/RC, with driver notes/details on demand. Completed TT results sort by rank from overall average; missing/incomplete trials remain visible for review. Processed applications supply commitment by permanent ID, with PT highlights, distinct Maybe, and explicit unknown. Optional season-only commitment corrections preserve original answers. Source refresh never moves manual placements.

Placement saves use Placement Drivers and Placement Divisions in the same Master, created only on explicit save. Click/drag slot moves support swaps and undo; Reserve and Not selected are explicit decisions. Confirmation requires a decision for every driver and at least one placed driver per division; empty slots may remain. Changed source data or manual board edits require review/reconfirmation without altering decisions. Divisions remain planning decisions in these tables; operational creation and draft are later stages. Eight local service/browser test suites passed, including dense and mobile UI checks. No actual season or live Sheet was created or modified.

Placement deployment: replace Index.html, PreseasonHubClient.html, PreseasonTimeTrialService.gs and WebsiteDataService.gs; create PreseasonPlacementService.gs and PreseasonPlacementClient.html. No deletions. The old global Placement files remain unchanged. The publication guard includes the private placement tables. Live checking waits until the owner starts a real preseason.

On 13 September, after the hub deployment, the owner clarified that they will input all drivers manually for the first setup, either creating a permanent driver entry or linking an existing profile. Do not require importing Season 28. Manual addition is the main route and creates a pending tracker entry. It does not represent a processed application or completed trial. Optional previous-season import remains useful for subsequent seasons.

The local stage-2 implementation now supports that manual route plus application processing from the permanent form inbox. Application processing attaches the permanent ID, updates the tracker and creates one awaiting-TT entry per driver. Changed gamertags can be matched manually and optionally saved as the current name with old aliases retained. Processed markers are green. A manual entry can be reused when its application arrives; processing can also add a driver directly to an empty tracker. Time-trial appointment/results/completion editing has since been implemented locally, as described below.

## Time Trials — implemented locally after the owner approved Master integration

Time trials are now accessed from Sxx Pre-season and stored in the same Season Master. The existing Time Trial Queue is the booking/completion record, extended with UK booking time and conducting admin. TT Results holds track names, five laps per track and formulas keyed by permanent Driver ID. First read is read-only; explicit saves create/extend the tabs. A processed application supplies the entry; manually adding a driver to the tracker alone still does not create a TT entry.

The original SS.SSS input convention and averaging were verified against the source template: lap 1 excluded, average laps 2–5 per track, then average the two averages. Partial trials can be saved and display provisional averages. Completed ranking requires the admin's completion marker and all eight scored laps. Ties share positions; gap is positive to the fastest completed result. Booking list has search, status filtering and 50-row pages. Unsaved edits survive hub navigation. Direct Sheet fallback may edit queue values and result lap inputs, retaining identity and formula columns. No automatic division placement, Discord message, draft or publication action is included.

Deploy together with the intake stage: replace Index.html, PreseasonHubClient.html and PreseasonIntakeService.gs; create PreseasonTimeTrialService.gs and PreseasonTimeTrialClient.html. No deletions. First TEST deployment still needs Google-service verification; all local checks passed.

## First stage, implemented locally

Latest deployment context: the owner has deployed Time Trials files, but **has not created the new season**. Local fixture S29 examples do not represent a real Master. Live smoke checks wait until the owner chooses to start the actual preseason.

## Principals & tracks — implemented locally

The hub now links to team/principal entry and ordered Calendar tracks/weekend types. These use the existing Master tabs; partial decisions may be saved. Team count can stay undecided until needed, and division count remains a placement decision. Winning principal names are entered after the existing vote; Staff applications is linked for review. Saved announcement text can be previewed and copied once complete. Reordering moves track/weekend pairs while retaining the dates.

Public website announcements were investigated but are not wired yet. The current website selects the highest registered season as current, and the publisher shares the whole Master. A new Master contains private application and TT records, so WebsiteDataService now blocks that sharing route for preseason/private-data Masters. The next public integration must export only deliberate public fields, preferably through the existing public Website Config, and use an independent preseason entry/page. It must not reveal the admin Master or replace the existing current season. No new season, live Sheet or sharing was changed during this implementation.

Deploy this stage: replace Index.html, PreseasonHubClient.html and WebsiteDataService.gs; create PreseasonPrincipalsService.gs and PreseasonPrincipalsClient.html. No deletions. All local service/browser checks passed; live checks wait for a real preseason.

## Season dates and Master setup

The owner confirmed deployment of stage 1, then approved inserting a hub before the next stage. Local hub implementation: Start new season sits inside Season Master. No standalone New Season sidebar item remains. A saved Master explicitly in the Preseason stage reveals Sxx Pre-season, with a hub button and expandable links to implemented season-specific areas. Each area gets a matching back link (dates is the first). Hub stages are dates, applications/tracker, time trials, principals/tracks, placement, draft and launch. Unimplemented stages are labelled and have no live actions. The hub includes its Season Master link and key dates. Legacy operational pages remain separately available until integrated. Removing the Preseason stage later removes the entry on refresh; the launch action that performs that transition is still to be built.

New Season creates or opens the same Season Master used by later stages. There is no separate planning workbook. Creating the Master happens only on an explicit save, after a season number, opening race date, applications opening date and round count have been supplied. Opening the screen merely reads the Master registry.

The existing Master builder prepares the familiar tabs with zero divisions internally and leaves Start Here!B5 blank. Start Here!H7:I7 records Setup stage / Preseason. Teams, principal names and line-ups remain undecided. Permanent Reference Data and the existing Calendar, Licence and Overall templates are required. No career registration, Division workbook creation, tracker mutation or publication is performed.

Race dates are authoritative in Calendar!C, alongside existing round / weekend type / track columns A / B / D. Preseason holds milestones, UK times and automatic/custom rules; it points to Calendar for race dates. Start Here!B4 records the round count. The Preseason tab also lists social Sundays. Its first six rows document the layout and manual editing rule. Use ISO dates and mark a milestone Custom to retain manual edits. Calendar race edits are loaded as custom overrides when they differ from the weekly suggestion. Derived milestones/social rows are refreshed on saving through FAP; this stage does not install a spreadsheet edit trigger.

Defaults are editable:
- Draft: Wednesday strictly before the opening race.
- Time trials close: previous day, 19:00 Europe/London.
- Applications close: day before time trials close, 21:00 Europe/London.
- All tracks and team principals announced: one week before draft.
- Social races: each Sunday on/after applications opening and before the opening race; number varies.
- Weekly race dates suggested, with per-round overrides for breaks.

The owner's opening race of 12 July gives draft 8 July, TT close 7 July, applications close 6 July and announcement 1 July. Draft/announcement times were not specified and remain optional. Custom dates survive recalculation. Date calculations use calendar days; UK times include daylight saving.

Connected operational Masters are offered for opening, without converting or overwriting them. Preseason Masters show divisions undecided in Season Master and are excluded from season statistics/maintenance selectors. The ordinary setup/connection/line-up repair paths reject them. Operational transition after placement is a later implementation step; do not manually remove the stage marker to bypass it.

Saves use the script lock, a revision covering both tabs and round metadata, and restoration on partial write failure. Calendar tracks, weekend types and All Star Race rows are preserved. Removing a round with track/weekend data is blocked until resolved. Existing historical protection and TEST-only boundaries remain. Direct simultaneous Google Sheet edits cannot be made transactional by the Apps Script lock; stale edits detected before save are rejected.

## Agreed full sequence (steps 1–3 and step 4 data entry/preview now implemented locally)

1. For the first setup, add drivers manually to an empty tracker, linking or creating permanent profiles. For later seasons, optionally populate Applications Tracker from every previous-season driver, including reserves.
2. Process incoming applications: link existing permanent driver identity automatically where reliable, allow manual search/linking for changed gamertags, identify returning drivers in the tracker, and create an awaiting-time-trial entry. Add a processed marker with green background. Remove TT completed from Applications; it belongs in Time Trials. Identity changes must preserve the permanent record.
3. Arrange individual TTs via Discord; log appointments and results in the Time Trials section. Applications and trials continue until their cutoffs.
4. Vote on Team Principal applications; record winners and track orders, and investigate staged public website visibility for these announcements.
5. After TT closes, 3–4 admins meet for placement using TT results, social-race performance and prior knowledge. Only then confirm division and driver counts.
6. Determine the principal draft selection order.
7. Admin-controlled draft within the admin area, with principals seeing available drivers and live assignments. Discuss permissions and a more attractive Twitch presentation before implementation.
8. Confirm/create divisions and populate correct drivers/teams from draft decisions where possible, reducing duplicate entry.
9. Publish the completed setup as current season and update home-page markers. Close the previous season into Past Seasons and Results. Publication/archive transition is for later discussion, not automatic now.

The purpose is less admin work with existing functionality preserved or improved. Do not require early division/team decisions just to capture dates. The original New Sheets Guide was seen by title only and has not been verified; this user-provided workflow is the current authority.
