# Transfer to another AI/account and maintain this pack

## Transfer options

**Minimum:** give HANDOVER-FOR-ANOTHER-AI.md and the owner copy/paste prompt to the new AI. This is enough to understand intent, boundaries, current system and next steps without the chat.

**Full working handover:** supply the entire docs/handover folder plus the website repository, and arrange authorised account/connector access separately. The folder contains the old notes and verified v409 reference; the repository supplies website/bot code and assets. Neither contains the live private spreadsheet data or all raw audit exports.

The owner authorised committing this refreshed pack on 6 November. Use a repository revision containing that handover commit, or copy the complete local folder. The earlier website-switch commit alone does not contain this refresh. The included verified source reference is separate from the untracked admin-app folder. The owner does not need to publish documentation to the public website to transfer it.

## What does not transfer automatically

Google/Drive connector logins, Apps Script deployment rights, GitHub credentials, Discord server/bot rights, browser sessions, installed triggers, private Script Properties and local scheduled automations belong to accounts/environments. Access must be provided by the owner through the relevant service, not by pasting tokens into chat.

The old README said a weekly review was configured in an earlier Codex task. That is historical and unverified now; don't claim it transferred or create a recurring job without a request.

On a new machine, use available runtime/tooling rather than hardcoded C:/Users/mjc19 paths. The folder and its Markdown links are relative. The current computer's repository is under OneDrive/Documents/F1XL Back Up/F1XL Codex/f1xl2010.github.io. Some paths in archived notes remain machine-specific on purpose.

## Maintaining the pack

1. Update current documents after a material verified change; add the reason and superseded behavior where relevant.
2. Keep CURRENT-STATUS short and current. Put detailed older reports in the archive/evidence and link them, rather than endlessly prepending logs.
3. Keep KNOWN-ISSUES honest: implemented, verified, optional, parked, rejected and uncertain are different.
4. Update VERSION/changelog and source/date references. A changed file date is not evidence of deployment.
5. Refresh the source reference only from a fresh verified deployed snapshot; review for secrets and exclude Properties/session/private-record exports. Store source hashes and matching deployment provenance.
6. From this handover folder, run node maintenance/build-briefing.cjs then node maintenance/validate-pack.cjs. These only read/write the local pack, make no network requests and never deploy.
7. Review the changed files and transfer method. Do not stage unrelated work or publish audit/source folders accidentally.

Do not regenerate the preserved 6 November pre-refresh archive from current files. Its manifest exists to prove the old notes remain intact. Older report references to unavailable outputs are evidence pointers, not runnable missing dependencies.

## Commit/packaging caution

Jekyll excludes docs/handover from the public site, but a public Git repository would still expose committed files. The selected references contain code, IDs and public/historical racing context, not raw staff/private intake tables. Recheck before committing future additions. A ZIP is optional convenience only; the maintained folder is authoritative and the owner prefers files in their proper locations.
