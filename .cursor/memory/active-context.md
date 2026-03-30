# Active Context

> Update this file at the start of each session before asking Cursor to do anything.

## Current Focus
Memory system setup complete. Ready for normal development.

Active branch: `shashank/pixi-migration` — scope is not yet documented. At the start of the next session, update this section with the specific files being changed and the goal of the migration.

## Recent Decisions

- **Memory system initialized (2026-03-30)**: Created `.cursor/memory/` with architecture, conventions, changelog, and active-context files. All populated from a live repo scan — no placeholder text remaining.
- **Strategy pattern prescribed for partners**: 77+ `CURRENT_PARTNER ===` branches exist across 19+ files. Migration is gradual — fix on contact, file-by-file. Do not attempt a bulk migration.
- **God class refactors deferred**: `CrashGameScreen.ts` (1481 lines) and `NewMatchMakingScreen.ts` (1562 lines) are known SRP violations. They are the top refactor targets but have not been touched yet.
- **`CrashGameSessionState` is the canonical session state**: Defined in `src/types/crashGame.ts`. Screens and phases must use this — no new module-level `let` state variables.

## Files Currently In Flux

Unknown — update this section at the start of each session. Specifically: which files does `shashank/pixi-migration` touch?

## Do Not Touch Right Now

- `.cursor/rules/*.mdc` — existing workspace rules; do not overwrite or modify
- `src/store/dummyDataForLobbies.ts` — test data that should be moved, not silently deleted
- `src/store/StoreManager.ts` and `src/store/Practice.ts` — possibly dead code, but needs verification before removal

## Open Questions

- What is the exact scope of `shashank/pixi-migration`? Which files are being changed and what is the end goal?
- Are `src/store/StoreManager.ts` and `src/store/Practice.ts` truly dead code, or are they referenced somewhere not found in the initial scan?
- Any immediate bugs or regressions to fix, or is the current work purely architectural refactoring?
- Should `src/ui/CIrcularTImeProgressBar.ts` typo be fixed as part of the next PR, or defer to avoid noise?
