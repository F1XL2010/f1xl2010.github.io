# Safe operating procedures

These are AI-facing procedures. Explain them to the owner one step at a time; do not hand the owner this entire file unless requested.

## Begin every task

1. Confirm the requested outcome and whether it is inspection or implementation.
2. Run `git status --short --branch`.
3. Inspect relevant code and live public data before proposing changes.
4. Identify whether the request affects website files, Google data, an external service or all three.
5. Preserve unrelated working-tree changes.

## Local preview

From the repository root:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` or a page such as `http://127.0.0.1:8000/standings.html`.

Check the port first and record the process ID when starting a background server. Keep it running only as long as requested. Stop the exact recorded process; do not terminate unrelated Python processes.

## Safe website change

1. Inspect the page and every shared dependency.
2. Inspect the corresponding live Sheet columns/rows if data interpretation is involved.
3. Make the smallest scoped edit.
4. Check JavaScript syntax and `git diff --check`.
5. Review the complete diff.
6. Test the affected desktop and mobile layouts through a local web server.
7. Verify live data examples, including zero, decimal, missing and multiple-ticket/session cases where applicable.
8. Run `git status --short` and report every changed file.
9. Do not commit or push unless explicitly requested.

## Publishing

Before publishing:

- Confirm the owner approved the final diff.
- Confirm live public data remains reachable.
- Check `sitemap.xml`, titles and URLs if pages changed.
- Confirm no credentials or local-only files entered the diff.
- Confirm the target branch and remote.

Pushing `main` is expected to affect the live GitHub Pages site. The cache-version workflow may create an additional automatic `sw.js` commit. After publishing, check the Actions run, the live page and browser console.

Never force-push or rewrite shared history without an exceptional, owner-approved recovery plan.

## Starting a new season

The present design relies on the central configuration workbook.

1. Back up the central configuration and current season workbooks.
2. Create new division workbooks from a verified current template; do not reuse or clear historical workbooks.
3. Preserve expected tab structures and record every workbook ID/GID.
4. Add the new season configuration tab to the central workbook.
5. Add the new season row above the old season in the main registry, as its live note instructs.
6. Verify `loadConfig()`, `getCurrentSeason()` and `loadSeasonConfig(newSeason)` read it correctly.
7. Test home, standings, results, teams, schedule, social-media generator and bots.
8. Update `DATA-SOURCES.md`, `CURRENT-STATUS.md` and pack version/changelog.

Do not assume the highest-numbered season should become current unless the new season data is ready for public use; the current loader chooses the highest configured season key.

## Updating Sheet structures

Sheet columns are effectively an API. Changing a label, inserting a column or moving a block can break the website.

Before a Sheet layout change:

1. Export a backup.
2. Identify every reader in HTML, shared JS and bot scripts.
3. Create a copy or test tab.
4. Update and test parsers against representative real data.
5. Compare row counts, points totals, winners and edge cases.
6. Switch configuration only after approval.
7. Retain the original source and a mapping record.

## Ticket outcomes

`ticket-outcomes.html` reads a global outcome Sheet. Its important fixed columns are zero-based:

- Race `0`, ticket number `1`, division `2`.
- Submitter `3`, offender `5`.
- Description/evidence/defence `7–16`.
- Driver punished `17`, points `18`, penalty `19`, evaluation `20`.
- Submitter outcome/points/penalty `21–23`.
- Offender outcome/points/penalty `24–26`.
- Appeal fields begin at `27`.

In the current data, `Submitter Outcome`/`Offender Outcome` are points added by that ticket. `Submitter Points`/`Offender Points` are running totals after that ticket. The page derives “Points Prior to Race” from each driver’s earliest appearance in that race, subtracting points added there. Multiple tickets in the same race must retain the same prior-race total.

## Documentation maintenance

After material approved work:

- Update facts, not aspirations.
- Add a dated decision when architecture or policy changes.
- Update known issues rather than deleting history without explanation.
- Update current status and pack dates.
- Keep the human guide short; place technical depth in the AI pack.
- Never record secrets.

A weekly review should report discrepancies and propose documentation edits. Automatic silent code, Sheet, commit or external-service changes are not permitted by the present review policy.
