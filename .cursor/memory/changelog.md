# Changelog

> At the end of each session, ask Cursor: "Summarize what we changed in this session in 3-5 bullet points, flag any new architectural decisions, and tell me if anything in active-context.md needs updating."
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

### 2026-03-30 (Session 2)
**Focus:** Added crash-game-development skill for navigating the HeatWave PvP vertical slice
- Created `.cursor/skills/crash-game-development/SKILL.md` — comprehensive guide for working on crash game features with file map, socket event ownership boundaries, state management patterns, WebView bridge communication, and common pitfalls
- Skill provides action-oriented navigation: "where do I touch?" for adding socket events, modifying UI, adjusting timing/animations, and debugging
- Documented the crash game vertical slice: `types/crashGame.ts` (all types + `CrashGameSessionState`), `SocketEventHandler.ts` (typed event maps), crash-specific constants (`crashTiming.ts`, `crashLayout.ts`), `CrashGameScreen.ts` ownership vs global `eventListeners.ts` router
- Included WebView bridge patterns: inbound (`window.addEventListener("message"/"appMessage")`) and outbound (`sendMessageToApp()` with `CLIENT_EVENT` enum)

### 2026-03-30 (Session 1)
**Focus:** Initial memory system setup
- Created `.cursor/rules/project-context.mdc` with project overview, tech stack, and AI behavior rules — provides persistent context injected into every Cursor chat session
- Created `.cursor/memory/` folder with `architecture.md`, `conventions.md`, `changelog.md`, and `active-context.md` — all fully populated from a live scan of the repo (no placeholder text remaining)
- Documented top two refactor targets: `CrashGameScreen.ts` (1481 lines) and `NewMatchMakingScreen.ts` (1562 lines) — both are SRP God Class violations per the workspace rules
- Captured known dead code for cleanup: `src/store/dummyDataForLobbies.ts` (test fixture in production source), `store/StoreManager.ts` and `store/Practice.ts` (possibly unused)
- Active branch is `shashank/pixi-migration` — scope and files in flux are not yet documented; update `active-context.md` at the start of the next session
