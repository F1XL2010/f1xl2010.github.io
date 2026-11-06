# Current operational state — 6 November 2026

## Live switch complete

- Public website: https://f1xl.co.uk/ — established public URLs retained.
- Staff entry: https://f1xl.co.uk/admincentre/ — intentionally off public navigation.
- Previous website: https://f1xl.co.uk/legacy/ — labelled reference, noindex, original sources retained.
- /next/ page links redirect to production, preserving query/fragment. **/next/fap-google-return.html remains the working Google sign-in callback.**
- Portal v409, 121 files, same project/deployment/owner/scopes. No new service introduced.
- 153 connected new-system workbooks/templates renamed from TEST to FAP. IDs and sharing unchanged by those renames; original historical/live source workbooks were not renamed.
- Real combined intake was already active on 3 November. The new ticket Form and existing application/staff/TT Forms keep their connected destinations.

## Data and checks at the switch

S28 has four divisions. The R1–R15 reconciliation includes D3's R14 rerun, tickets, appeals and confirmed ban/carryover decisions, with accepted differences from old LIVE retained. The last readiness checkpoint recorded 1,094 race rows, 155 applied cases and 36 appeals. Those are audit counts, not expected permanent constants.

The final bounded delta check found no new changes to previously verified R15 ranges. It did not establish that every cell outside those ranges was unchanged. Fresh backup comparison covered 169,852 input/formula cells in eleven private recovery copies.

Actual publication checks verified 61 published release files and all 18 established sitemap routes. The new source feeds returned four divisions in direct_division_v1 mode, 841 career rows, 1,502 honour rows and 216 track records with no feed error notes. These counts demonstrate the dated load, not blanket proof that every historical statistic is knowable.

Owner confirmed staff/phone checks on 5 November after v408. Launch browser checks confirmed owner entry, active S28 hub, result/standings loads, no unprocessed ticket submissions and R15 “Round complete”. No fabricated operational submission or save was performed. A final attempted phone-size screenshot did not actually apply the narrow viewport: it is not new mobile proof.

Evidence: [release](../reference/launch-2026-11-06/release.json), [Portal parity](../reference/launch-2026-11-06/portal-final-verification.json), [public publication](../reference/launch-2026-11-06/public-publication-verification.json), [feeds](../reference/launch-2026-11-06/public-feed-verification.json), [backup comparison](../reference/launch-2026-11-06/backup-content-verification.json).

## Immediate continuation

Normal Portal operation can continue. There is no continuing launch freeze and no outstanding instruction to wait for all staff to join. Observe the next genuine weekly workflow and fix a reproducible fault if one occurs; do not manufacture a new full audit to keep busy.

Current handover update is documentation only. No post-launch operational data was changed during it. The dated snapshot cannot promise no newer submissions/results exist when another AI reads it.

## Boundaries that must remain intact

Private Master, People and Registry stay private. Public division workbooks and selected Config views are deliberate. Ticket Write Up public sharing was corrected to reader, preserving named editors and Portal owner writes. Current manual sheet updates feed public readers without a separate duplicate-public-workbook publishing step.

Old books and /legacy/ are recovery/reference assets, not the second place to enter new results. /next/ and TEST-named code are not disposable sandboxes. More staff can be onboarded later without moving the site again.

Discord standings/team/calendar jobs retain their schedules; only source pointers changed at launch. Portal-controlled private runner exists. Application-alert route is OFF with no assigned recipient. Review/appeal/TP Discord alerts were dropped. Firebase is rejected.

The authoritative open/deferred list is [KNOWN-ISSUES](KNOWN-ISSUES.md), not the old launch plan. The preserved running log is in [the archive](../archive/2026-11-06-before-refresh/ai-pack/CURRENT-STATUS.md).
