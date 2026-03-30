# Conventions

## Code Style

- **TypeScript strict mode** is fully enforced: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are all `true` in `tsconfig.json`
- **Class-based scene objects**: prefer `class` extending `PIXI.Container`; one class per file
- **No `console.*`**: use `Logger.info()`, `Logger.error()`, `Logger.warn()` from `src/utils/logger.ts`
- **No `any`**: zero tolerance — use `unknown` + type guards, generics, or proper type definitions
- **No `as unknown as T`**: double-casts bypass the type system — fix the underlying type mismatch
- **No `@ts-ignore` / `@ts-expect-error`** in production code (allowed only in test files with an explanatory comment)
- **No `alert()`**: use `navigation.presentPopup(InfoPopup, { message, showOkButton, onOkPress })`
- **No hardcoded colors as literals**: define named constants (hex number format `0xRRGGBB`, never string `"#RRGGBB"`)
- **No magic numbers**: timing constants in `src/constants/crashTiming.ts`; layout constants in `src/constants/crashLayout.ts`
- **No hardcoded URLs**: URLs come from `PARTNER_SPECIFIC_CONFIG` in `src/network/constants.ts` or env vars
- **No inline SVG / large string literals**: move to asset files or dedicated data modules

## Asset Management

### Compression Standards

All assets are automatically compressed via `@assetpack/core` during the build process (`npm run assets`). The build pipeline enforces these quality settings to balance file size and visual fidelity:

| Format | Quality | Rationale |
|--------|---------|-----------|
| **PNG** | 90 | Lossless compression + palette optimization; maintains transparency; ideal for UI elements, sprites, logos |
| **JPG** | 85 | Lossy compression visually identical to original; 50-70% smaller; ideal for photos, backgrounds |
| **WebP** | 85 | Modern format with best compression; 25-35% smaller than JPG at same quality; supports transparency; ideal for all web assets |
| **AVIF** | Disabled | Not yet widely supported in WebView environments |

**Do not commit uncompressed or max-quality (100) assets.** The assetpack pipeline automatically handles compression.

### Asset Workflow

```
1. Add raw asset → raw-assets-{partner}/ (source files, any quality)
2. Run: npm run assets (invokes assetpack with compression)
3. Output: public/assets/ (optimized, ready for production)
4. Git: Commit both raw source + optimized output
```

**Pre-build hook**: `npm run prebuild` runs `npm run assets` automatically, so you don't need to remember.

### File Format Guidelines

| Asset Type | Recommended Format | Max Dimensions | Notes |
|------------|-------------------|----------------|-------|
| UI sprites (buttons, icons) | PNG or WebP | 512×512 | Use texture atlases; assetpack creates sprite sheets automatically |
| Backgrounds | JPG or WebP | 2048×2048 | Use WebP when transparency is needed |
| Logos with transparency | PNG or WebP | 512×512 | PNG for compatibility, WebP for size |
| Lottie animations | JSON | — | Already vector-based; no raster compression needed |
| Profile pictures (from CDN) | WebP | 256×256 | Served from CloudFront, not in repo |

### Texture Atlas Generation

Assetpack automatically creates sprite sheets from directories in `raw-assets-{partner}/`:

- Place related sprites in the same folder (e.g., `raw-assets-em/ui-buttons/`)
- Assetpack generates: `public/assets/ui-buttons.json` + `ui-buttons.png`
- Load in code: `PIXI.Assets.load('ui-buttons')` then access via alias

**Do not** load individual images in production — always use atlases for batch rendering.

### Asset Size Limits

| Asset Type | Max File Size (After Compression) | Action if Exceeded |
|------------|-----------------------------------|---------------------|
| Single sprite | 200 KB | Split into smaller parts or reduce dimensions |
| Background image | 500 KB | Use JPG instead of PNG; reduce dimensions; check if WebP helps |
| Texture atlas (combined) | 1 MB | Split into multiple atlases by feature/screen |
| Lottie JSON | 100 KB | Simplify animation; reduce keyframes; remove unused layers |

### Pre-commit Validation (Optional)

To enforce asset size limits before commit, run:

```bash
npm run validate:assets
```

This script checks `public/assets/` for files exceeding size limits and lists violations.

### Partner-Specific Assets

Each white-label partner has its own asset directory:

```
raw-assets-em/     # Ember
raw-assets-bt/     # Butr
raw-assets-gs/     # GamerSaloon
raw-assets-sp/     # Sparket
raw-assets-kb/     # Kaboom
raw-assets-fw/     # FreeWin
raw-assets-bh/     # BlockHead
raw-assets-ml/     # MidoLotto
raw-assets-sd/     # Speed
raw-assets-ts/     # Toast
```

**NEVER** mix partner assets in the same folder. Each partner's assets are built separately based on `ASSET_ENTRY_POINT` env var.

## Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Class files | PascalCase | `CrashGameScreen.ts`, `PlayerBox.ts` |
| Utility / helper files | camelCase | `logger.ts`, `navigation.ts`, `audio.ts` |
| Interfaces (service contracts) | PascalCase with `I` prefix | `ISocketManager`, `INavigator` |
| Type aliases / data shapes | PascalCase, no prefix | `CrashGameConfig`, `StoreData`, `TurnInfo` |
| Constants objects | UPPER_SNAKE_CASE keys | `CRASH_TIMING.PHASE_TRANSITION_DELAY` |
| Boolean fields | `is`, `has`, `should`, `can` prefix | `isReconnection`, `hasDealtCards`, `shouldShowFTUE` |
| Methods | camelCase, verb-based | `startSocketEventListeners`, `handleTurnInfo`, `createPlayerBar` |
| Enum values | UPPER_SNAKE_CASE | `GAME_STATE.SHUFFLING_CARDS`, `CRASH_ACTIONS.HIT` |
| Screen folders | PascalCase | `screens/LobbyScreens/` |
| Partner behavior classes | `{Partner}PartnerBehavior` | `EmberPartnerBehavior`, `ButrPartnerBehavior` |

