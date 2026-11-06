# Taking over F1XL — quick start

You do not need to be a programmer. The project includes a detailed pack that teaches a capable AI assistant how the website works. Your job is to give the AI the files, obtain authorised access to the services, and ask it to guide you in plain English.

## What you need

- An email account you control.
- A modern computer and browser.
- Your own account on an AI platform that can accept project files and work with a code folder/repository.
- Your own GitHub account.
- Your own Google account.
- Authorised access to the F1XL GitHub repository, Google files, domain settings and relevant Discord administration.

Never ask the previous owner to send passwords. Access should be shared or transferred to your account.

## 1. Choose and register with an AI platform

Choose a reputable AI service with these capabilities:

- Uploading multiple files or a ZIP/project folder.
- Reading and editing a code repository.
- Running a terminal or providing equivalent code-workspace tools.
- Handling a long-running project rather than only one-off questions.

Go to the provider’s official website, select **Create account** or **Sign up**, register with your email, verify the email and enable two-factor authentication if offered.

Interfaces and prices change, so use the provider’s current official setup instructions. Do not upload passwords, recovery codes or secret tokens to the AI.

## 2. Create your GitHub and Google accounts

Create accounts through the official GitHub and Google websites if you do not already have them. Use an address that will remain available to F1XL administration and enable two-factor authentication.

Ask the current authorised owner to:

- Add your GitHub account to the F1XL repository with the appropriate role.
- Share or transfer the required Google Sheets, Forms and Docs.
- Explain how domain/DNS and Discord administration are transferred.
- Provide the private account/access register separately from the public project files.

## 3. Obtain the project pack

You should receive:

- A current copy of the website repository.
- The `docs/handover/` folder.
- A recent Google data backup.
- The separate private account/access information.

Keep an untouched backup copy before doing anything else.

## 4. Start the AI assistant

Create a new project/task in your chosen AI platform. Upload the repository or make it available through the platform’s code-workspace/GitHub connection.

Tell the AI to read:

```text
docs/handover/ai-pack/START-HERE-AI.md
```

Then paste the prompt from `COPY-PASTE-AI-PROMPT.md`.

The AI’s first job is inspection only. It should confirm the architecture, Google data source, current season and Git status without changing anything.

## 5. Perform a harmless first test

Ask the AI:

> Start a local read-only preview of the website, open the home page and standings page, and confirm that live Google data loads. Do not edit, commit or publish anything.

This confirms that the AI can access the project and that you can see its local preview.

## Normal operation

Describe what you want in ordinary language. Useful phrases include:

- “Inspect this and explain it. Do not change anything.”
- “Make this exact change, test desktop and mobile, but do not commit.”
- “Show me the diff and explain it before publishing.”
- “Back up the relevant data before changing the Sheet.”
- “Update the handover documentation if this changes how the project works.”

The AI should tell you which files or Sheets are involved, what it intends to do, how it tested the result, and whether anything was committed or published.

## Rules worth remembering

- Do not overwrite old Google Sheets.
- Do not share passwords or recovery codes with the AI or place them in the repository.
- Do not approve a large change you do not understand; ask for a plain-English explanation.
- Preview and test before publishing.
- Keep public website pages available without user registration.
- Preserve existing page addresses and search visibility.
- Keep current repository and Google-data backups.

## Weekly check

Ask your AI platform to schedule a weekly review of the handover documentation. It should report outdated information and propose corrections, but it should not silently change website code, Google Sheets or external accounts.

## If something goes wrong

Tell the AI exactly what you can see and ask it to diagnose without making changes. Provide screenshots if helpful. Ask it to read `ai-pack/BACKUP-AND-RECOVERY.md` before any restoration.

If access to an account is missing, use that service’s official account-recovery or ownership-transfer process. Do not try to bypass access controls.
