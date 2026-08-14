# Known issues, fragility and technical debt

This is a risk register, not an instruction to fix everything immediately.

## High importance

### Google Sheets are both essential and structurally fragile

The website reads public CSV using fixed IDs, GIDs and assumed columns. Inserting/moving columns, renaming structural headers, changing sharing, or deleting a tab can break pages without a repository change.

### Historical formats vary substantially

Legacy parsing is split by season and weekend format. `results.html` explicitly records an unverified/known gap around some Season 22–27 qualifying fields and says the Season 24–27 sprint arrangement needs confirmation against original Sheets. Do not simplify these branches without a full season-by-season comparison.

### Older historical data is incomplete

`past-seasons.html` warns that older result tables may not include post-race penalties and that final score tables can be the authoritative outcome. Migration cannot invent missing data.

### Account ownership is outside the repository

Google ownership, GitHub Pages settings, domain/DNS, Discord administration and secret values are not recoverable from source code alone. A private access/ownership register remains necessary.

## Medium importance

### Page code is duplicated

CSS, JavaScript, navigation and footer markup are repeated across many large HTML files. This increases the risk of inconsistent changes. Simplification is desirable but must preserve static hosting, mobile layouts, SEO and page URLs.

### Configuration loading is duplicated

`config.js` is the browser loader, but `join.html`, `smgenerators.html`, root bot scripts and `bot/` scripts contain related or duplicated configuration/CSV logic. Changes to config structure may require several readers to be updated.

### Hardcoded fallback sources can become misleading

Several pages contain fallback Sheet IDs/GIDs while central config supplies the current value. A fallback may keep a page displaying old data instead of failing clearly.

### Current schedule title appears stale

`schedule.html` has an HTML title referring to Season 27 while live central configuration is Season 28. Treat as a visible/search metadata issue to confirm before changing.

### Service-worker deployment workflow is unusual

The workflow triggered by a main push edits `sw.js` and commits the version change. This can create an automatic follow-up commit. Confirm it does not loop and that the GitHub Pages source serves the intended revision.

### No unified automated website test suite

Testing is currently inspection, syntax checks and browser checks. Data-driven pages need representative live-data verification after changes.

### Root and `bot/` automation overlap

Root `bot.js`/`notifications.js` overlap with scripts under `bot/`. Usage must be established before removal. No conventional Node package manifest was seen at the repository root; scripts rely on built-in Node functionality and Actions environment/secrets.

## Lower importance or operational observations

- Some pages use `config.js`; others use direct hardcoded sources.
- `predictor.html` and `smgenerators.html` do not register the service worker while most public pages do.
- `smgenerators.html` is deliberately excluded by `robots.txt`.
- Search engines can index static explanatory text, but data injected only after client-side Sheet downloads may be less consistently discoverable.
- Browser `localStorage` flags are per-device and must not be treated as league records.
- Console debugging statements remain in several pages and bots.

## Deferred strategic work

- A protected, plain-English race-data entry interface.
- Standardisation or normalisation of historical season data.
- Consolidation of repeated page components and parsers.
- A verified, account-independent backup and ownership register.

These are not approved implementation tasks merely because they appear here.