**Known typo to fix**: `ui/CIrcularTImeProgressBar.ts` → `ui/CircularTimeProgressBar.ts`

## Patterns We Always Use

### Screen Lifecycle
Every screen implementing `navigation.showScreen()` must follow:
```
construct → show() → [active: events, animations, timers] → hide() → destroy()
```
- `show()` starts socket listeners and enter animations
- `hide()` stops all tweens, timers, and socket listeners — screen is inert after `hide()`
- `destroy()` always calls `hide()` first (idempotent), then `super.destroy({ children: true })`

### Event Listener Cleanup
Store bound handler references as arrow function class fields — never use `.bind(this)` inline:
```ts
private handleMessage = (event: MessageEvent) => { ... };
show() { window.addEventListener("message", this.handleMessage); }
hide() { window.removeEventListener("message", this.handleMessage); }
```

### GSAP over `setTimeout`
Use `gsap.delayedCall()` and `gsap.timeline()` — they are cancellable via `gsap.killTweensOf(target)`. Never chain raw `setTimeout` for animation sequencing.

### Guard Against Destroyed Objects
Check `if (this.destroyed) return` in all async callbacks, tween `onComplete` handlers, and promise `.then()` chains.

### Typed Socket Events
All socket event names and payloads are defined in `src/network/SocketEventHandler.ts`. Use `CrashServerToClientEvents` and `CrashClientToServerEvents` interfaces. Never use raw string event names.

### Single State Object per Session
`CrashGameSessionState` (defined in `src/types/crashGame.ts`) is created once per game session and passed by reference to all screens and phases. Screens/phases read and write this shared object — they never maintain private copies.

### Partner Behavior via Strategy Pattern
Call through the `PartnerBehavior` interface — never check `CURRENT_PARTNER` directly in shared code:
```ts
// GOOD
this.partnerBehavior.onGameEnd(context);

// BAD — never do this in shared code
if (CURRENT_PARTNER === PARTNER_ID.bt) { ... }
```

### Logger Class
Always use the `Logger` class from `src/utils/logger.ts`:
```ts
Logger.info("Screen shown", { screenName: "CrashGameScreen" });
Logger.error("Socket error", error);
```

### Socket Listener Ownership
- Register in `startSocketEventListeners()`, unregister in `stopSocketEventListeners()`
- Always pass the specific callback ref to `.off()` — never call `.off(EVENT)` without a callback

## Patterns We Never Use

| Anti-Pattern | Reason |
|---|---|
| `any` type | Hides bugs, defeats TypeScript |
| `as unknown as T` double-cast | Bypasses type system entirely |
| `@ts-ignore` / `@ts-expect-error` in production | Silences real errors |
| `console.log` / `console.error` | Stripped in production; use `Logger` |
| `alert()` | No DOM popups; use `InfoPopup` via `navigation.presentPopup` |
| Module-level `let` for game state | Hidden global state; survives screen transitions unintentionally |
| `window.addEventListener` with `.bind(this)` inline | Creates non-removable listener references |
| `socketManager.off(EVENT)` without callback | Removes ALL listeners for that event globally |
| `CURRENT_PARTNER ===` checks in shared screen/component code | Violates Open/Closed — use Strategy pattern |
| PixiJS display objects created in `network/` layer | Network layer is data-only; UI belongs in screens/components |
| `TurnInfoManage` singleton buffer | Implicit ordering dependency; use `pendingTurnInfo` on state object |
| `delayCall` hacks for race conditions | Use promise-based readiness pattern on state object |
| `PIXI.Sprite.from()` shorthand | Go through `PIXI.Assets` in production |
| Adding children directly to `app.stage` | Only `Navigation` class manages the top-level display list |

## Testing Conventions

- Test fixtures and dummy data belong in `__fixtures__/` — never in `src/store/` (e.g. `src/store/dummyDataForLobbies.ts` must be moved)
- Test files: PascalCase + `.test.ts` (e.g. `CrashGameScreen.test.ts`)
- `@ts-expect-error` is allowed in test files only, and must include a comment explaining the expected error
- Test stubs and harnesses belong in `__tests__/` or `ui/test/` subdirectories, not in production `src/`

## Git Conventions

- **Branch naming**: `{author}/{feature-name}` — e.g. `shashank/pixi-migration`, `shashank/crash-screen-refactor`
- **Commit messages**: concise, present tense — e.g. `refactor CrashGameScreen into focused managers`
- **Pre-commit**: `lint` + `types` (`tsc`) must pass (enforced via Husky)
- **Build pipeline**: `format → lint → typecheck → assetpack → vite build`

## Environment Variables

All required at build time via `.env`:

| Variable | Purpose |
|---|---|
| `VITE_GAME_MODE` | Selects EJS view: `gameplay`, `speed`, `practice`, `playable`, `test` |
| `VITE_GAME_ENVIRONMENT` | `development` or `production` |
| `VITE_WEB_VERSION` | Injected as app version string |
| `VITE_PARTNER_SHORT` | Short partner code (e.g. `em`, `bt`, `gs`) |
| `VITE_PARTNER_ID` | Numeric partner ID |
| `VITE_VIEW_MODE` | View mode flag |
| `VITE_SENTRY_DSN` | Sentry DSN (production only) |
| `ASSET_ENTRY_POINT` | Asset pack entry point |
