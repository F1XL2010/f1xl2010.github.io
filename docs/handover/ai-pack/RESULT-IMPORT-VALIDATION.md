# Results import and assignment validation

**The S28 reconstruction is complete through R15 and the working system is live.** The old instruction “TEST writes only / LIVE read-only” described the replay before 6 November; it no longer identifies a safe sandbox. Scope any new import/correction explicitly.

1. Read both the intended target and original source. Confirm round, division, sprint/feature format and whether source penalties are already included.
2. Match each person to exactly one permanent/current season entrant; use recorded aliases and owner confirmations. Unknown identity requires confirmation, not fuzzy invention.
3. Preserve team/seat valid for that historical session, not the present roster. Reserve = Reserve and blank seat. Use tier/seat mapping for real teams/free agents.
4. Read actual saved rows after writes/flush, not merely your submitted payload or an alias-normalized comparison. Run the deployed validation equivalents of resultsEntryRoundValues_ and divisionResultsSavedIssues_; locate them in current remote source (module names have historical singular/plural differences).
5. Run the read-only driverMovementScan_ for affected divisions across their configured entered rounds. It may propose history snapshots: do not commit those writes unless executing an authorised move. Fix/report existing historical blockers rather than leaving them to surprise the next user.
6. Verify qualifying/sprint qualifying, sprint/feature rows, statuses, tyres, fastest laps, SC/red flags, times/gaps, penalties, positions and scoring. Sorting after adjustments must preserve the whole driver's identity/team/seat tuple.
7. Reconcile driver totals, team totals and relevant current/career metrics separately. Respect official/manual historical facts and feature/sprint/ASR definitions.
8. Verify unaffected input/formula ranges and public readback. Current direct-source mode requires no duplicate snapshot-publication command.
9. Record any agreed difference from old LIVE with evidence and reason. Never overwrite an accepted correction simply to make a visual comparison identical.

Built-in Portal saves canonicalise unambiguous names, reject duplicates/unknowns and validate saved assignments with rollback. Direct Sheet writes or bespoke helper scripts bypass parts of that protection, so the above checks remain necessary. A failed move's error may identify another row/person in the division; do not disable the guard or guess a seat to get past it.
