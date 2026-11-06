# Launch access check — 3 November 2026

The deployed TEST v399 access checks pass. No account, role, permission, source or deployment was changed. The People register was re-read afterwards and is identical. This closes the technical/assignment part of launch item 2; it does not claim sign-in as other people or a real-phone walkthrough.

## Verified

- Nine registered accounts: eight Active, one Suspended. No duplicate Google identities/emails; active profiles have gamertag and Discord name. All accounts have a prior sign-in timestamp, which is historical evidence rather than a fresh test today.
- Both explicitly assigned TP accounts have valid S28 teams. Their normal TP restrictions are enforced server-side; the TP + Time Trial Team combination does not grant other-team, allocation or completed-TT access. God/Admin team preview remains intentionally broader.
- The active steward's saved reviewer name matches exactly one steward column in each of the fifteen S28 round sheets, case-insensitively. Own-column writes, peer read-only context and appeals-only filtering pass in disposable local fixtures using the deployed code.
- Coordinator-only is read-only. The existing Coordinator account also has Admin; its broader access is the expected combination, not an accidental bypass.
- Admin can perform routine operations while allocations/completed TT data, permissions and maintenance remain restricted as designed. Head of Allocations, explicit exceptions and God retain their agreed capabilities.
- All 277 registered operational entry points reject direct external invocation in local tests. The Portal's actual built-in check reports: “277 registered actions. All registered endpoints have entry guards.”
- Pending self-approval, forged gateway/trigger requests, stale/expired/signed-out/suspended/downgraded sessions, reviewer spoofing and cross-team requests are rejected. Google return checks cover PKCE/browser binding, wrong issuer/audience/expiry, unverified email and single-use state without storing Google access tokens.
- Forty focused/account/policy groups plus reviewer-isolation checks pass against captured deployed source. These are local fixtures, not actual Google sign-ins or operational saves. All nine access/UI components match local source; deployed HEAD matches published v399. Access register sharing lists its existing owner only.
- The short `/admincentre/` entry opens the Portal, owner session loads S28 normally, and People & permissions confirms the configured F1XL website Google return route.

## Brief checks still needed with actual staff

Use the existing account and its current permissions. Do not temporarily grant God to make a check pass, or submit fabricated operational decisions/results.

1. **Administrator:** open Results, Applications and Tickets. Confirm confidential allocations/completed TT rankings and People & permissions remain unavailable without an exception.
2. **TP + Time Trial Team:** the existing Williams account should see Williams in its team hub, applications and TT entry. It must not be able to select Ferrari, view allocations or completed TT rankings.
3. **Steward:** the existing steward account should open its review area, show the assigned reviewer, expose only its own editor and keep colleagues' reviews read-only. Normal admin/final-outcome screens should be unavailable.
4. **Phone:** complete at least one of those restricted-account checks in a normal mobile browser, opening `https://f1xl.co.uk/admincentre/`. Check navigation, a large writing field where relevant, and reload without being unexpectedly forced to start sign-in again. Do not use incognito as the passing condition. Actual saves can be confirmed during suitable genuine work, rather than making a test ticket in operational history.

The F1XL owner/God session cannot substitute for these restricted-account checks. Earlier owner-confirmed TP isolation remains evidence, but today's audit did not sign in as another staff member or use real touch hardware.

## Rollout notes, not faults

- Six full teams do not yet have a separate assigned TP account. Existing administrators can preview teams; onboard and assign additional principals when they are invited.
- No Head of Allocations or appeals-reviewer account is currently assigned. Owner/God retains those capabilities; assign named staff before delegating those jobs.
- Numeric Discord IDs are empty. Discord notifications are parked, so this is not a launch blocker.
- Keep final Portal releases selective and based on a fresh deployed backup. Some other local modules differ from published source or have older remote filenames. The test adapter used published source throughout; do not bulk-upload the entire local folder. This audit did not consolidate or change those modules.

Evidence: `outputs/launch-access-check-2026-11-03/` contains deployed-source hashes/snapshot, sanitized counts/assignment results, server tests and native browser readback. No raw People rows, email addresses, Google account IDs or account tokens were saved to the report.
