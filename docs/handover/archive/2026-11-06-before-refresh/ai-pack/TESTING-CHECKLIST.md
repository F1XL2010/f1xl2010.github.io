# Testing checklist

Apply checks in proportion to the change. Record what was actually tested.

## Before editing

- [ ] `git status --short --branch` recorded.
- [ ] Relevant page, shared files and live data inspected.
- [ ] Unrelated owner changes identified and preserved.
- [ ] Data backup confirmed for any approved Sheet change.

## Static checks

- [ ] HTML/JavaScript syntax checked.
- [ ] `git diff --check` passes.
- [ ] Complete diff contains only intended files/lines.
- [ ] No passwords, tokens, private URLs or personal information added.
- [ ] File encoding and visible punctuation remain correct.

## Browser checks

- [ ] Served through a local HTTP server, not opened directly.
- [ ] Page loads without console errors.
- [ ] Live Google data loads.
- [ ] Desktop layout checked.
- [ ] Mobile breakpoint/layout checked.
- [ ] Navigation and keyboard access checked where affected.
- [ ] Empty, zero, decimal, missing and long-text cases checked where relevant.
- [ ] Existing unaffected sections spot-checked.
- [ ] Service-worker caching considered; reload/update behaviour checked when needed.

## Data checks

- [ ] Correct Sheet ID and GID confirmed from live configuration.
- [ ] Header names and column positions confirmed.
- [ ] Representative rows compared manually.
- [ ] Row counts/totals compared for migrations.
- [ ] Multiple divisions and session/race formats considered.
- [ ] Historical official totals preserved.

## Search/accessibility checks

- [ ] Existing URL preserved or an approved redirect plan exists.
- [ ] `<title>`, headings and visible descriptive text remain meaningful.
- [ ] `sitemap.xml`, navigation and `robots.txt` updated if page discovery changed.
- [ ] Important public information remains readable without login.
- [ ] Images retain useful alternative text where affected.
- [ ] No important content was unnecessarily hidden from crawlers behind interaction-only UI.

## Finish

- [ ] Final `git status --short` reported.
- [ ] Exact changed files and outcome explained in plain English.
- [ ] Tests and uncertainties reported honestly.
- [ ] Documentation updated if architecture, data or operations changed.
- [ ] No commit/push unless separately authorised.
