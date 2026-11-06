# Driver history audit

Audit date: 17 August 2026

This is a read-only audit of the sources available for future permanent driver
profiles. No Google Sheet, website calculation or public page was changed.

## Outcome

A useful permanent driver-history system is achievable, but the existing Hall
of Records must not be treated as a clean database. It is a valuable index and
calculation workbook assembled from many season Sheets, with identities joined
mainly by typed gamertags.

The safe approach is to preserve the original source facts, assign stable
`driver_id` values, and use a human review queue for uncertain aliases and
profile merges. The system must state when a historical field is incomplete.

## Sources inspected

- Central configuration workbook
  `1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk`.
- Current Season 28 Division 1-4 workbooks, including Data, standings, race
  results and calculated driver-stat tabs.
- Winners, awards and statistics workbook
  `1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI`.
- Legacy season teams workbook
  `1f2ECx5qJxc18vFq62yUtdn_Hif6o0c-o_oibo6Pfwd8`.
- Current and historical ASR configuration and the Season 27 ASR workbook.
- Current driver-licence workbook and Outstanding Bans tab.
- Representative final standings from Seasons 1, 3, 10, 20 and 27.
- The public-page parsers in `hall-of-records.html`, `hall-of-fame.html` and
  `past-seasons.html`.

All Google access during this audit was read-only public download/CSV access.

## What exists now

### Permanent-looking driver list

The `Full Stats` tab currently contains 808 populated driver rows. Of those,
103 rows contain two or more gamertags separated by `/`. These rows are the
best existing starting point for identity work, but they are manually
maintained labels rather than stable identities.

The workbook calculates seasons, wins, podiums, poles, sprint wins and races
started. It has season blocks from Season 28 back through the early seasons and
imports many values from the individual division workbooks. The downloaded
workbook contains more than 21,000 formulas on `Full Stats`, plus nearly 13,000
on the older hidden `Total Stats` tab. This makes it powerful but fragile.

The `Accolades`, `Overall`, `D1` to `D8` and `ASR` tabs separately record
champions, runners-up, constructor honours, Team Principal constructor honours
and ASR honours. These are useful verified sporting facts, but they do not
contain every finishing position or every participant.

### Current season

Season 28 is configured for four divisions. Across the four current final-table
sources there are 94 unique gamertags, with 11 appearing in more than one
division. Multi-division appearances are valid and must be represented as more
than one season assignment or race appearance, not forced into one division.

The current division Sheets contain the strongest current-season information:
driver, division, team, tier, car number, race entries, results, wins, podiums,
poles, fastest laps, sprint statistics and starts. The current-season values
must be read from these sources until the new backend becomes authoritative.

### Historical standings and teams

The historical configuration contains division standings sources for every
configured season from Season 1 onward. Representative checks found:

- Season 1 is very sparse: its public driver table contains three names and
  teams, with the wins, podiums and points fields blank.
- Season 3 has explicit final positions, teams, race results, poles and points.
- Season 10 has final position, driver, team and points.
- Season 20 has final position, team, race-by-race results, poles, fastest laps
  and points, plus a separate statistics tab.
- Season 27 has the same broad modern coverage plus sprint statistics.

This means championship position, season, division and final-table team can be
recovered for much of the history. It does not prove every intra-season team or
division movement, and early seasons must carry a lower completeness rating.

The legacy teams workbook provides team rosters and Team Principal assignments.
Team Principal coverage is strong for Seasons 16-27. It is partial for Seasons
13, 12, 11, 10 and 8, absent from several earlier blocks, and has no Season 9
block. Season 28 Team Principals can be read from the current division Data
tabs. Missing older Team Principal records must remain `unknown`, not `none`.

### ASR

Full linked ASR workbooks are configured for Seasons 21-27 and for Seasons 8,
7, 5 and 4. Other seasons often have only summary facts such as track, champion
or winning constructor, and some have no surviving result. ASR participation
can therefore be shown only for seasons with participant evidence. A missing
ASR row must not be interpreted as proof that a driver did not participate.

### Season bans

No historical season-ban register was found. The live licence workbook contains
the rule threshold and a current Outstanding Bans list, but the inspected rows
were qualifying bans rather than season bans. A permanent profile's season-ban
marker must therefore begin empty and be added only from separately verified
evidence. It must never be inferred from licence points alone.

## Identity and display problems found

### Current names do not reliably join to the history list

After ignoring case, spaces and punctuation, 62 of the 94 current Season 28
gamertags match an alias in `Full Stats`; 32 do not. Some are likely spelling or
tag variants, for example:

- `alany73` and `Alany1973`;
- `SW155KING` and `SW155K1NG`;
- `GREEEENERz` and `GREEENERZ`;
- `TotalCeaser` and an existing `STR TotalCeaser` alias;
- `Bonta` and the existing iBonta/Bontabullets profile.

Others may genuinely be new people. Examples include `[MCD]Coder`, Arti Moreno,
axaloti-guy123, BobbyLyonsAFC, Delaxtz, GeorgeD2404, halfpint100, Po_dium,
rigd12, robowastaken, Soup9567, Voshund and several more. Similarity is only a
review hint; it is not sufficient evidence to merge profiles.

