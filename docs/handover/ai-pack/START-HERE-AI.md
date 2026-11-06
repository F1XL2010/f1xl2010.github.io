# Start here — replacement AI

This pack is designed to let you continue without the original conversation. The owner runs F1XL and is not a developer. The objective is a simple, fast league administration system, backed by manually usable Google Sheets, with a public website that preserves the league's history and established URLs.

## Read this first

1. [CURRENT-STATUS](CURRENT-STATUS.md): what is live, verified and not currently being changed.
2. [PROJECT-PRINCIPLES](PROJECT-PRINCIPLES.md): how to work with the owner and avoid repeating rejected approaches.
3. Select the relevant topic below. Read its rules **before** touching code or data.
4. Inspect the actual repository and relevant deployed source/data read-only. Identify drift since this dated pack; do not treat the pack as a live API response.
5. Give the owner a brief account of what you found and the next useful step. Do not resume a past “go”, reset, release, consent or deletion as if newly authorised.

**The website switched on 6 November 2026. /next/ is now a compatibility route, not an isolated test environment. TEST in a property/function name does not make an action safe for disposable testing.**

## Which topic to read

| Task | Read |
| --- | --- |
| Sources, Google IDs, website routing | [ARCHITECTURE](ARCHITECTURE.md), [DATA-SOURCES](DATA-SOURCES.md) |
| Any sporting/data change | [LEAGUE-RULES-AND-EXCEPTIONS](LEAGUE-RULES-AND-EXCEPTIONS.md) |
| Applications, TT, draft, season setup, ASR | [PRESEASON-WORKFLOW](PRESEASON-WORKFLOW.md), [WORKFLOWS](WORKFLOWS.md) |
| Tickets, appeals, penalties, licences | [TICKETS-AND-PENALTIES](TICKETS-AND-PENALTIES.md) |
| Historical statistics, identities, track/team records | [STATISTICS-AND-HISTORY](STATISTICS-AND-HISTORY.md), [RESULT-IMPORT-VALIDATION](RESULT-IMPORT-VALIDATION.md) |
| People, permissions, TP/coordinator/reviewer views | [ROLES-AND-ACCESS](ROLES-AND-ACCESS.md) |
| Discord and alerts | [DISCORD](DISCORD.md) |
| Designs, reasons and superseded choices | [DECISION-HISTORY](DECISION-HISTORY.md) |
| What to do next / what not to reopen | [KNOWN-ISSUES](KNOWN-ISSUES.md) |
| Release, speed changes, regression checks | [OPERATIONS](OPERATIONS.md), [TESTING-CHECKLIST](TESTING-CHECKLIST.md) |
| Another account, recovery, backups | [BACKUP-AND-RECOVERY](BACKUP-AND-RECOVERY.md), [TRANSFER-AND-MAINTENANCE](TRANSFER-AND-MAINTENANCE.md) |
| Earlier nuance or a disputed previous claim | [historical index](../archive/HISTORICAL-INDEX.md), [evidence guide](EVIDENCE-AND-COVERAGE.md) |

## Authority and confidence

Current owner instruction governs task scope. Explicit sporting rules/confirmed exceptions govern interpretation; flag conflicts rather than rewriting them to fit data. Fresh verified sources establish implementation facts. The latest dated current documents supersede archived proposals. An old assistant conclusion is not proof, and a screenshot is not a database audit.

Use these labels when updating the pack: **Owner decision**, **Verified implementation**, **Recorded previous verification**, **Parked/rejected**, **Unconfirmed**. “Built”, “deployed”, “published”, “visually checked”, “owner accepted” and “fully exercised on genuine work” are distinct.

The source reference contains the 121 files verified as v409. Names such as DivisionDataServices and PreseasonPreperationService are real remote names, including historical spelling. Fetch fresh HEAD and published content before deploying; do not bulk-upload the local admin-app folder or this old reference.

## First response on a new account

Recommend a suitable model/effort before substantive new work; the owner chooses the switch. Confirm what files/access you actually have, current branch/dirty state, and whether the live baseline has changed. Explain only the implications the owner needs. If a connector is missing, continue safe local work and state the exact missing capability; never assume a different account inherits Google/GitHub/Discord sessions.

This pack is context, not authorization to send messages, alter roles, spend money, expose private data, close a season or rerun old maintenance scripts.
