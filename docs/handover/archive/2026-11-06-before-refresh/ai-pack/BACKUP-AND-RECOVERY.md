# Backup, ownership and recovery

Data preservation is paramount. A Git repository is not a complete backup because most live league data resides in Google.

## Assets that need independent protection

1. GitHub repository, including branches, tags and Actions workflows.
2. Central configuration workbook.
3. Every current and historical season workbook.
4. Ticket outcomes workbook.
5. Drivers licence workbook.
6. Track-record and Hall of Fame/records workbooks.
7. Google Forms and their response destinations.
8. Published league-rules Google Doc.
9. Discord bot configuration and channel ownership information.
10. GitHub Pages/custom-domain settings and domain registrar/DNS access.
11. GitHub Actions secret-name inventory and instructions for replacing values.

## Recommended backup set

Keep at least:

- A full Git clone or repository archive outside GitHub.
- Periodic spreadsheet exports in XLSX plus CSV exports of critical tabs.
- A copy of Form questions/settings and response destinations.
- A dated copy of this handover folder.
- A private account-access register stating owner, recovery contact and transfer procedure for each service.

Do not put the private access register or secret values in this public repository.

Use dated, non-destructive folders. Never replace the only previous backup with a new one before verifying the new archive opens correctly.

## Validation of a backup

A backup is not complete until someone checks:

- Files can be opened.
- Sheet exports contain expected tabs and row counts.
- Repository history exists, not only the latest files.
- The handover documentation is present.
- Account-recovery information is current.
- A second authorised person can locate the backup.

## GitHub Actions secret names currently referenced

Values are intentionally omitted:

- `DISCORD_TOKEN`
- `DISCORD_NOTIFY_CHANNEL_ID`
- `DISCORD_CHANNEL_ID`
- `DISCORD_CALENDAR_CHANNEL_ID`
- `DISCORD_STANDINGS_CHANNEL_ID`
- `GIST_ID`
- `GIST_TOKEN`

A successor must recreate or receive authorised access to the relevant Discord bot, channels and Gist, then enter replacement values in GitHub repository Actions secrets.

## Recovery order

If the public site fails:

1. Do not edit live data immediately.
2. Check GitHub Pages and Actions status.
3. Confirm the custom domain/DNS still points correctly.
4. Open static pages and then test public central-config CSV access.
5. Check browser developer-console errors and service-worker state.
6. Compare the last working commit with the current one.
7. Restore website code using an ordinary revert commit where possible.
8. Restore Google data only from a verified backup and only after identifying the damaged workbook/tab.
9. Record the incident and recovery in the decision/change history.

Do not use destructive Git commands such as a hard reset as a routine recovery method. Do not overwrite a Sheet merely because the website parser is wrong.

## Migration rule

For every historical-data migration:

```text
Original source (immutable)
  → exported backup
  → converted copy
  → automated comparisons
  → manual spot checks
  → owner approval
  → website source switch
```

Keep official final championship tables distinct from reconstructed race data when old results are incomplete or omit later penalties.
