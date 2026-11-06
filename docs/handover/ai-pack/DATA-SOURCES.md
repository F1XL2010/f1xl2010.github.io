# Operational source map — 6 November 2026

These IDs are routing information, not credentials. Names can change; verify identity by ID and current configured mapping. All rows below describe the live promoted system unless explicitly labelled old.

| Purpose | Workbook ID | Access / notes |
| --- | --- | --- |
| Website Config | 1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg | Public reader. Main gid 0; S28 gid 941487775 |
| S28 Master | 1ArcaVzI-2qTsaPmPI8IK8_pRCCVgs92wPwnq_ZncO-c | Private |
| S28 D1 | 1WyjXsSmmvX_5f_reIo71jlDKURiqKuhoV0h4b4gfTJg | Public reader |
| S28 D2 | 1IyyIjJrKUdmGtUy7oTWHUVss9TG9-GtjRTSXA_zyoBw | Public reader |
| S28 D3 | 1p0wdsZ3z41czUtGVLcT_afv8y9p7FzQ8Nma0d93YcD0 | Public reader |
| S28 D4 | 1aGiR3WLHatf9eiI_uM2jFEOwkPwMZ8u5FChb7obWxLE | Public reader |
| Ticket Write Up | 1xW2UqxG2joO1gpsUZobMM2qkTFDPLsZZQ78TvsmnlbI | Public reader; Website Export gid 1683645163 includes admin decisions |
| Permanent Driver Registry | 1Cn6FdLGjzrFpjXPyrd0ZimC46ieXDrdkPgez1TlS3-M | Private; public data through narrow JSON feeds |
| People & permissions | 1bcARUCd0sX3SwO9aXLtFdSRwl0sz2ySW6aCHuH5E588 | Private |
| Reference Data | 1_oomGdM8cKiah7jPjHc7PokEp3svQ_mhgfkvURIBjlI | Maintenance-controlled |
| Real Tickets & Apps intake | 1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ | Real multi-purpose response/archive workbook; do not replace |
| Historical team/principal source | 1f2ECx5qJxc18vFq62yUtdn_Hif6o0c-o_oibo6Pfwd8 | Legacy team facts; Seasons gid 0 |
| Historical ASR index | 1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk | Old Config deliberately retained for ASR gid 925717407 |

Public CSV pattern: https://docs.google.com/spreadsheets/d/WORKBOOK_ID/export?format=csv&gid=TAB_ID. Read current headers/layouts, not a guessed range from an old pack.

Selected Master-derived public views in Website Config are gids 22801001–22801008: teams, calendar, licence summary, bans, penalty guide, movements, overall and weekly views. The S28 season_master_sheet_id is deliberately Config's public ID. Current results/tables use direct_division_v1. Historical season routes must remain season-specific; don't replace them with S28 connections.

## Combined intake tabs

| Tab / function | GID |
| --- | ---: |
| Improved ticket FormResponses6 | 546580155 |
| F1 Apps | 278899100 |
| Legacy F1 Tickets | 2140272460 |
| Staff Apps | 1200436264 |
| TT Submission | 602943702 |
| F2 Apps | 1168768636 |
| F1 Apps Archive | 2137215564 |
| Tickets Archive | 154195707 |
| F2 Apps Archive | 1638862917 |

Current property names: F1XL_INTAKE_CONNECTION_PROFILE=combined and F1XL_COMBINED_TICKET_FORM_SHEET_ID=546580155. Historical source/receipt identifiers are not to be reset on a rename. Reconnecting a Form can create a new response tab even in the same workbook; always read back its actual ID.

Improved ticket Form editor ID: 19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo.
Public form: https://docs.google.com/forms/d/e/1FAIpQLScv3nAEp1TzO7pr_j1IeEucc6ZHkW9MrdWHdFlq63IQ16I1oQ/viewform.
It has the season-driver list and session question. Existing old links still work through the legacy reader; don't close the old Form without a deliberate migration.

Driver application public ID: 1FAIpQLSdYT9Bb6x-bPb7NKszdiF5Xc1ZkT1mYVJo4xR5Q4TCAYlZxsA. Other existing application/staff/TT Forms retain their routes. Check actual current public applications page and native Form destination before altering them; a public Form URL alone does not prove response routing.

## Portal identity

- Owner: f1xboxleagues@gmail.com (ordinary Google account, not an assumed Workspace domain).
- Apps Script project: 1aCtr-lzpVPSqiXEqP7IWLsKyfBs49-pT3T82I4V-qcDS67jwSFX4p1b_
- Deployment: AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ
- Execution URL: https://script.google.com/macros/s/AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ/exec
- Public selected feeds append ?view=public-history or ?view=track-records.
- Google callback: https://f1xl.co.uk/next/fap-google-return.html
- Staff-facing short URL: https://f1xl.co.uk/admincentre/

Deployment access ANYONE_ANONYMOUS allows sign-in/public feeds; protected staff operations are guarded server-side. Execution USER_DEPLOYING is intentional. Do not “secure” the deployment by changing access blindly and breaking sign-in/feed delivery.

## Original references, not the new current write targets

Old Config: 1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk; old S28 gid 1935684132.
Old D1: 1ttwqU3zDcLIG-PAjpqZKoObhVFr2GI6D8k1nhu1E5zs.
Old D2: 1H56yFQIbHp3TeMYi9utU40QBL8P3HGUGDuN9S4UXaZQ.
Old D3: 19A2QyuF3Qlj557D-uQUp0nt_pvzMA2NId1nSFwVZzVk.
Old D4: 1EfE1MePPePr0CVMrDawMtXqv8DH5pJ1Pa7k6kV6aPbc.
Old Ticket Write Up: 1018L2jzNseasQVfNNoZCh_fDUbMIQ93EP2ahJvNc6F0.
Old track records: 18vD7g_29uzRSr_GYbXkNjclCHe8F_bsp4cY69TjXrW4.
Old honours/records: 1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI.

Originals are retained. They may intentionally differ because of accepted corrections; don't use “match old LIVE exactly” to undo those corrections. The [153 rename pairs](../reference/launch-2026-11-06/rename-progress.json) identify connected FAP copies, not original books. The archived August source map describes the old system only.

## Dependency discovery beyond this shortlist

Use current Config Main and each season tab, not hardcoded guesses, to enumerate all 29 season labels including S7.5. The 5 November audit recorded 149 anonymous-readable sources and 3,038 spreadsheet/tab routes. These were checked before launch, not re-enumerated during this documentation refresh. Read through both callers and formula/import targets when changing a schema; include bots, templates, manual helpers, history and current-season views.
