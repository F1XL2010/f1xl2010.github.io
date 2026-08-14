# Data sources and external dependencies

Last live verification: 14 August 2026

## Central configuration — authoritative routing hub

- Workbook ID: `1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk`
- Main configuration GID: `0`
- Public CSV pattern: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`
- Shared loader: `config.js`

The website expects this workbook and relevant tabs to be publicly readable as CSV. If access is removed or the layout changes, many pages can fail simultaneously.

Do not treat fallback IDs in individual pages as automatically authoritative. The live central configuration normally overrides them.

## Current Season 28 configuration

- Season configuration tab GID: `1935684132`
- Configured divisions: 4

| Division | Workbook ID |
|---|---|
| 1 | `1ttwqU3zDcLIG-PAjpqZKoObhVFr2GI6D8k1nhu1E5zs` |
| 2 | `1H56yFQIbHp3TeMYi9utU40QBL8P3HGUGDuN9S4UXaZQ` |
| 3 | `19A2QyuF3Qlj557D-uQUp0nt_pvzMA2NId1nSFwVZzVk` |
| 4 | `1EfE1MePPePr0CVMrDawMtXqv8DH5pJ1Pa7k6kV6aPbc` |

All four current division workbooks use the same configured GIDs:

| Purpose | GID |
|---|---|
| Team information | `95446837` |
| Driver results/standings | `595089088` |
| Constructors standings | `1457486856` |
| Driver statistics calculation | `799244598` |
| Team statistics | `434550697` |
| Calendar | `1747860846` |

Round GIDs:

| Round | GID | Round | GID | Round | GID |
|---:|---:|---:|---:|---:|---:|
| 1 | `165232587` | 8 | `877507650` | 15 | `460228432` |
| 2 | `1873005901` | 9 | `1150082051` | 16 | `632610963` |
| 3 | `1713649619` | 10 | `600799664` | 17 | `302760550` |
| 4 | `935125108` | 11 | `1250748927` | 18 | `1098501611` |
| 5 | `2023273826` | 12 | `114600304` | 19 | `460124780` |
| 6 | `294284986` | 13 | `459050546` | 20 | `1142851228` |
| 7 | `1195358218` | 14 | `632435722` | 21 | `1022646122` |

## Current overall/weekly source

Season 28 `overall_gid` is stored as a full URL:

- Workbook ID: `1WU73L5BL9ReRHx9_ZorSQPsKlfbkbikcLByFfjuiup4`
- Overall tab GID from URL: `165874365`
- Weekly totals GID: `1176111219`

`standings.html` and `past-seasons.html` parse these values. Full-URL parsing is intentional.

## Global workbooks and tabs

| Purpose | Workbook ID | GID/source |
|---|---|---|
| Ticket outcomes | `1018L2jzNseasQVfNNoZCh_fDUbMIQ93EP2ahJvNc6F0` | `1683645163` |
| Drivers licence (live configured ID) | `1vtaq6nq2aVH-eJ0U6qHQtBfHPX4nEiGTiNhlT1VNP8k` | Summary `1841705621`; bans `1379123195`; penalty guide `253069176` |
| Legacy teams | `1f2ECx5qJxc18vFq62yUtdn_Hif6o0c-o_oibo6Pfwd8` | `0` |
| Track records | `18vD7g_29uzRSr_GYbXkNjclCHe8F_bsp4cY69TjXrW4` | Page array: `0`, `343950932`, `806509057`, `557492395`, `1468409556`, `1147341365`, `1917666666`, `468074839`; track-info GID `1416959538` is also configured |
| Hall of Fame/records | `1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI` | Main HOF fallback `82852858`; other URLs supplied by central config |

The source code contains some older fallback IDs, notably the licence workbook fallback `1w097LDtWUgduup-_gZLeo7FOQ9uXkMiS1C9de2k22Kk`. Live configuration currently overrides it. Keep fallbacks documented as fallbacks, not current truth.

## Google Forms

These public form identifiers are embedded directly in HTML:

| Page | Purpose/position | Form ID |
|---|---|---|
| `submit-ticket.html` | Ticket submission | `1FAIpQLSfPWhk_8XbktW29Bt2LOhZfPoOU7v-knZVpYIF29TQYrRvOSQ` |
| `applications.html` | First application form | `1FAIpQLSdYT9Bb6x-bPb7NKszdiF5Xc1ZkT1mYVJo4xR5Q4TCAYlZxsA` |
| `applications.html` | Second application form | `1FAIpQLSczd-YDc_6yAuolgyWkRQmboaPzax8sqpYYwJ3f0vFTf8rKgw` |
| `applications.html` | Third application form | `1FAIpQLSdWo3z0h758ZlMGGYuOyg47ky1hZB0hVF54VctH9-RHP8OkvQ` |
| `predictor.html` | Predictor registration | `1FAIpQLScVO60jX8_uwjNE3T1kkoqi9jI5LAWPKdEfNVRgJq3m3oNRhg` |
| `predictor.html` | Predictor entry | `1FAIpQLSdcNGXLMxa4I8svhTwvU0S2yjgyIUYlke8KTjY8rgtRMVjLsg` |

Form response destinations and ownership are not discoverable from the public embed URLs. Record and verify them separately in the private account-access register.

## Other public sources

- Predictor leaderboard published CSV: `https://docs.google.com/spreadsheets/d/e/2PACX-1vRPvnEMdhTvyNaDprsTlH1IrLRj3rMcuwTnOGrB2Aiigv48lLbImIsG_LiPPQVnkqUBZDL2mKT5sY6Q/pub?gid=748214951&single=true&output=csv`
- Published league rules URL is supplied by central config as a Google Docs published URL.
- Google Fonts, cdnjs and external media/storefront domains are loaded by relevant pages.
- Discord API is used by bot scripts, not by ordinary public-page rendering.
- GitHub Gist state is used by draft/notification automation; its ID/token come from secrets.

