## 22 September 2026 — Reset TEST before historical Season 28 walkthrough

The owner directed a full discard of TEST Season 99 before a page-by-page
recreation of the real Season 28. All S99-specific workbooks and generated
exports were moved to Google Drive's recoverable bin, rather than permanently
deleted. The portal is now intentionally without an active or preseason season.
## 22 September 2026 — Deep Forest becomes the shared portal direction

Owner rejected the bright first shared portal pass because it reduced the
clarity of highlighted cells. The selected direction is **Deep Forest**:
dark forest/charcoal workspace and sidebar, lime for active or confirmed work,
and amber reserved for action-required or editable states. This was deployed
to TEST v257 as a stylesheet-only change. Keep the TP Hub’s team-specific
black/team-colour design separate.

## 22 September 2026 — First wider Admin Portal implementation

Owner approved the light Motorsport direction for the main administrative
workspace, with dark green-charcoal work cards and the actual F1XL logo. Use
brand graphics for portal/season headings and only use race/circuit graphics
when the relevant track is known. The TP Hub remains visually distinct:
black canvas, shaded team-colour cards and faded team artwork.

This first wider pass is deployed to TEST v256. Internal visible naming is
**F1XL Admin Portal**; the working Apps Script address and Google sign-in
return remain unchanged. A shorter public address is still a later decision.

## 22 September 2026 — Naming clarification

Owner confirms the internal app can be called Admin Portal. The naming concern is avoiding FAP in the public URL, not banning the acronym internally. Do not perform another blanket rename or change the current URL from this clarification alone. Original chosen portal direction is the light Motorsport concept, separate from the team-specific TP Hub styling.

## 22 September 2026 — TP palette refinement: black canvas, team-colour cards

Latest owner choice: TP Hub background returns to black, with boxes/cards in shaded team colours and readable light text. Retain the faded full-width team banner and compact next-race strip. Shared navigation remains light; this does not change the general Admin Centre light-design preference. Updated local preview only; no deployment, same four-file set. Supersedes pale-page/dark-card palette notes below.

## 22 September 2026 — TP card/banner refinement

Owner prefers the content boxes dark/black as before, while retaining the pale team-colour page and light navigation. Team artwork now fills the heading box as a faded background behind readable text, rather than a separate image. Next race remains compact. Revised AdminCentreDesign.html and regenerated the disconnected preview. No deployment; same four-file deployment set.

## 22 September 2026 — Preferred light design and team-specific backgrounds

Owner corrected the dark interpretation: the general Motorsport concept should be the lighter version. Team Principal pages may differ but should use subtle team-colour backgrounds, a team heading box supported by existing team graphics, and a smaller next-race component. Keep the real F1XL logo top left. This overrides earlier descriptions implying the dark palette was approved.

## 22 September 2026 — Combine visual redesign and mobile adaptation

Owner approved a first working TP Hub plus shared navigation pass using the selected Motorsport concept, desktop and mobile together, with the actual F1XL logo at top left and team-specific accents. This supersedes the earlier instruction to leave that concept unimplemented. Start with a local reviewable version; roll out other areas after approval of the direction. Public name Admin Centre is introduced in the shell/title; no shorter URL or hosting migration is configured. See outputs/admin-centre-design-2026-09-22/REVIEW.md.

# Decision history

## 14 August 2026 — Project principles adopted

The owner established seven standing priorities: plain-English support; continuous simplification; sensible feature improvement; paramount data preservation; account-independent succession; no public-user account requirement; and protection of search/AI visibility.

## 14 August 2026 — Two-pack handover model

Succession documentation is split into:

- A comprehensive, platform-neutral AI pack.
- A concise new-owner setup and continuation guide.

The owner should not need to read the technical pack in full. The AI must read it and guide the owner.

## 14 August 2026 — Durable storage model

Maintained source documents live in the repository. A delivery ZIP should be generated from current sources when requested rather than treated as the master. No secret values belong in either pack.

## 14 August 2026 — Weekly review

A weekly Friday review was scheduled in the current Codex task. Its policy is review/report/propose, not silent editing, committing or external mutation. Successors must recreate it because the current AI account is not assumed transferable.

## 14 August 2026 — Historical standardisation paused

The owner identified the value and workload of standardising Seasons 1–27. The project paused that initiative to establish governance, succession and preservation rules first. No historical Sheets were changed.

## 14 August 2026 — Public access principle

The public site should remain usable without registration. Future data-writing interfaces may use restricted administrator access, but public front-end code must not contain write credentials.

## 15 August 2026 — Administration backend initiated

The owner approved beginning a new backend after reviewing the proposal against the project principles.

