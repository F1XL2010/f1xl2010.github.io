# Staff access and role intent

Verified default permissions are extracted directly from v409 AccessPolicy in [role-defaults-v409.json](../reference/role-defaults-v409.json). Read that file and fresh deployed policy for exact actions. Permissions combine roles and individual exceptions; a role label alone is not the effective policy.

## Owner intent and important distinctions

| Role | Intended scope / current caution |
| --- | --- |
| F1XL owner / God | Full control; owner account is the master. Do not demote it to test restrictions. |
| Administrator | Broad routine help: applications, TT recording, results, tickets/appeals management, licences, movements, calendar and season work. **No default Maintenance, Reference Data, People permissions, permanent Driver Database or archive access.** Postseason/career are read-only defaults, not blanket finalization authority. |
| Head of Allocations | Completed TT results/rankings and allocations, including relevant movement/roster functions. Exact v409 standalone defaults do not grant application management; Admin or Applications coordinator can supply it where intended. Do not silently infer role inheritance from “Head”. |
| Time Trial Team | Manage/accept applications and enter TTs; not completed TT rankings or allocations. Defaults to TT screen, including common combined TP/reviewer roles; broader owner/Admin/head roles retain their normal landing. |
| Applications coordinator | Applications management and TT booking. |
| Head Steward | Ticket processing, final outcomes, appeal management and licences. Replaces separate Head of Appeals leadership; old head_appeal values normalize to head_steward without rewriting account rows. |
| Steward | Own reviews, peer reviews read-only; no ordinary head-admin final-outcome power. |
| Appeals reviewer | Own appealed-case reviews; not general administrative leadership. |
| Team Principal | Assigned team's hub and permitted actions; server-side team scope, not just a hidden selector. |
| Free Agent Coordinator | Review free agents and reserves together **inside Team Principal area**, no placement changes. An account that also has Admin naturally has Admin's separate powers. |
| Host / draft operator | Draft/presentation operations. A weekly-show information hub is only an idea, not permission to expose the whole active season. |

Race Admin and Season Viewer were considered redundant; do not recreate them merely to make a new role list symmetrical. Normal admins need to help each other, but the owner specifically ringfenced allocations/completed TT results and later removed maintenance/reference access. Draft roster corrections are a separate permission from confidential initial allocations; check the actual endpoint, not just a page name.

## Accounts

Staff sign in with a Google account; it need not be a Gmail address. Registration/profile uses gamertag and Discord name as well as Google identity. Approval/roles are controlled through People & permissions. Discord mentions need stable numeric Discord IDs when enabling a real tag; display name alone is not a reliable mention ID.

Sheets changes execute as the F1XL deployment owner; internal records identify the acting Portal user. Do not grant spreadsheet editor access to every staff member as a substitute for role enforcement.

The deployment's anonymous entry is intentional for login/public feeds. Every protected action must retain server-side gateway/entry and effective-role checks. Never rely only on menu visibility, client role fields or a chosen reviewer name.

## TP/coordinator privacy and presentation

The TP area stands outside the season hub. Show current drivers separately from former contributors: driver championship points and points earned for this team are different. Ferrari's earlier cross-division/current-name bug was fixed with division-scoped current roster and a former contribution breakdown; do not undo history to make totals align.

Tickets show relevant submissions, both sides, statements/evidence and session immediately; preserve private notes/reviews. Licence flags/outstanding bans need clear state and affected rounds, scoped to current people being looked after. Market availability is full/part time, with driver season-stat modal/filtering. The coordinator's people are essentially that market, so don't duplicate a market tab or irrelevant constructor-total tiles.

The old Race week idea was replaced by a season-available track-information library and TP guides/tips. Event details already appear in the main banner; driver flags already belong with licences. Briefing notes were declined.

## Verification boundaries

Technical role/gateway checks were recorded 3 November; owner confirmed actual staff/phone checks after v408 on 5 November. Do not repeat old “staff checks pending” as a launch blocker. Fresh changes still need relevant own-record/cross-team/direct-RPC tests. Owner/God testing alone does not prove restricted-user behavior.

Google multi-account browser routing caused “Sorry, unable to open the file” even before Portal login. Separate Chrome profiles/Guest helped diagnosis; the owner resolved the account separation. Do not prescribe incognito as the permanent product workflow or assume every future login failure has the same cause. Preserve current callback/origins/session handling and inspect the actual failing URL without logging OAuth codes.
