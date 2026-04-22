# Architecture

## System Overview
HeatWave PvP is a single-page PixiJS v8 WebGL/WebGPU game delivered as a WebView inside partner mobile apps. The frontend connects to a Node.js/Socket.IO tournament server for real-time game events. It supports multiple game modes controlled by the `VITE_GAME_MODE` env var: `gameplay` (crash duel/tournament), `speed`, `practice`, `playable` (demo), and `test`. Partner identity is determined at build time via `VITE_PARTNER_SHORT`. The build produces mode-specific bundles via Vite + EJS templates.

## Key Design Decisions

| Decision | Reason | Date |
|---|---|---|
| PixiJS v8 as renderer | WebGL/WebGPU performance for card animations, crash meter, real-time visual updates | Pre-migration |
| Socket.IO for game events | Bidirectional real-time communication with automatic reconnection and ping/heartbeat | Legacy |
| Multi-partner via env vars | `VITE_PARTNER_SHORT` + `VITE_PARTNER_ID` select partner at build time; `PARTNER_SPECIFIC_CONFIG` in `network/constants.ts` holds static config; behavioral differences use Strategy pattern | Ongoing |
| EJS views per game mode | Each mode (`gameplay`, `speed`, `practice`, `playable`, `test`) has its own EJS template and TypeScript entry point under `src/views/` | Established |
| `Logger` with IndexedDB + S3 | Persistent log storage survives page reloads; logs uploaded to S3 at session end for post-session debugging | Established |
| Strategy pattern for partners | Replaces 77+ `CURRENT_PARTNER ===` branches; each partner implements `PartnerBehavior` interface; migration is gradual (fix-on-contact) | In progress |
| `CrashGameSessionState` as single state object | Replaces scattered module-level `let` vars; one instance per active session, passed by reference to screens/phases | Established in types |

## Folder Structure

```
src/
├── main.ts                   # Bootstrap: JWT parse, Sentry init, loadingProgress events, lazy-load app
├── app.ts                    # PixiJS Application init, asset bundle loading, screen lifecycle
├── animations/
│   ├── lottie.ts             # Lottie animation setup
│   └── util.ts               # Lottie initialization utility
├── components/               # Reusable lobby-level PixiJS UI components
│   └── [LobbySelection, PlayButton, EntryFeeButton, CurrencySelector, etc.]
├── constants/
│   ├── index.ts              # CONSTANTS (blackjack socket events), GAME_ENVIRONMENT, GAME_MODES, CRASH_EVENTS, CRASH_ACTIONS
│   ├── crashLayout.ts        # CRASH_ASSETS, CRASH_LAYOUT, CRASH_LOTTIE_PATHS
│   ├── crashTiming.ts        # CRASH_TIMING — all timing delays for crash game
│   ├── typography.ts         # FONTS, FONT_WEIGHTS
│   ├── animationConfig.ts    # GSAP animation config constants
│   ├── columnResult.ts       # Column result conversion utilities
│   └── speedMessages.ts      # Speed partner message templates
├── core/                     # Placeholder — reserved for future architecture improvements
├── network/
│   ├── SocketManager.ts      # ISocketManager interface + SocketManager class (reconnect, ping)
│   ├── SocketEventHandler.ts # Typed event maps: CrashServerToClientEvents, CrashClientToServerEvents
│   ├── eventListeners.ts     # Global pre-screen socket event router (attaches before any screen exists)
│   ├── constants.ts          # PARTNER_ID, PARTNER_SPECIFIC_CONFIG, API_CONSTANTS
│   ├── apis.ts               # apiClient — Axios-based REST client
│   ├── speedApiClient.ts     # Speed partner-specific API client
│   └── speedConstants.ts     # Speed partner constants
├── popups/                   # InfoPopup, SettingsPopup
├── screens/
│   ├── CrashGameScreen.ts       # Main crash game — 1481 lines (SRP VIOLATION — needs refactor)
│   ├── NewMatchMakingScreen.ts  # Matchmaking — 1562 lines (SRP VIOLATION — needs refactor)
│   ├── CrashResultScreen.ts     # Post-game results for crash (544 lines)
│   ├── PracticeScreen.ts        # Practice mode (958 lines)
│   ├── ResultScreen.ts          # Blackjack result screen (610 lines)
│   ├── MatchMakingScreen.ts     # Original matchmaking screen (558 lines)
│   ├── BlankScreen.ts           # Empty placeholder screen (31 lines)
│   ├── TestTournamentScreen.ts  # Tournament test screen (755 lines)
│   ├── base/
│   │   ├── index.ts             # registerInLobby() and shared lobby logic (246 lines)
│   │   └── UIConfigs.ts         # Shared UI config constants (73 lines)
│   └── LobbyScreens/
│       ├── LobbyScreen.base.ts      # Base lobby screen (213 lines)
│       ├── LobbyScreen.default.ts   # Default lobby (58 lines)
│       ├── LobbyScreen.withWallet.ts # Wallet-enabled lobby (266 lines)
│       ├── EmberLobby.ts            # Ember partner lobby (218 lines)
│       ├── GamerSaloonLobby.ts      # GamerSaloon lobby (29 lines)
│       ├── SparketLobby.ts          # Sparket lobby (43 lines)
│       └── lobbyScreenFactory.ts    # Factory: selects lobby class by partner (28 lines)
├── scripts/
│   ├── app.init.ts                  # Attaches event listeners, debug utils, routes to screen by VITE_GAME_MODE
│   ├── sentry.ts                    # initSentry(), logError()
│   ├── clarity.init.ts              # Microsoft Clarity analytics init
│   └── webToAppCommunication.helper.ts  # sendMessageToApp() — postMessage bridge to native app
├── store/
│   ├── storeTypes.ts            # StoreData, GAME_STATE, ALLOW_ACTIONS, Lobby, MatchFoundData
│   ├── Practice.ts              # Practice mode store (possibly unused — verify before deleting)
│   ├── StoreManager.ts          # Legacy store manager (possibly unused — verify before deleting)
│   └── dummyDataForLobbies.ts   # Test fixture — should be moved to __fixtures__/, not in src/
├── types/
│   ├── crashGame.ts             # CrashPlayer, CrashGameConfig, CrashGameSessionState, all socket payloads
│   ├── index.ts                 # LOBBY_TYPE, CURRENCY_CODES, CURRENCY_UI_MAPPING, LOBBY_FORMAT
│   ├── playable.ts              # Playable mode types
│   └── env.d.ts                 # ImportMeta.env type augmentation
├── ui/
│   ├── crash/                   # Crash-game specific: ActionBubbleEffect, CrashActionButton, CrashFeed,
│   │                            #   CrossButton, HeatDeltaText, HeatProgressBar, LottiePlayer,
│   │                            #   PlayerBox, PlayerCountHeader, ShipSpeedLabel, SurviveTimer
│   ├── Cards/                   # Card, CardDeck, CardPlacement, CardPlacementHolder
│   └── [general]                # ActionButton, CIrcularTImeProgressBar (typo!), CircleButton,
│                                #   FTUEPointer, GoldenButton, Header, Label, NetworkIndicator,
│                                #   RadialProgressTimer, RippleButton, RoundedButton, TimerBox, etc.
├── utils/
│   ├── logger.ts                # Logger class — IndexedDB persistence + S3 upload (432 lines)
│   ├── navigation.ts            # navigation singleton — screen/popup transitions (414 lines)
│   ├── audio.ts                 # bgm / sfx Howler wrappers (238 lines)
│   ├── clientEvent.ts           # ClientEvent — outbound analytics/bridge events to host app (275 lines)
│   ├── window.ts                # resizeWindowResolution, getQueryParams, visibilityChange (133 lines)
│   ├── socket.ts                # connectToSocket() helper (163 lines)
│   ├── FTUEQueue.ts             # First-Time User Experience pointer queue (145 lines)
│   ├── speedPayment.ts          # Speed partner payment flow (328 lines)
│   ├── winButtonText.ts         # Win amount display text formatting (282 lines)
│   └── lobby.ts                 # Lobby data helpers (127 lines)
└── views/
    ├── gameplay/                # Standard duel/tournament: index.ejs + script.ts
    ├── speed/                   # Speed partner game: index.ejs + script.ts
    ├── practice/                # Practice mode: index.ejs + script.ts + practiceInitializer.ts
    ├── playable/                # Demo mode: index.ejs + script.ts
    └── test/                    # Test harness: index.ejs + script.ts
```

