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
