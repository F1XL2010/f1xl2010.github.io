# Tickets, appeals and penalties

## Intended operator experience

The main Tickets area is for the head admin/head steward. Separate steward and appeal desks should be simple, preferably one screen, with large writing fields. Reviewers can see colleagues' decisions but may edit only their own assigned review. The appeal desk contains appealed cases. Head Steward manages both review and appeal leadership; no separate Head of Appeals role is needed.

Show details, evidence, session and linked defence together. An optional Head Steward Note is internal only; don't make it a required field on every case. A ticket against a steward must not disappear merely because they are involved; visibility is separate from permission to adjudicate. Preserve recusal/own-review controls.

TPs see relevant submitted tickets immediately, including statements/evidence, without waiting for processing/final decisions. Their hub must not expose confidential steward deliberations or internal notes. The November fix covers both submitted sides, game/admin cases, visible-panel polling, error reporting and modal retention.

## Source and processing

Real submissions arrive in the combined Tickets & Apps workbook. Improved and legacy ticket Forms have different schemas; keep both readers. Use the actual form session (Qualifying, Sprint qualifying, Sprint race, Feature race), not an assumption that every case concerns the main race. Older cases may need an explicit session.

Processing imports a case into Ticket Write Up with permanent identity/receipt links. Raw response row number or displayed round ticket number is not its permanent case ID. Keep linked defence/evidence when correcting a duplicate or wrong-round case. Moving a case requires all related links/history to move coherently; an old approval to clear three specific R7 rows is not authority to clear today's rows.

Admins is a valid administrative reporter. Codies/Codemasters is a valid game target; neither needs a fake permanent driver. Real punished drivers must resolve to one Season Entrants identity. Editing a raw submission after import does not necessarily update the already-created case; inspect the imported mapping and synchronization path. Never invent a driver record just to clear validation.

Application acceptance and ticket import use receipts/journals so retries do not duplicate work. “Missing or duplicate permanent case ID” is a case-link problem, not automatically a missing driver or permission to press Complete round and ignore it.

## Final decisions and appeals

The owner wants the simplicity of the old sheet: review → final decision → correct points/penalties → public outcome, without a separate confusing publishing ceremony. Final decisions/completion integrate licence/threshold/export handling; preserve actual pending/error indications. A harmless instruction must not make a fully completed round appear outstanding.

Appeals revise the effective outcome of the original case. If an original penalty was applied, the system must reconcile the difference, including removing points/time/bans where overturned. It must not leave the original penalty in the licence or add a second full penalty. An upheld appeal leaves the original effective penalty once.

An imported already-completed LIVE decision/result may already contain the adjustment. “Already included” means that recorded result time/order already incorporates it, so record/reconcile the decision without applying the seconds a second time. Do not use this flag as a way to hide an unexplained mismatch.

Case identity, round, division, session, driver, decision, licence effect, result adjustment, ban/carryover status and Website Export must agree before reporting fully concluded. Where results await a genuine adjustment, say so explicitly. A successful review-text save is not proof that all downstream actions completed.

## Penalty rules

- Reprimands may be issued with or without time. A time penalty is numeric seconds; a qualifying-ban label must not be put in a numeric seconds field.
- Race disqualification carries **3 licence points**, as requested.
- Time removal is supported: e.g. “3 seconds removed”, not a malformed negative “penalty” label. Only the intended time/result effect applies; do not invent accompanying licence points.
- Accumulated penalties progress through qualifying bans, further qualifying bans, race ban and admin review. **Read current Penalty Guide/code for numeric thresholds**; do not invent them from this prose or from another season.
- Threshold bans should be reconciled during final decisions/completion and shown clearly. A stray “Accumulated penalty check awaiting admin review” message is not proof of a real unresolved ban.
- Direct race/season bans need explicit recorded decisions and affected rounds; do not infer an unrecorded season ban solely from total points.
- Carryover: if a time-penalised driver DNF'd the source race, carry it to the **next race they actually participate in**, sprint or feature, including a same-weekend feature after a sprint. It rolls **once only**. If they DNF that next participating race, it is wiped. Missed races do not use up that one attempt.
- Carryover can be controlled from the ticket itself as well as Licences & Bans so staff do not have to remember which ticket generated it.
- Results-side outstanding penalties/served bans are handled in place/modal. Never navigate away and lose unsaved result input.
- A race-ban service can be recorded when the driver does not attend. Absence alone does not prove service without the decision/schedule or confirmation. Multiple qualifying bans: record only the one actually served at that session unless evidence says otherwise.

## Confirmed historical service notes

These confirmations justified the S28 replay, not a new bulk-write instruction:
- TheInfinityJims R1 qualifying ban served at R2.
- R10: AllOwaYaFace served one of two outstanding QBs; F1XL Senna was initially recorded there; Imi's ticket confirmed a QB; RPL Titan Iron's race ban was confirmed served.
- Senna was later clarified as having served elsewhere, exact round unknown. Owner explicitly approved retaining Served and replacing the incorrect R10 reference with “Served elsewhere; round unconfirmed”. **The later correction takes precedence.**
- R12: Imi and Scrubs each served one QB, not all Imi's outstanding bans.
- R13 Bahrain: Chetty and Contay each served the R12 QB.
- R14: rigd12 served one QB in feature qualifying, despite a sprint qualifying time.
- R14 rerun/R15: owner confirmed AllOwaYaFace and Imi's scheduled R14 race bans, AllOwa's remaining R15 QB, EliteLDOG's R15 QB and VERSTAPPEN95/Imi's R15 race bans.
- Voshund's questioned ban was waived; do not reopen it as unserved. Retain the actual recorded waiver evidence.
- Owner said all LIVE R15 data was up to date: BT7274#8138's R14→R15 five seconds must not be added again.

## Head steward's short operating checklist

1. Select the intended season/round; check incoming names, division, session and evidence.
2. Link a defence to its original case and resolve any real driver identity before releasing review.
3. Release new cases when ready; stewards can work incrementally before Tuesday night's deadline. Dates are useful reminders, not a reason to hide already-ready Monday cases.
4. Check each required steward review or recusal; use the head-admin process for a legitimate administrative case.
5. Set final outcomes and any intended points, time addition/removal or ban.
6. Review the actual result adjustment, including already-included changes and any carryover.
7. Complete/check the round's final-decision process and read its saved status; don't ignore an unconfirmed save.
8. If an appeal arrives, use its linked case, review it, save the effective appeal decision and complete the resulting reconciliation.
9. Confirm licences/bans/carryovers and public Website Export reflect the effective outcome once; check changed finishing positions where seconds matter.
10. Report any genuine unresolved item by case/driver/session. Do not mark “all concluded” if a result adjustment or confirmation remains pending.

Exact button labels can evolve. Re-read the current screen/service before giving click-by-click guidance.