## Browser-only local storage

- `ticket-outcomes.html`: remembers ticket counts seen per division.
- `predictor.html`: remembers a registration-state flag.
- `index.html`: remembers dismissal of the PWA-install prompt.

These values are stored only in an individual visitor’s browser and are not authoritative league data.

## Data-write boundary

The public website should remain read-only with respect to Google Sheets. A future data-entry interface must write through a protected backend—Google Apps Script is a likely option—not through credentials embedded in public JavaScript.

## Historical registry

The main central configuration contains season-tab GIDs from Season 1 through Season 28, plus Season 7.5. `config.js` uses these to load individual season configurations.

| Season key | Configuration GID |
|---|---:|
| `s28_gid` | `1935684132` |
| `s27_gid` | `1008993244` |
| `s26_gid` | `233795974` |
| `s25_gid` | `1289268496` |
| `s24_gid` | `2091517560` |
| `s23_gid` | `229096171` |
| `s22_gid` | `1744319006` |
| `s21_gid` | `950044964` |
| `s20_gid` | `972698268` |
| `s19_gid` | `1295563646` |
| `s18_gid` | `1668272974` |
| `s17_gid` | `1081242987` |
| `s16_gid` | `1701734499` |
| `s15_gid` | `636428571` |
| `s14_gid` | `598858512` |
| `s13_gid` | `623728845` |
| `s12_gid` | `539663946` |
| `s11_gid` | `1729803418` |
| `s10_gid` | `412931180` |
| `s9_gid` | `1952133610` |
| `s8_gid` | `311740138` |
| `s7_5_gid` | `379712963` |
| `s7_gid` | `1718663507` |
| `s6_gid` | `2102471839` |
| `s5_gid` | `501085936` |
| `s4_gid` | `487011166` |
| `s3_gid` | `1476753858` |
| `s2_gid` | `255826708` |
| `s1_gid` | `774144201` |

Do not copy this table back into code as another source of truth. It is a handover snapshot. Always re-read the live main configuration before making season-dependent decisions.