### Existing duplicate candidates

`KGS Atom` appears both as an alias on the GRL Atom/FGE Atom77 profile and as a
separate profile. A punctuation-insensitive comparison also makes `OG_James_96`
on the F1XL Punisher profile collide with the separate `OG James 96` profile.
Both require human confirmation.

### Formula matching uses only one name

Many `Full Stats` formulas take only the text before the first `/` and use it in
`VLOOKUP`/`IMPORTRANGE` calls. The other aliases help the public display but do
not make those formulas a reliable identity join. Historical values therefore
depend on old Sheets having been manually renamed or on someone maintaining the
primary name in exactly the expected form.

### The current public parser omits or misstates data

- `hall-of-records.html` starts one row too late and skips the first populated
  `Full Stats` driver row. It loads 807 of the 808 profile rows.
- It says `complete to S26`, although the source contains Season 27 values and a
  Season 28 block.
- The Season 28 block currently has no populated race-start values in the
  public `Full Stats` CSV, so current-season career totals are not yet present.
- The parser assumes every season occupies an exact six-column block. Irregular
  early blocks cause Season 6.5, Season 2 and Season 1 to be omitted from its
  season-by-season display.
- In the inspected data, 62 profiles have a stored total-season count that does
  not equal the number of season rows the public parser can display.
- Accolades fall back to partial text matching with `includes`. This can attach
  an honour to the wrong person when one short gamertag is contained in another.

These are audit findings only. They were not changed during this work.

## Field-by-field feasibility

| Profile information | Feasibility | Safe source and limitation |
|---|---|---|
| Current and former gamertags | Good after review | Start with `Full Stats` aliases, applications and confirmed admin knowledge. Do not auto-merge uncertain names. |
| Seasons competed | Good, uneven early | Division standings and stats; early seasons may show participation without full totals. |
| Divisions | Good | Season configuration plus each division's standings. Permit more than one division in one season. |
| Teams | Good as final/recorded assignments | Standings and legacy teams grid. Do not claim a complete movement timeline where none survives. |
| Wins, podiums and poles | Good for most seasons | Per-season stats and `Full Stats`, reconciled against results where needed. |
| Fastest laps | Partial | Present in modern standings/current stats, but absent from the current career-summary workbook and some older formats. |
| Race starts | Good for many seasons | Per-season stats and result grids; sparse early seasons require an incomplete marker. |
| Championship positions | Good from Season 3 onward, sparse before | Final standings position. Keep season and division with the position. |
| Team Principal history | Strong S16-28, partial earlier | Legacy teams grid and current Data tabs. Missing means unknown. |
| ASR participation | Partial by design | Full ASR result/line-up workbooks where linked; summary-only seasons cannot prove participation. |
| Season bans | Not currently recoverable as a history | Add only after manual evidence is supplied. |

## Recommended permanent model

Use separate simple tables rather than one extremely wide formula sheet:

1. `Drivers`: one stable `driver_id`, current display gamertag and archive state.
2. `DriverAliases`: every known gamertag, normalised search form, dates when
   known, verification status and source.
3. `DriverProfileMerges`: surviving ID, archived ID, who confirmed it, when,
   why and the evidence. The archived ID remains as a redirect/tombstone.
4. `DriverSeasonAssignments`: driver, season, division, team, assignment type,
   source and completeness. Multiple rows per season are allowed.
5. `DriverSeasonStats`: driver, season, division, starts, wins, podiums, poles,
   fastest laps, sprint wins, points and championship position, each with a
   completeness/source reference.
6. `TeamPrincipalAssignments`: driver, season and team, with source and
   completeness.
7. `ASRParticipations`: driver, season, team, result/status where known and
   source.
8. `SeasonBans`: only manually verified season bans and their source.
9. `SourceRecords`: original workbook ID, tab/GID, row or range, import date and
   confidence. This is the audit trail back to preserved data.

This structure also supports the future team-history feature because team and
Team Principal assignments are stored as linked facts rather than text embedded
inside a driver summary.

## Safe migration sequence

1. Export and checksum the original source workbooks. Do not alter them.
2. Import exact source facts into an isolated test master with source references.
3. Create candidate permanent profiles from `Full Stats`, not unquestioned
   final profiles.
4. Link exact confirmed aliases. Put spelling similarities and collisions into
   a human review queue.
5. Import current Season 28 identities and assignments as the operational
   anchor for the new backend.
6. Build season summaries from final standings and stats, marking every field
   `complete`, `partial` or `unknown`.
7. Reconcile totals and champions against the winners/awards workbook and the
   existing public pages.
8. Test on hidden comparison pages before any public profile replaces the
   current display.
9. From the first backend-managed season onward, write all new records by
   `driver_id` and generate Google Sheets as readable backups/exports.

## Decisions still requiring people

- Confirm the two existing duplicate-profile candidates.
- Review the 32 current-season names that do not exactly match a recorded alias.
- Supply any known historical season-ban records.
- Decide later whether public profiles show partial Team Principal and ASR
  history by default or behind an `available records` explanation.
- Decide whether old race-by-race results are worth importing beyond the
  summary statistics. They are not required for the first safe profile release.

