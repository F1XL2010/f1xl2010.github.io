# Website architecture

## Plain-English summary

F1XL is primarily a collection of standalone HTML pages hosted by GitHub Pages. There is no conventional website database or application server serving visitors. A visitor’s browser downloads an HTML page, and JavaScript in that page downloads public CSV data from Google Sheets and turns it into tables, cards and statistics.

```text
Visitor
  ↓
f1xl.co.uk / GitHub Pages
  ↓
HTML, inline CSS, inline JavaScript, images
  ↓
Public Google Sheets CSV + embedded Google Forms
  ↓
Rendered standings, results, schedules, teams and other content
```

Google Sheets are therefore the principal live data source. GitHub contains the presentation and parsing rules; Google contains most frequently changing league information.

## Hosting and domain

- Git remote: `https://github.com/F1XL2010/f1xl2010.github.io.git`
- Main branch: `main`
- Custom domain from `CNAME`: `f1xl.co.uk`
- Public canonical host used by sitemap: `https://www.f1xl.co.uk/`
- The repository appears to be published through GitHub Pages. Confirm the Pages source and domain settings in GitHub before a handover because those settings are external to this repository.

## File organisation

- Root `*.html`: public pages and internal utilities.
- `config.js`: shared browser-side Google configuration loader.
- `sw.js`: service worker/PWA cache rules.
- `manifest.json`: installable web-app metadata.
- `sitemap.xml`, `robots.txt`, `CNAME`: discovery, crawling and domain configuration.
- `images/`: backgrounds, flags, team logos, tracks, icons and Hall of Fame/ASR artwork.
- `bot/`: Node.js scripts used by GitHub Actions to update Discord content.
- `.github/workflows/`: scheduled/manual Discord workflows and service-worker cache versioning.
- `video-gen/`: assets/scripts used by media-generation tooling; inspect separately before changing.
- `roster_snapshot.json`: roster state used by bot logic.
- `docs/handover/`: the durable succession documentation.

## Main public pages

| File | Purpose | Main live source |
|---|---|---|
| `index.html` | Home page and next-race information | Current season calendar Sheet |
| `standings.html` | Division, overall, constructors and driver/team statistics | Current season division Sheets and overall/weekly totals Sheet |
| `results.html` | Current and historical round results | Season configuration and division round tabs |
| `past-seasons.html` | Historical championships and statistics | Historical season tabs and overall Sheets |
| `teams.html` | Current teams/line-ups plus legacy fallback | Current team-info tabs; legacy teams Sheet |
| `schedule.html` | Current calendar | Division 1 current-season calendar tab |
| `submit-ticket.html` | Embedded ticket-submission form | Hardcoded Google Form |
| `ticket-outcomes.html` | Stewarding ticket outcomes | Globally configured ticket outcomes Sheet |
| `drivers-licence.html` | Licence points and upcoming bans | Globally configured licence Sheet tabs |
| `applications.html` | Application forms | Three embedded Google Forms |
| `join.html` | Joining status/information | Central config, using a local duplicated loader |
| `predictor.html` | Predictor registration/entry and leaderboard | Two Google Forms, a published CSV and localStorage |
| `asr.html` | All Star Race content | ASR configuration and linked Sheets |
| `hall-of-fame.html` | Winners and honours | Global Hall of Fame workbook/config URLs |
| `hall-of-records.html` | Statistical records | Stats, winners and historical team sources |
| `track-records.html` | Track records by division | Dedicated workbook with fixed GIDs |
| `league-rules.html` | Published league rules | Google Doc URL from central config |
| `merch.html` | Merchandise | Mostly static/external storefront content |
| `music.html` | Music page | Mostly static/external media content |
| `smgenerators.html` | Internal/social-media graphics generator | Central config and season Sheets; blocked in `robots.txt` |

## CSS and JavaScript structure

Most pages are monolithic:

- CSS is stored in a `<style>` block inside each HTML file.
- Page-specific JavaScript is stored in a `<script>` block near the end of that file.
- Navigation and footer markup are repeated across many pages.
- Pages that need season data normally include `config.js`.

This makes each page easy to upload independently but creates substantial duplication. A future simplification must preserve page appearance, mobile behaviour, SEO content and the ability to host statically.

## Configuration flow

`config.js` reads central workbook `1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk`, main tab GID `0`.

The main tab contains:

- Global keys such as tickets, licence, rules and records.
- A registry mapping season names such as `s28_gid` to configuration-tab GIDs.
- Extra historical fields such as `overall_gid` and `w_totals_gid`.

`loadSeasonConfig(season)` then downloads the relevant configuration tab from the same central workbook. That tab identifies division workbooks and each functional tab/race GID.

The current season is inferred as the highest configured season key. There is no single explicit `current_season` field in the inspected loader.

## Historical-format compatibility

Historical Sheets are not uniform.

- `results.html` routes Season 27 and below to a separate legacy renderer.
- Season 20, Seasons 21–23, Seasons 24–27, and Season 19 and earlier have different parsing branches.
- Normal and sprint weekends use different section arrangements.
- The code explicitly says some Season 24–27 sprint column assumptions remain unverified.
- `past-seasons.html` selects separate parsers for different season groups, including dedicated Season 10, Season 20+, and Season 28 handling.
- Some old season registry entries store a full workbook URL where newer entries use ordinary IDs/GIDs.
- Older seasons may be incomplete; official final tables can be more authoritative than reconstructed round results.

Do not remove a legacy branch until every affected season has been compared against its original source.

## PWA/service worker

`sw.js` caches the website shell. HTML navigation is network-first with cached fallback. Google and other data hosts are explicitly never cached, so Sheet data should remain live.

The workflow `.github/workflows/f1xl-deploy.yml` replaces the service-worker version with a commit hash after pushes to `main`, then creates an automatic commit changing `sw.js`. This is unusual and can create a second commit after an ordinary main-branch update. Confirm workflow runs after publishing.

## Discord automation

GitHub Actions run scripts under `bot/`:

- `f1xl-lineups.yml`: Mondays and Fridays at 09:00 UTC, plus manual runs.
- `f1xl-standings.yml`: daily at 12:00 and 18:00 UTC, plus manual runs.
- `f1xl-draft.yml`: manual draft-night run.

They use GitHub Actions secrets for Discord and Gist access. Secret values are deliberately not documented. Names and recovery considerations appear in `BACKUP-AND-RECOVERY.md`.

Root-level `bot.js` and `notifications.js` overlap with some scripts under `bot/`. Determine which workflows or external processes still use the root copies before deleting or consolidating anything.
