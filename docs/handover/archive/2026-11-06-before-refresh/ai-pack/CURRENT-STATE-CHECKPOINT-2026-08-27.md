# F1XL current-state checkpoint — 27 August 2026

This is the starting document for a fresh AI task. It records the current
position after a very long development conversation was compacted and after
several insufficiently verified changes were attempted.

It does **not** declare the current Admin Platform finished or stable.

## Mandatory first action for a new AI task

1. Read this file completely.
2. Read `PROJECT-PRINCIPLES.md`, `ARCHITECTURE.md` and `DATA-SOURCES.md`.
3. Inspect the repository and actual Google test workbooks read-only.
4. Report what you understand, separated into **Observed facts**, **Unknowns**
   and **Possible explanations**.
5. Do not edit code, Sheets, deployments, triggers or configuration until the
   owner confirms that the understanding is correct.

Never present a likely explanation as a confirmed cause. If the necessary
Sheet, formula, validation, Apps Script execution or deployment source cannot
be inspected, stop and say what evidence is missing.

## Project principles that control all work

- Explain everything for a non-developer.
- Simplify without losing features or recoverability.
- Preserve all original and migrated data.
- Keep a spreadsheet-only manual operating route.
- Keep the public website open without public user accounts.
- Protect the established live website, URLs, search visibility and AI
  visibility.
- Build for transfer to a future owner using a different AI account.
- Test changes in isolation before asking the owner to deploy or test them.

The full wording is in `PROJECT-PRINCIPLES.md`.

## Repository state observed during this checkpoint

- Workspace: `f1xl2010.github.io`
- Branch: `main`
- Remote tracking shown by Git: `main...origin/main`
- HEAD: `fa2c2c5ba86d0cd24a04f5c6801418120412ea8e`
- HEAD subject: `Add project handover documentation`
- The working tree is **not clean**.
- Existing modified tracked files include handover documentation,
  `_config.yml` and `robots.txt`.
- Important untracked trees include `admin-app/`, `next/`, `tools/` and
  `outputs/`.
- Because `admin-app/` is untracked, Git currently provides no commit-level
  rollback history for the Admin Platform source.
- Do not discard, reset, clean or overwrite any uncommitted file.

Local Admin Platform source fingerprint at checkpoint time:

- Files in `admin-app/`: 50
- Aggregate SHA-256 over sorted `filename:file-hash` pairs:
  `D42169746680251A30ABED341675285677B917DBDAD276B2A3711AB3C9CFF968`

Key local file hashes:

| File | SHA-256 |
|---|---|
| `CapacityConfig.gs` | `ED96F01135623948C96D75129BF515F6ADA35E76EE85C598F78226C45E1573E7` |
| `Code.gs` | `1104140697045ADB6AD55D5CC6910EFEC5063D5ECC99AE8279FD61CD0DE7E03D` |
| `DivisionTemplateService.gs` | `30545D6C5DC6D478DF81FFB4611E01FD37DD4C40AF3C9338A32C235F59D99A42` |
| `HistoricalResultsMatrixService.gs` | `4513A9EA4BFDAB720E3BDE63904D2BBF62809C6048E536CC0A3D7545F5F750B8` |
| `Index.html` | `4E60D107932C8869B8747A6DF8ACF61F6E99077484B5DD12ECB15E66E22C89DE` |
| `SeasonMasterClient.html` | `096EFE1C364F2D57A02251931113D1CA4D3A5783C2AE8965806E0147A89A0512` |
| `SeasonMasterService.gs` | `B4C0D765A5179EB6E4B44F2928E17FA34C72C9FCA58474A8CA294814AD8693E9` |

These hashes identify the local files only. They do not prove that every file
in the deployed Apps Script project is identical.

## Public website boundary

- The live public website remains the established GitHub Pages/Google Sheets
  system described in `ARCHITECTURE.md`.
- Google Sheets remain its main live data source.
- The new Admin Platform and generated workbooks are TEST work.
- `admin-app/` is excluded from the Jekyll build and disallowed in
  `robots.txt`.
- `next/` is also disallowed in `robots.txt`; it is the ring-fenced test
  website, not the public replacement.
- `next/config.js` points to TEST Website Config spreadsheet
  `1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg` and contains a Season 1000
  fallback.
