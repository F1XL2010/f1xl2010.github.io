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

[The v409 reference](../reference/portal-v409/manifest.json) was packaged from the payload verified against published source on 6 November, not from the potentially stale admin-app directory. It includes 121 files, including actual remote naming quirks. Treat it as dated evidence. Fetch current HEAD, published source and deployment before changes, preserve untouched files, and publish a selective reviewed release.

Current code retains TEST-named functions/properties/environment guards for compatibility and accepts TEST/FAP workbook names. Do not rename keys, drop guards or run TEST cleanup because of the wording.

See [DATA-SOURCES](DATA-SOURCES.md) for exact IDs; [OPERATIONS](OPERATIONS.md) for deployment and performance boundaries.
