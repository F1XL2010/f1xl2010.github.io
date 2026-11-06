# Historical result import checks

Updated 8 October 2026 following the D1 R7 movement blocker.

Use TEST workbooks only for the current S28 reconstruction. LIVE is read-only.

1. Resolve each source name to exactly one season entrant and store the entrant's exact canonical name. Confirm unknown identities; do not invent profiles or fuzzy-match them.
2. Preserve the team and team-seat number valid for that round. Use the historical source and recorded movements, never the current roster alone. Reserves use `Reserve` with a blank seat number.
3. After writing and flushing, read the **actual saved** round grid with `resultsEntryRoundValues_`. Run `divisionResultsSavedIssues_(rows, canonicalDivisionNames)` from DivisionDataService. Any issues must be resolved before claiming the import complete. An alias-normalised source comparison alone is insufficient.
4. Run `driverMovementScan_` for every affected division across all configured rounds before finishing an import. It is read-only; do not commit the returned snapshot writes unless performing an authorised movement. Investigate any historical blockers already present rather than silently leaving them for the user.
5. Verify unaffected inputs/formulas and historical team attribution, then refresh the affected TEST public results. Preserve explicit identity and reserve exceptions already agreed with the user.

Portal saves now canonicalise unambiguous case matches and reject unknown or duplicate names before writing. They check actual saved identities/team/seat values before reporting success and restore the previous round values/formulas if that check fails. Direct spreadsheet edits and bespoke import helpers still require the checks above.

The movement-wide guard remains necessary while moves pin the division's lifetime roster and historical lookup results. Do not disable it or guess a historical seat to make a move pass. Its error now identifies the driver and session actually needing correction.
