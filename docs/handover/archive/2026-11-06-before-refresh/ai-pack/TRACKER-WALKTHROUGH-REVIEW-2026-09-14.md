# Tracker walkthrough review — 14 September 2026

Review only. No Apps Script, Google Sheet, deployment or sharing changes were made during this assessment.

## Current owner direction

During the practical preseason walkthrough the owner rejected the new tracker as functionally incomplete. Importing the previous season is the normal first action; manual additions are secondary. The earlier instruction to start the first setup manually was a one-time setup exception, not a general tracker design. Preserve the recognisable existing tracker workflow and improve automation without losing functionality. Explain the comparison before implementing changes.

The owner reports creating the S99 walkthrough season and opening its hub; this was not independently verified against live configuration. The old assumption that no new season has been created must not be used to dismiss that report. Previous-season closure belongs at season end, separately from launching the next season. Proposed navigation distinction: Start new season creates; the hub's Season dates edits that season. The owner is collecting walkthrough adjustments for a later combined deployment.

## Sources inspected

- Live read-only `TEST - Applications Tracker Template`: https://docs.google.com/spreadsheets/d/1uwM_6s-MDuIZAH-I16lfmoRARLeG-3mrlpkDhh4dM4w/edit. Tabs: S24 App Data (0, 62 x 23), App Stats (691976890, 996 x 25), Gamertag Changes (1962037402, 998 x 26), New Drivers (1931491071, 85 x 25), hidden Data Validation (1126671684, 1000 x 26). Read metadata/conditional formatting and bounded headers, validations and statistics formulas. Sample driver rows were blank; this is a template, not proof of a populated operational season.
- Existing FAP TrackerService.gs and Index.html tracker views/edit handlers; admin-app/README.md, Seasonal Applications Tracker.
- New PreseasonIntakeService.gs / PreseasonIntakeClient.html and Index.html preseason intake view.
- DECISION-HISTORY.md, 15–16 August: preserve tracker structure; populate from previous season; variable divisions; separate processing/tracker/TT views; division/status/search filters; profiles retain identity history; commitment Yes/Maybe/No visible in tracker.

## Comparison

| Function | Reference / earlier implementation | New preseason screen |
| --- | --- | --- |
| Starting roster | Previous-season population is the documented normal path | Manual entry promoted; import hidden under Optional |
| Returning drivers | Previous-division blocks; Driver, Console, Controller, Applied, Chased | Flat read-only list of previous/current names, source, ID and binary application status |
| Response and follow-up | Editable Applied and Chased; workbook permits blank/Y/N/R | Only blank or Yes written on processing; no chase action or response editor |
| New vs returning after absence | New Drivers includes New Driver Y/N; stats distinguish new applicants from returners predating previous season | Both become Application entry when absent from imported roster; permanent identity matching exists but equivalent classification/view is absent |
| Summary | Division Yes/No/Reserve totals, new/older-returner totals and percentage formulas | Only tracked/applied counts |
| Platform/controller | Visible editable returning/new-driver columns | Application detail contains answers, but tracker does not expose them; import discards this metadata |
| Commitment | August decision requires original Yes/Maybe/No in tracker | Shown inside application details, absent from tracker rows |
| Time-trial progress | Original new-driver list has Scheduled, Completed, Draft Eligible and Self recording TT | New dedicated TT stage owns booking/results/completion; tracker has a basic expandable queue but not equivalent integrated new-driver progress |
| Gamertag changes | Original separate sheet; later agreed profile/identity history replaces separate screen | Profile linking, optional rename and alias retention are present and should be retained |
| Scale | Documented division/status/search filters; legacy mirror itself hardcodes four divisions | Application table pages at 50, but tracker renders every matching row and has no division/status filter |

The old mirror and the new screen are separate implementations. TrackerService still opens a fixed template ID, while the new screen uses private tables inside the selected Master. The legacy tracker therefore cannot simply be pointed at the new tab: their schemas and ownership differ. Do not tell the owner to use the legacy page as a substitute for the new season tracker.

## Proposed correction, not yet implemented

1. Restore previous-season import as the first action, using the selected actual source season rather than assuming a test season number minus one. Preserve every driver/reserve, identity, previous division/role and available platform/controller metadata. Re-import must preserve admin responses, chase markers and processed applications. Manual addition remains available for exceptions.
2. Use separate Processing and Tracker views within the season area. Returning drivers default to previous-division filtering, with status/search and practical pagination. These are previous-season divisions, not a premature decision about the new season's divisions.
3. Restore response/reserve and chase tracking, platform/controller and original commitment wording. Keep application receipt/processing distinct from intention to return or reserve: someone who declines must not remain indistinguishable from someone who has not answered. Do not conflate the form's No commitment (part-time) with a tracker non-returning response.
4. Provide a distinct new/older-returning applicant view and summary statistics derived from current tracker data. Keep driver identity/history through the permanent profile rather than introducing duplicate name-change management.
5. Read TT booking/completion from the dedicated TT stage instead of requiring duplicate ticks. The owner already moved the editable completion marker out of Applications. Preserve useful progress visibility and determine treatment of the original self-recording/draft-eligibility fields from current workflow before implementation; do not invent rules from their headings.
6. Preserve the current application-processing integration: manual/automatic permanent identity matching, old aliases, green processed marker, returning-row match and one awaiting-TT entry per driver. The correction is to restore the missing tracker workflow around this plumbing.

## Source defects to avoid copying

The template contains broken #REF! conditional-format formulas, shifted status references in some division colour rules, hardcoded S24/S25 labels, differently bounded Yes/No/Reserve COUNTIF ranges and #DIV/0! percentages on an empty roster. Retain the intended statuses, colour meanings and summaries; rebuild their calculations correctly for variable divisions and actual roster size. No template cells were repaired during this review.

## Deployment

None for this review. Earlier un-deployed planning change remains: replace SeasonPlanningClient.html and SeasonPlanningService.gs to default draft/announcements to 19:00 UK local time. The owner chose to enter those times manually and batch deployment after the walkthrough.
