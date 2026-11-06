# Discord — deliberately limited scope

## What exists

F1XLDataBot is the existing bot identity. The Portal's controls use GitHub Actions to run the sender; the Portal is the control surface, not a replacement always-running Discord host. Existing calendar/standings/team jobs remain. Direct Apps Script→Discord requests proved unsuitable in the earlier investigation; do not resurrect that failed route simply because UrlFetch is available.

Source: bot/ and .github/workflows/ in the website repository, plus DiscordGithubService/Client/View and DiscordApplicationService in Portal. Portal controls use the discord-control branch for small job/control state. This is not a new database for league results.

The private rehearsal channel is https://discord.com/channels/1186298584203800687/1329444470881648762. Bot membership and permissions were confirmed. Actual private delivery tests included real draft picks, four standings, team/calendar messages and pause/resume/finish controls. A successful private test is not permission to send to public channels.

## Current status at launch

- Standings job schedule retained: 0 12,18 * * *.
- Team/calendar job schedule retained: 0 9 * * 1,5.
- Legacy draft job and Portal runner are manually dispatched; don't assume a draft-night schedule is active.
- Standings and team/calendar Config pointers changed to current FAP sources during the website switch; no schedule/channel/token changes or launch test messages.
- Application alert sender is implemented and privately proved, but real route is **OFF**. Nobody is explicitly assigned the intended Head of Allocations recipient and the real channel must be verified before enabling.
- Steward-ready, appeal-ready and quiet TP Discord ticket posts were explicitly **dropped** by the owner. They are not an open implementation queue.
- Stewards-decisions and outstanding qualifying/race-ban posts remain **manual**.
- Accepted-applicant welcome/follow-up messages were discussed, then **parked**.
- No in-Portal notification feed, Firebase deployment or phone push service is wanted.

## Agreed channel intent, not blanket activation authority

| Event | Intended place / boundary |
| --- | --- |
| New applications | admin notifications; tag explicitly assigned Head of Allocations once configured |
| Standings | S(current)-standings |
| Teams | S(current)-teams |
| Calendar | S(current)-race-calendar |
| Draft / signings / movements | driver-changes; inspect the implemented controls and approved job before sending |
| TP ticket visibility | TP Portal hub, **not** a Discord notification |
| Decisions / outstanding bans | Existing manual channels, leave manual |

The owner does not need frequent checking: standings a few times weekly, drivers about daily, draft messages every five minutes would be acceptable. Those were desired tolerances, not proof that the retained cron expressions were changed.

## Reliability and costs

GitHub scheduling can be delayed; draft-night late/missing messages motivated the controls. A green legacy job may swallow delivery errors, so verify message receipt/status rather than equating Actions success with delivery. Preserve durable receipts, revision checks, expiry, pause/finish controls and ambiguous-send handling; don't blindly resend after an uncertain timeout.

People choose phone notifications in Discord. Bot messages/mentions do not guarantee a phone alert; server/channel/mute settings remain theirs. Do not add Portal preference screens to solve this without a new request.

No Firebase. Cloudflare relay was proposed but never approved; the user requires thorough viability/cost scrutiny before another service. Don't promise any provider “no costs ever”. Check current account plan/quota only when needed, and do not enable billing.

The owner-created GitHub connection was set to expire **14 November 2026**. It is a near-term maintenance item: inspect the current connection before that date, explain expiry plainly, and let the owner enter any replacement privately. It is not the Google sign-in session. Approved repository was F1XL2010/f1xl2010.github.io with Actions and Contents read/write; Contents is broader than just starting jobs. Never print/store token values in this pack or reset the bot token casually; existing jobs share it.

An old cron-job.org draft-night scheduler was inspected in the earlier audit. Recheck its current jobs read-only before changing/supplementing them so two senders cannot race. No current live state of that external account was rechecked during this handover refresh.
