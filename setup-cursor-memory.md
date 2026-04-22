# Cursor Memory System Setup

You are helping me set up a persistent memory system for this repository so that context is shared across all Cursor chat sessions.

## What to Build

Create the following file and folder structure in the root of this project:

```
.cursor/
  rules
  memory/
    architecture.md
    conventions.md
    changelog.md
    active-context.md
```

---

## Step 1 — Create `.cursor/rules`

This file is automatically injected by Cursor into every chat session. Create it with the following content, then **fill in the bracketed placeholders** based on what you know about this repo:

```
## Project Overview
[Write 2-3 sentences describing what this project does, its purpose, and its primary users.]

## Tech Stack
[List the key technologies, frameworks, languages, runtimes, databases, and tools used in this project.]

## Memory Files — Always Read These First
Before making any changes, read the following files for context:
- Architecture decisions: .cursor/memory/architecture.md
- Current focus: .cursor/memory/active-context.md
- Recent changes: .cursor/memory/changelog.md
- Code conventions: .cursor/memory/conventions.md

## Behavior Rules
- Before making changes, briefly state what you are about to do and why.
- After completing changes, suggest a 2-3 bullet summary suitable for the changelog.
- If a requested change seems to conflict with existing architecture or conventions, flag it and ask before proceeding.
- Do not modify files listed as "Do Not Touch" in active-context.md.
- Keep responses focused. Avoid re-explaining things already documented in the memory files.
```

---

## Step 2 — Create `.cursor/memory/active-context.md`

This is the most important memory file. It should be updated at the start of every session. Create it with this template:

```markdown
# Active Context

> Update this file at the start of each session before asking Cursor to do anything.

## Current Focus
[What are you working on right now? Be specific — e.g. "Refactoring the auth module to support OAuth"]

## Recent Decisions
[Key decisions made in recent sessions and why — e.g. "Chose Zustand over Redux: simpler API, no boilerplate needed at current scale"]

## Files Currently In Flux
[List files actively being changed so Cursor doesn't make conflicting edits]

## Do Not Touch Right Now
[List files or folders that should not be modified in this session]

## Open Questions
[Things still undecided that Cursor should ask about rather than assume]
```

---

## Step 3 — Create `.cursor/memory/architecture.md`

This file captures the high-level design of the system. Create it with this template:

```markdown
# Architecture

## System Overview
[Describe how the system is structured at a high level — frontend/backend split, monorepo vs polyrepo, key services, etc.]

## Key Design Decisions
[Document important architectural choices and the reasoning behind them. Format: Decision → Reason → Date]

## Folder Structure
[Explain what lives where and why — e.g. /lib for business logic, /app/api for routes, etc.]

## Data Flow
[Describe how data moves through the system — e.g. request → middleware → service → DB → response]

## External Dependencies
[List third-party services, APIs, or integrations and what they are used for]
```

---

## Step 4 — Create `.cursor/memory/conventions.md`

This file enforces consistency across sessions. Create it with this template:

```markdown
# Conventions

## Code Style
[Document language-specific style rules — e.g. named exports only, no default exports, strict TypeScript, etc.]

## Naming Conventions
[File naming, variable naming, component naming, API route naming patterns]

## Patterns We Always Use
[Recurring implementation patterns — e.g. how errors are handled, how API calls are structured, how state is managed]

## Patterns We Never Use
[Anti-patterns to avoid — e.g. no inline styles, no `any` in TypeScript, no direct DB calls from components]

## Testing Conventions
[How tests are written, named, and organized]

## Git Conventions
[Commit message format, branch naming, PR conventions]
```

---

## Step 5 — Create `.cursor/memory/changelog.md`

This file is a running log of what changed and why. Create it with this template:

```markdown
# Changelog

> At the end of each session, ask Cursor: "Summarize what we did in 3-5 bullets for the changelog."
> Then paste the output here with the date.

## Format
Each entry should follow this structure:

### [DATE]
**Focus:** [What session was about]
- [Change made and why]
- [Change made and why]
- [Decision made and rationale]

---

## Log

### [DATE — first entry]
**Focus:** Initial memory system setup
- Created `.cursor/rules` with project overview and behavior rules
- Created `.cursor/memory/` folder with architecture, conventions, changelog, and active-context templates
- Populated templates based on current repo state
```

---

## Step 6 — Populate the Files

After creating all the files above with their templates, do the following:

1. Scan the repository — look at the folder structure, `package.json`, config files, key source files, and any existing README.
2. Fill in every `[bracketed placeholder]` in each file based on what you actually find in the repo.
3. Do not leave any placeholder empty. If something is genuinely unknown, write `[Unknown — to be documented]`.
4. In `active-context.md`, set "Current Focus" to: `"Memory system setup complete. Ready for normal development."`

---

## End-of-Session Ritual (Instruct Me Going Forward)

At the end of every future session, remind me to run this prompt:

> "Summarize what we changed in this session in 3-5 bullet points, flag any new architectural decisions, and tell me if anything in active-context.md needs updating."

Then paste the output into `.cursor/memory/changelog.md` and update `active-context.md` accordingly.

---

## Done

Once complete, confirm:
- [ ] `.cursor/rules` exists and is populated
- [ ] `.cursor/memory/architecture.md` exists and is populated
- [ ] `.cursor/memory/conventions.md` exists and is populated
- [ ] `.cursor/memory/changelog.md` exists with first entry
- [ ] `.cursor/memory/active-context.md` exists and is populated
- [ ] No `[bracketed placeholders]` remain unfilled