The agreed direction is that league operators will eventually enter operational data through the backend. The backend will create and update new standardised Google Sheets and later supply the appropriate website outputs. Historical seasons remain on their existing Sheets and parsers unless a separately validated migration is worthwhile.

Development begins in a completely isolated test environment. The first milestone is Start New Season; live publication, live Sheet writes and historical migration are deliberately absent.

## 15 August 2026 — Application and season-workspace boundary

The pending Applications Inbox and its notification count are visible to all authorised backend users. Accepting an application moves it into a separate processing area restricted to the league owner and assigned application administrators; declining deletes the submitted details. Accepted applicants become the people source for time trials, placement, draft eligibility and final season assignments.

Season-operation navigation appears only after Start Next Season opens a season workspace. The start option then disappears to prevent duplicate setup work. All season information must remain editable after the season becomes live, using controlled previews and audit history once live publication exists.

## 15 August 2026 - Application tracker direction

The private Application Centre will retain the recognisable structure of the current Applications Tracker rather than replacing it with a substantially different process. It may be condensed and automated, but it keeps separate views for previous-season applications, new-driver/time-trial progress, summary statistics and confirmed gamertag changes.

The tracker is populated automatically from the previous season when a new season is prepared. Team information is not required and the old tracker tab named `Sheet11` has no successor. The tracker must support a variable number of divisions rather than assuming four.

## 16 August 2026 - Application Centre split into operational tabs

The Application Centre uses separate Processing Queue, Application Tracker and Time Trials tabs to remain usable with more than 100 drivers. Returning-driver lists default to a division filter and can also be filtered by application status or searched by gamertag.

An accepted driver's name opens their application profile. The profile links to an existing permanent driver or creates a new one, records old gamertags as identity history, and holds two five-lap time trials. Consequently, no separate gamertag-changes screen is needed. Time-trial results and a later placement module require narrower permissions than the general processing and tracker views.

## 16 August 2026 - Commitment and compact division placement

The application profile and tracker must show the existing application answer for commitment to every race using the original Yes, Maybe or No wording. This will later inform division placement.

The future restricted Division Placement tab should remain compact. It needs driver identity, previous division, time-trial result, commitment and proposed division. Placement notes and warning panels are deliberately excluded unless later experience proves they are necessary.

## 16 August 2026 - Provisional division board implemented

The restricted Division Placement prototype uses an unplaced-driver column followed by one column per configured division. Accepted applicants can be dragged between columns. Each card also has a division dropdown for touchscreens, accessibility and reliable fallback operation. Assignments remain local and provisional; nothing is published.

## 16 August 2026 - Compact tiered placement view

To remain practical with as many as eight divisions, the placement board now displays one selected division at a time. Each division has separately ordered Tier 1 Drivers, Tier 2 Drivers, Tier 1 Reserves and Tier 2 Reserves groups.

Yes and Maybe commitment answers count as full-time. No is treated as part-time. A part-time driver becomes available for reserve placement only after completing both five-lap time trials and while remaining ineligible for drafting. Reserve drivers retain the Tier 1 or Tier 2 distinction.

## 17 August 2026 - Driver identity and real-world car numbers

The live Division workbook was formula-traced before deciding the replacement
model. Driver championship totals currently follow gamertags, while constructor
totals follow the team stored on each race result. Car numbers are displayed
and retained in race records but are not the live formula key.

The replacement model keeps car numbers because each division mirrors the
real-world F1 grid and the generated backup Sheets require them. A number
belongs to a season-specific real-world team seat and can therefore repeat in
different divisions. It must not identify an F1XL person. Each person instead
receives a stable internal `driver_id`; race and assignment records retain the
team and seat applicable at that time so team or division moves do not rewrite
history.

## 17 August 2026 - Permanent driver profile scope

A permanent driver profile must support every known gamertag used by the same
person. Administrators must be able to add older names later and merge two
profiles when evidence shows they are the same person. A merge must preserve
all aliases and linked history before the redundant profile is removed; it must
never simply delete the redundant profile and its relationships.

On 7 September 2026 this was reconfirmed as a deferred operational requirement.
Although the registry schema can store merge redirects and downstream readers
can follow them, the active Driver Database interface still needs a deliberate
administrator-facing merge workflow. No implementation was requested at this
stage.

The intended public sporting history is:

- seasons competed in;
- divisions and teams where the surviving records make this possible, with
  incomplete coverage stated honestly;
- useful race-result summaries where reliable source data exists, without a
  requirement to reproduce every race result;
- wins, podiums, poles and fastest laps;
- championship positions where recoverable;
- Team Principal seasons or periods, without storing or displaying their full
  team roster;
- ASR participation where records survive, explicitly allowing incomplete
  coverage;