- No assertion is made here that the latest local changes were published to
  GitHub Pages. The Git working tree is dirty and no commit or push was made
  during this checkpoint.

## Apps Script test platform — facts verified read-only

- Project name: `F1XL Control Centre - Test`
- Apps Script project ID:
  `1aCtr-lzpVPSqiXEqP7IWLsKyfBs49-pT3T82I4V-qcDS67jwSFX4p1b_`
- Project owner shown by Google: the signed-in F1XL Google account.
- Google shows the project as deployed.
- Project created: 16 August 2026.
- At checkpoint inspection Google showed last modified at 3:01 PM and last ran
  at 3:05 PM on 27 August 2026.
- The owner-confirmed URL below loaded a page titled `F1XL Admin Platform`:
  `https://script.google.com/macros/s/AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ/exec`
- Current execution records are associated predominantly with Version 130.
- Google also lists Version 115 and other named deployments. Do not assume a
  named deployment is active merely because it appears in the project.
- The project requests Drive, Sheets, container UI, background-script and
  account-email scopes.

### Trigger inventory verified on 27 August

Google's Triggers screen showed exactly 20 triggers:

- 19 × `divisionTemplateRoundHistoryOnEdit`
- 1 × `seasonMasterLineupSafetyOnEdit`

This is the maximum state that caused Division creation to fail with:
`This script has too many triggers.`

Do not delete triggers based only on their function name. The Triggers screen
does not show the source workbook in its table, and some generated workbooks
may still rely on them. Establish the workbook attached to each trigger and
the required replacement behaviour before proposing cleanup.

## Current spreadsheet-first architecture

The newer system is deliberately spreadsheet-first:

- Permanent Reference Data stores shared reference lists.
- The permanent Driver Registry stores stable driver identities, aliases,
  career blocks and accolade records.
- Each season has a Season Master.
- Each division has a generated Division workbook based on the familiar
  existing calculation structure.
- The Admin Platform is an interface over those Sheets, not a replacement
  database.
- Original live and historical source Sheets must remain untouched.
- The ring-fenced `next/` website reads the TEST Website Config and generated
  workbooks without changing the current public site.

The current capacity constant in `CapacityConfig.gs` is:

- 12 teams
- 24 race entries
- 40 distinct drivers recorded per division
- 8 divisions
- 21 rounds

The owner has found that at least one historical season contains 22 races.
Therefore the present 21-round limit is a known unresolved compatibility gap.
Do not attempt a 22-round generated workbook until this is deliberately
reviewed across the Season Master, Division template, licence ranges, result
calculations and website readers.

## Historical migration — owner-reported progress

The following statements come from the owner during operation and were not
independently re-audited against every Sheet during this checkpoint:

- Five historical seasons had been completed and rebuilt by the time of the
  first audit pause.
- Season 7.5 was later reported fixed and working after its Google connection
  was approved.
- The owner was beginning Season 8 when the current problem occurred.
- Historical import is intentionally temporary functionality. Once all old
  seasons are migrated, later corrections can be made directly in the Sheets.
- Old sources vary substantially. Manual entry and copy/paste remain necessary
  where reliable per-round data cannot be imported.
- Final published standings may be more authoritative than reconstructed
  per-round totals for incomplete old seasons.

Do not infer that every season number before 8 is complete. Confirm the list
from the connected Season Masters and Driver Registry before reporting exact
coverage.

## Season 8 — exact current incident

### Verified facts

- An earlier Division creation attempt failed because the Apps Script project
  had too many triggers.
- Apps Script execution history showed a later `createDivisionWorkbook`
  execution starting at 2:21:02 PM on 27 August and completing successfully
  after 172.546 seconds.
- The browser nevertheless displayed the generic message `The Division
  workbook could not be created.` The server execution completed; the browser
  response was lost or ceased waiting.
- The owner then reported that entering race results in Season 8 did not
  auto-populate the car number as earlier historical seasons had done.
- A formula-based replacement was attempted locally and deployed/tested by the
  owner.
- The first repair attempt produced:
  `Exception: The data you entered in cell C9 violates the data validation
  rules set on this cell.`
- The local code was changed to clear validation only on historical car-number
  ranges before installing formulas.
