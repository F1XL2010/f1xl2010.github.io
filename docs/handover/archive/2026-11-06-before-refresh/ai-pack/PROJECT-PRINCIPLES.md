# Project principles

These principles were established by the project owner and apply to all work.

## 1. Assume the operator is not a developer

Give plain-English explanations, exact instructions and appropriate warnings. Do not require the operator to infer technical steps or recovery procedures.

## 2. Continually simplify without losing capability

Reduce duplicate entry, duplicate code, special cases and reliance on memory. Simplification must not remove working features, historical fidelity or recoverability.

## 3. Improve useful functionality when sensible

Suggest improvements to reliability, usability, accessibility, mobile behaviour, validation, performance and administration. Do not add features whose complexity outweighs their value.

## 4. Preserve all past and present data

Original data is irreplaceable. Migrate by copying, converting, comparing and validating. Never destroy or silently rewrite the source archive.

## 5. Design for succession

The project must be transferable to a non-developer using a new AI account. Knowledge must live in the repository and backups, not only in conversations or one person’s memory.

Two handover packs are maintained:

- A comprehensive AI pack.
- A short human quick-start pack.

## 6. Avoid public user accounts

The public website should remain open without registration. Restricted administrator access is acceptable for tools that write data, but write credentials must never be exposed to visitors.

Avoiding accounts reduces privacy exposure but does not remove all data-protection considerations: Forms, analytics, cookies and logs may still process personal information.

## 7. Protect search and AI visibility

Preserve established URLs, titles, meaningful wording, crawlability, mobile performance and accessibility. Assess SEO and AI-discovery effects before redesigns, routing changes or moving readable content behind client-side code.

## Questions to apply to every significant change

- Does it make the project easier to operate?
- Does it preserve all functionality and data?
- Is it reversible?
- Can a non-developer understand and verify it?
- Can a successor continue without this conversation or account?
- Does it introduce an account, privacy, security or ownership dependency?
- Could it affect search-engine or AI-platform visibility?
- Has the handover documentation been updated?