- a season-ban marker when applicable.

Ordinary full-time/reserve periods, driver movements, licence-point history and
individual stewarding outcomes are outside the permanent career profile. A
season ban is the only disciplinary outcome intended to persist there.

Historical matching must not silently equate people based only on similar
gamertags. Uncertain matches require human confirmation. The original source
Sheets remain unchanged and the profile/index records where each fact came
from.

The driver-history audit must use the current season data and the existing
winners-and-awards/statistics workbook as primary points of reference, followed
by representative historical season workbooks where necessary.

## 30 August 2026 - Historical-page accuracy wording

When the Past Seasons and historical Results pages are properly redesigned,
they must clearly distinguish official season outcomes from incomplete
event-level archives:

- Division champions, runners-up and their final points totals are correct to
  the best of F1XL's knowledge, based on the surviving official final tables
  and the completed historical audit.
- Qualifying and individual race results are reproduced as accurately as the
  surviving records allow, but some entries or fields may be missing.
- Missing historical details must not be extrapolated or presented as known.
  Blank means unknown; zero means a confirmed zero.

The final public wording can be refined during the redesign, but it must retain
this distinction and must not imply that incomplete qualifying or race archives
are complete.

## Future consideration - Team histories

The public website should eventually include team histories. This is not part
of the immediate driver-history audit, but future season, Team Principal,
constructor and awards data structures must avoid making it unnecessarily
difficult to add later.

## 17 August 2026 - Permanent identity registry before historical migration

Permanent driver identities are global rather than season-owned. The TEST
backend therefore uses a separate driver registry workbook instead of placing
the authoritative profile inside a season master workbook.

The first milestone provides manual create/edit, alias recording, recoverable
archive and confirmed duplicate merging. A duplicate is never deleted: its ID
is retained as a redirect, transferred aliases retain their original-owner
reference and the decision is audited. This protects any old or future record
that may still refer to the redundant ID.

Automated historical import is deliberately not included in this milestone.
It will be added as a separately previewed process, and manual controls will
remain available whenever inconsistent historical sources cannot be matched
safely.

## 17 August 2026 - Leaving drivers are not archived

A permanent driver profile remains active when a person stops racing because
it is still needed for history and for correctly matching a later return.
Routine Archive wording was therefore rejected as misleading. The recoverable
exception is labelled **Quarantine incorrect profile**, requires a reason and
is reserved for mistaken, test or invalid records. Merged duplicates continue
to use the separate preservation-safe merge workflow.

## 17 August 2026 - Application privacy and decline retention

Application intake separates information visible in the general backend Inbox
from restricted real name, age, Discord ID and streaming-link details. Every
accepted application retains its season-specific snapshot and later links to a
stable permanent `driver_id`; submitted previous gamertags are suggestions,
not automatic identity proof.

When an application is declined, its ordinary and private submission records
are deleted. A minimal declined register retains the submitted gamertag,
submission and decision dates, deciding administrator and reason so staff can
see who was declined. The first implementation uses generated TEST submissions
only and must not contain a live Form or response-Sheet ID.

## 24 August 2026 - Formula-driven career statistics and structured accolades

The familiar `Full Stats` presentation is retained in the permanent Driver
Registry: one driver per row, career totals on the left and repeating season
blocks running oldest-to-newest on the right. A new season is appended rather
than inserted before older seasons.

The old formula itself is not copied literally. It searched Division workbooks
by gamertag and stopped at the first match, which could undercount a driver who
raced in more than one Division. The replacement uses stable Driver IDs and a
hidden formula-controlled chain: Division `Driver Stats` technical output,
Season Master `Career Stats Export`, then Registry `Career Imports`. The Season
Master groups and sums every Division before the visible Registry block looks
up the Driver ID. The public historical Winners/Awards workbook remains an
untouched reference and fallback.

The existing text-concatenated Accolades layout is not suitable as the
authoritative automated record. The implemented model is an append-only,
one-achievement-per-row record containing season, category, Division where
applicable, champion/runner-up result, stable Driver ID and team. A familiar
Accolades summary is formula-generated from that record. The guarded season-end
action first produces a read-only preview, requires an exact typed confirmation,
rechecks the source, makes and verifies a full Registry backup and refuses to
silently process the same season twice. It also blocks any attempt to overwrite
manually entered summary values.

For the current automated source model, Team Principal champion and runner-up
are inferred from the principals attached to the overall constructor champion
and runner-up. Constructor driver recipients are drivers displayed for the
relevant team in the final Division standings. These are explicit preview
assumptions, not hidden rules, and must be checked before the first real season
is finalised. Missing historical categories can remain warnings because early
records are incomplete; an unresolved Driver ID always blocks finalisation.

