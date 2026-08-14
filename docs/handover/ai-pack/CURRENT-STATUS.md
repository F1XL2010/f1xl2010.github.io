# Current project status

Snapshot date: 14 August 2026

## Repository

- Branch inspected: `main`
- Remote: `https://github.com/F1XL2010/f1xl2010.github.io.git`
- Baseline commit before handover-document creation: `eb72536` (`Update ticket-outcomes.html`)
- Working tree was clean before this documentation task.
- This handover pack is being created as uncommitted work unless the owner separately authorises a commit.

Recent inspected commits:

- `eb72536` — ticket outcomes update.
- `33d392d` and `ef94b74` — standings updates.

Do not assume later work has been committed; always run Git status and inspect history.

## Live configuration

- Current detected season: 28.
- Configured divisions: 4.
- Central configuration and Season 28 configuration were publicly reachable as CSV during this review.
- Full IDs and GIDs are recorded in `DATA-SOURCES.md`.

## Recently established ticket behaviour

The Ticket Outcomes display now distinguishes points added by a ticket from points held before the race. Because the Sheet stores running totals after each ticket, the page derives a race-start total from the driver’s first appearance in that race. Verify this behaviour if ticket columns or Sheet formulas change.

## Strategic position

- Historical standardisation was discussed but deliberately paused.
- Any future standard structure should represent sessions as optional records rather than fixed horizontal blocks, allowing normal, early-sprint and modern-sprint formats.
- The original Sheets must remain unchanged during any migration.
- The immediate governance priority is durable documentation, backups and succession readiness.

## Documentation review

A weekly review was configured in the owner’s current Codex task for Fridays at 10:00 local time. It is instructed to report discrepancies and propose documentation changes without editing code, Sheets, commits or services. This automation is account-specific and must be recreated by a successor.
