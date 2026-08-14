# F1XL handover centre

Last reviewed: 14 August 2026

This folder is the durable project memory. It must remain useful if the current owner, current AI account or current conversation is unavailable.

There are two audiences:

- `ai-pack/` is the detailed technical pack for a new AI assistant. The AI should read it before advising or changing the project.
- `owner-quick-start/` is the short guide for a person taking over without coding experience.

The owner is not expected to read the entire AI pack. The replacement AI is expected to read it and translate it into plain-English guidance.

## Important limits

- These files must never contain passwords, access tokens, recovery codes or private credentials.
- Google Sheet and tab IDs already exposed by the public website may be documented here.
- The original historical data must not be overwritten during migration or simplification work.
- A generated ZIP is a delivery copy, not the master copy. These maintained source files are authoritative.
- Update `PACK-VERSION.md`, `CHANGELOG.md` and `ai-pack/CURRENT-STATUS.md` after material changes.

## Preparing a handover

Provide the successor with:

1. A current copy of this repository, including this folder.
2. A current backup/export of the Google Sheets and Forms.
3. The short owner guide in `owner-quick-start/START-HERE.md`.
4. Access to the relevant GitHub, Google and Discord administration—not passwords copied into this pack.
5. The copy-and-paste AI instruction in `owner-quick-start/COPY-PASTE-AI-PROMPT.md`.

The weekly review configured in the present Codex task belongs to the current AI account and is not transferable. A successor should recreate an equivalent weekly review on their chosen platform.