The remaining Winners/Awards tabs—including ASR, Overall and Division-specific
manual history—are a separate future migration. They should be collated in a
permanent historical awards/records area rather than forced into the Driver
Registry, and none may be discarded merely because an automated replacement
does not yet exist.

## 1 September 2026 - 22 rounds and historical fastest-lap scoring

The generated season system must support as many as 22 championship rounds.
Twenty-one remains the ordinary default in the setup screen, but 22 is a valid
maximum and must propagate through Division R tabs, licence and statistics
ranges, Season Master weekly totals and website round configuration. The All
Star Race is separate and follows the final configured championship round.

The owner initially identified Seasons 21–25 inclusive as awarding one bonus point for
fastest lap. It applied only to the Main Race, never a Sprint Race, and the
driver had to be classified in the top ten. Generated and repaired Division
points formulas encode that season-specific rule; no bonus is inferred for an
unknown fastest lap or an ineligible classification.

On 6 September 2026, the owner corrected the starting season to Season 20.
The confirmed window is therefore Seasons 20–25 inclusive; every other
eligibility restriction above remains unchanged.

## 2 September 2026 - Season Entrants future-proofed to 500

The permanent roster within each generated Season Master may need to exceed
300 people as the league grows. Its supported capacity is therefore 500
entrants. This does not enlarge an individual Division's 40-driver statistics
pool; the two limits represent different things.

The existing **Refresh reference lists** operation is also the safe upgrade
path for an older connected TEST season. It extends entrant formulas and
validations and updates connected Division imports while preserving existing
season facts and manual abbreviations.

## 3 September 2026 - Career Stats refresh repairs partial blocks

A Career Stats season heading is not sufficient evidence that its formula
connection is complete. The owner found Seasons 18 and 19 headings with no
usable Career Imports content. **Prepare / refresh Career Stats** must therefore
repair a missing import block, import formula or season lookup formulas in
place after its verified Registry backup.

The repair reuses existing Career Stats and Career Imports columns wherever
present, does not append duplicate season blocks and recalculates career totals
through the rightmost season even when an older season is being repaired.

The later live audit found a second, independent failure introduced by the
500-entrant expansion. The original 200-row Division adapter placed a technical
label in `Season Master Import!A203`; the expanded `A1:H501` `IMPORTRANGE`
could not spill through that occupied cell. The repair path removes only that
exact legacy label before resetting the entrant import. Any unexpected content
in `A203` blocks the repair rather than being silently erased. Career repair
must apply this upgrade to every connected Division before aggregating the
Season Master, and its FAP status must distinguish a populated export from a
merely installed formula.

Once the expanded import succeeds, `A203` is no longer blank: it legitimately
contains the 202nd imported entrant. Therefore the safety check first verifies
the expected root formula and `Driver ID` result in `A1`. A healthy spill is
left untouched; only the exact former technical label is removable.
# 14 September 2026 — Preferred future FAP appearance

Owner chose the middle **Motorsport** hub concept. Use the actual F1XL logo at the **top left** in the eventual design. Preserve existing functionality while introducing season-stage hubs and tidying navigation gradually. Explicitly deferred: do not implement the redesign now; retain the choice for later work. Preview source: `C:/Users/mjc19/.codex/visualizations/2026/09/12/01a09507-31fa-7811-96c2-9c9b233fd6a8/f1xl-hub-concepts.html` (Motorsport option).

## 19 September 2026 — Keep returning drivers in reserves

Owner does not want a separate left-season/retired workflow: people may change their minds or leave without notifying admins. Use existing reserve placements, retaining history. Approved seasonal driver-detail and principal corrections within existing driver management, plus sidebar ordering. Midseason principal appointment alone must not rewrite the driver's racing seat; use the existing recorded movement flow for that.

## 12 October 2026 — Feature-only overall statistics; separate sprint and ASR records

Owner clarified the Hall of Fame/history audit definitions: overall statistics
must include only main feature races. This includes wins, podiums, race starts,
points and related aggregate statistics; poles belong to feature qualifying.
Three sprint podiums must contribute zero to overall podiums. Record sprint wins
as their own metric, never add them to overall wins.

ASR points, wins and podiums must never enter overall career statistics. Keep
known ASR statistics and honours separately; unavailable historical values stay
unknown rather than being invented or treated as verified zero.

The initial 12 October recount accepted feature-plus-sprint starts. That audit
assumption is superseded: recalculate audit comparisons with feature-only starts.
This clarification is recorded and reflected in the local audit; it is not yet
a deployed spreadsheet/export repair. Apply it throughout the subsequent
historical statistics repair. Do not confuse career-statistic definitions with
authority to rewrite official championship standings or preserved final points.