- The owner then reported: `it doesnt work`.

### Unknowns — do not guess

- The exact current contents, formula and validation of the failing Season 8
  cells C/D/E have not yet been inspected and compared with a working season.
- It is not proven whether the deployed Apps Script source is byte-for-byte
  identical to the local files listed above.
- It is not proven whether the car number failure is caused by driver lookup,
  tier lookup, team lookup, an unavailable `IMPORTRANGE`, a formula error, a
  stale deployment, or another dependency.
- It is not proven which prior working Season workbook is the best comparison
  target.
- No end-to-end disposable-workbook test has validated the recent formula
  approach.

### Required next safe action

Do not make another car-number code change first.

Perform a read-only comparison between:

1. one failing Season 8 result row;
2. the equivalent row in one owner-confirmed working historical season;
3. each workbook's `Data` and `Season Master Import` lookup rows;
4. cell formulas and validation rules in the result-number column;
5. the relevant Apps Script execution record and deployed source version.

Report the observed difference before proposing a fix. Test any proposed fix
in a disposable copy, including driver entry, team change, car-number output,
formula repair, constructor totals and preservation of existing results.

## Recent changes that are not yet accepted as proven

The current local source contains all of the following. Treat them as
unverified until an isolated end-to-end test passes:

- An optional final **Division** constructors standings table in each
  Historical Results Matrix. It is intended to accept Position, Team and
  Points for that division only; it is not a manual Overall table.
- Historical constructor formulas that prefer that final division table when
  populated and otherwise retain race-derived calculations.
- Historical Division creation skipping new per-workbook edit triggers to
  avoid the 20-trigger limit.
- A formula-based historical car-number path intended to replace the skipped
  trigger.
- Removal of car-number validation before installing those formulas.
- A read-only creation-status check intended to detect a workbook that Google
  completed after the browser stopped waiting.
- Omission of an early blank-workbook Career Stats refresh to reduce Division
  creation time; historical conversion still has its own Career Stats refresh.

The owner has not accepted the car-number path as working. Do not describe the
recent set as complete.

## Known working strategic decisions

- Stable Driver IDs are required; gamertags can change and aliases must be
  preserved.
- Original source Sheets are reference/fallback and are never rewritten by
  historical migration.
- Season Entrants persist even if a driver later moves or disappears from the
  current Division line-up.
- A driver who has raced must remain represented so their driver and team
  points are preserved.
- Completed result history must retain the team/car identity that earned the
  points even if line-ups change later.
- Car numbers are season/team-tier compatibility identifiers, not permanent
  driver identities.
- Historical data may be incomplete. Blank means unknown; zero means a known
  zero.
- Career Stats require one-time Google `IMPORTRANGE` permission for each new
  Season Master connection.
- Final published tables may need explicit historical adjustments rather than
  invented race results.
- The current public website must remain untouched while the replacement is
  tested alongside it.

## Rollback and change-control warning

The Admin Platform source is not currently tracked by Git. Before more
implementation work, create a recoverable source checkpoint outside the live
Apps Script editor or deliberately add the source to version control after the
owner approves exactly what should be tracked.

For every future change:

1. Record the current Apps Script project version and local hashes.
2. Preserve a known-working source copy.
3. State the observed failure and evidence.
4. Change one logical behaviour.
5. Test it in a disposable workbook.
6. Compare formulas, values and calculations with the known-working source.
7. Only then ask the owner to update the test deployment.
8. Do not commit or push unless the owner explicitly requests it.

## Copy/paste prompt for a fresh AI task

> This is the F1XL project. Before doing anything, read
> `docs/handover/ai-pack/CURRENT-STATE-CHECKPOINT-2026-08-27.md` completely,
> then read the project principles and architecture files it names. Inspect the
> repository and relevant Google TEST workbooks read-only. Do not edit code,
> Sheets, Apps Script, triggers, deployments, commits or the live website.
> Report your understanding under Observed facts, Unknowns and Possible
> explanations. Pay particular attention to the unresolved Season 8 car-number
> problem, the 20-trigger limit, the untracked Admin Platform source and the
> unverified recent historical-constructor changes. Wait for my approval before
> proposing or implementing a fix. Facts only; do not fill gaps with
> assumptions.