## Data Flow

```
Partner Mobile App (WebView host)
  │
  │  postMessage / appMessage
  │  (auth token, navigate back, deposit result, volume, etc.)
  ▼
index.html → main.ts
  │  Parse JWT (?at=...) → extract guid, player profile picture
  │  Parse ?lobbyFormat (duel|tournament) → localStorage
  │  Dispatch loadingProgress events → native loading bar
  │  Init Sentry (production only)
  │  Init Logger (IndexedDB)
  ▼
app.ts (app.initApp())
  │  Init PixiJS Application (WebGL/WebGPU)
  │  Load asset bundles (PIXI.Assets)
  │  Show LobbyScreen (via navigation singleton)
  ▼
scripts/app.init.ts
  │  attachEventListeners() ← global Socket.IO event router
  │  Route to screen based on VITE_GAME_MODE
  ▼
network/eventListeners.ts (global pre-screen event router)
  │  Listens for: CRASH_EVENTS.GAME_TABLE_INFO → show CrashGameScreen
  │               CRASH_EVENTS.MATCH_FOUND → capture currentGameUserId
  │               CONSTANTS.EVENTS.WAITING_FOR_OPPONENT → show MatchMakingScreen
  ▼
CrashGameScreen / NewMatchMakingScreen (active screen owns its socket listeners)
  │  startSocketEventListeners() in show()
  │  stopSocketEventListeners() in hide()
  │  State: CrashGameSessionState (single instance, passed by reference)
  ▼
network/SocketManager ↔ Tournament Server (Socket.IO)
  │  Server → Client: CRASH_EVENTS (TURN_INFO, COLUMN_UPDATE, GAME_RESULT_SCREEN, etc.)
  │  Client → Server: CRASH_ACTIONS (PLAYER_ACTION, JOIN_GAME, LEAVE_GAME)
```

## External Dependencies

| Dependency | Purpose |
|---|---|
| Tournament Server (Socket.IO) | Real-time game events: turn info, column updates, match found, game result, etc. |
| Sentry | Error monitoring in production; source maps uploaded via `sentryVitePlugin` |
| Microsoft Clarity | Session replay and heatmap analytics |
| AWS S3 | Logger log file uploads for post-session debugging |
| Partner Mobile App | Hosts WebView; sends auth tokens via query param; receives navigation/analytics events via postMessage bridge |
| CDN (CloudFront) | Serves avatar images (`d36pvm6vh2iaub.cloudfront.net`) |
| Vite + assetpack | Build toolchain; assetpack preprocesses raw assets into optimized sprite sheets |
