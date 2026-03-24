// import { Container, Graphics } from "pixi.js";
// import { playBustAnimation } from "../../animations/lottie";
import { init } from "../../main";
// import { GameScreen } from "../../screens/GameScreen";
// import { TournamentGameScreen } from "../../screens/TournamentGameScreen";
// import { LobbyScreen } from "../../screens/LobbyScreen";
// import { MatchMakingScreen } from '../../screens/MatchMakingScreen'
// import { lobbies } from "../../store/dummyDataForLobbies";
// import { ALLOW_ACTIONS, GAME_STATE } from '../../store/storeTypes'
import { delayCall } from "../../utils/game";
import { navigation } from "../../utils/navigation";
import { CURRENCY_CODES, LOBBY_FORMAT, LOBBY_TYPE } from "../../types";
import { ColumnState, Leaderboard } from "../../ui/Leaderboard";
import type { PlayerData, PlayerExtraData } from "../../ui/Leaderboard";
import type { StoreData } from "../../store/storeTypes";
import { MatchMakingScreen } from "../../screens/NewMatchMakingScreen";
import { CrashGameScreen } from "../../screens/CrashGameScreen";
import { app } from "../../app";
// NOTE: FTUE store removed - if you need test data, create it in Practice.ts or here
// import {
//   ftueTournamentGameData,
//   testrecon,
//   zerRankTest,
// } from "../../store/FTUE";
// import { ftuePhaseTwoData } from "../../store/FTUE";

// Mock data from logs
const mockLobby = {
  _id: "test-lobby",
  entryFee: 100,
  winAmount: 1000,
  lobbyType: LOBBY_TYPE.FREE,
  currencyCode: CURRENCY_CODES.USD,
  currencySymbol: "$",
  isActive: true,
  lobbyFormat: LOBBY_FORMAT.TOURNAMENT,
  partnerId: "test-partner",
  numPlayers: 10,
};

const mockPlayers: StoreData["players"] = {
  "6926ff70d3a7948fbc6b0f11": {
    username: "EASY---IslaBFrenzy",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/705.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/705.png",
    gameUserId: "6926ff70d3a7948fbc6b0f11",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fdca8d3a79485be1abea1": {
    username: "MEDIUM---AshleyDPro",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/218.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/218.png",
    gameUserId: "692fdca8d3a79485be1abea1",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fdd21d3a794a78f5c3481": {
    username: "SUPER_EASY---ZoeNXo",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/791.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/791.png",
    gameUserId: "692fdd21d3a794a78f5c3481",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fdf00d3a7943572560421": {
    username: "MEDIUM---NoahSVR",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/226.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/226.png",
    gameUserId: "692fdf00d3a7943572560421",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fe0a4d3a794adf566c181": {
    username: "HITMAN_JOLLY---LilyPClutch",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/494.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/494.png",
    gameUserId: "692fe0a4d3a794adf566c181",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fe1c2d3a79402e36166e1": {
    username: "HARD---AidenZInIt",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/760.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/760.png",
    gameUserId: "692fe1c2d3a79402e36166e1",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fe554d3a7940eb214d571": {
    username: "SUPER_EASY---OliverOOnFire",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/364.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/364.png",
    gameUserId: "692fe554d3a7940eb214d571",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fe5fad3a7943e242e7221": {
    username: "MEDIUM_TWO---EvaTWorks",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/312.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/312.png",
    gameUserId: "692fe5fad3a7943e242e7221",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "692fec6bd3a7941f113748d1": {
    username: "HITMAN_JOLLY---EricaMDaily",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/546.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/546.png",
    gameUserId: "692fec6bd3a7941f113748d1",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
  "693007c4d3a7941dc32552d1": {
    username: "RadiantAssassin5418",
    profilePicture: "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/140.png",
    fallbackImageUrl:
      "https://fw-users.s3.ap-south-1.amazonaws.com/gspp/140.png",
    gameUserId: "693007c4d3a7941dc32552d1",
    networkStatus: 0,
    extraTurnTimeLeft: 0,
    skipTurnCount: 0,
    cardsColumns: [],
    lobbyDetails: mockLobby,
  },
};

// // Event 1: Initial state - all score 0, rank 1
const event1Players: PlayerData[] = [
  {
    gameUserId: "6926ff70d3a7948fbc6b0f11",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdca8d3a79485be1abea1",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdd21d3a794a78f5c3481",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdf00d3a7943572560421",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe0a4d3a794adf566c181",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe1c2d3a79402e36166e1",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe554d3a7940eb214d571",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe5fad3a7943e242e7221",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fec6bd3a7941f113748d1",
    score: 0,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "693007c4d3a7941dc32552d1",
    score: 0,
    isTopper: true,
    rank: 1,
  },
];

const event1Extra: Record<string, PlayerExtraData> = {};
Object.keys(mockPlayers).forEach((id) => {
  event1Extra[id] = {
    columnsState: [
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  };
});

// // Event 2: All players score 33, rank 1, first column ACTIVE
const event2Players: PlayerData[] = event1Players.map((p) => ({
  ...p,
  score: 33,
}));

const event2Extra: Record<string, PlayerExtraData> = {};
Object.keys(mockPlayers).forEach((id) => {
  event2Extra[id] = {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  };
});

// Event 3: One player drops to rank 10, others get score 37
const event3Players: PlayerData[] = [
  {
    gameUserId: "692fdca8d3a79485be1abea1",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdd21d3a794a78f5c3481",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdf00d3a7943572560421",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe0a4d3a794adf566c181",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe1c2d3a79402e36166e1",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe554d3a7940eb214d571",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe5fad3a7943e242e7221",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fec6bd3a7941f113748d1",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "693007c4d3a7941dc32552d1",
    score: 37,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "6926ff70d3a7948fbc6b0f11",
    score: 33,
    isTopper: true,
    rank: 10,
  },
];

const event3Extra: Record<string, PlayerExtraData> = {
  ...event2Extra,
  "6926ff70d3a7948fbc6b0f11": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
};

// Event 4: More score changes and rank shifts
const event4Players: PlayerData[] = [
  {
    gameUserId: "692fdca8d3a79485be1abea1",
    score: 47,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdd21d3a794a78f5c3481",
    score: 47,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe1c2d3a79402e36166e1",
    score: 47,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fe5fad3a7943e242e7221",
    score: 47,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "693007c4d3a7941dc32552d1",
    score: 47,
    isTopper: true,
    rank: 1,
  },
  {
    gameUserId: "692fdf00d3a7943572560421",
    score: 37,
    isTopper: true,
    rank: 6,
  },
  {
    gameUserId: "692fe554d3a7940eb214d571",
    score: 37,
    isTopper: true,
    rank: 6,
  },
  {
    gameUserId: "6926ff70d3a7948fbc6b0f11",
    score: 33,
    isTopper: true,
    rank: 8,
  },
  {
    gameUserId: "692fe0a4d3a794adf566c181",
    score: 21,
    isTopper: true,
    rank: 9,
  },
  {
    gameUserId: "692fec6bd3a7941f113748d1",
    score: 20,
    isTopper: true,
    rank: 10,
  },
];

const event4Extra: Record<string, PlayerExtraData> = {
  "692fdca8d3a79485be1abea1": {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fe1c2d3a79402e36166e1": {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fe0a4d3a794adf566c181": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fdf00d3a7943572560421": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fdd21d3a794a78f5c3481": {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fe554d3a7940eb214d571": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "693007c4d3a7941dc32552d1": {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fec6bd3a7941f113748d1": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "692fe5fad3a7943e242e7221": {
    columnsState: [
      ColumnState.ACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
  "6926ff70d3a7948fbc6b0f11": {
    columnsState: [
      ColumnState.COMPLETED,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  },
};

// Event 5: Column 2 becomes active
const event5Players: PlayerData[] = event4Players;

const event5Extra: Record<string, PlayerExtraData> = {};
Object.keys(event4Extra).forEach((id) => {
  const prevState = event4Extra[id].columnsState;
  event5Extra[id] = {
    columnsState: [
      prevState[0],
      prevState[0] === ColumnState.COMPLETED
        ? ColumnState.ACTIVE
        : ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ],
  };
});

delayCall(10, () => {
  init()
    .then(() =>
      navigation.showScreen(CrashGameScreen, {
        matchId: "test-crash-match",
        isReconnection: false,
        gameConfig: {
          coolMaxUses: 3,
          boostMaxUses: 3,
          coolReductionGreen: 4,
          coolReductionYellow: 3,
          coolReductionRed: 2,
          coolReductionCritical: 1,
          boostIncreaseGreen: 2,
          boostIncreaseYellow: 3,
          boostIncreaseRed: 4,
          boostIncreaseCritical: 5,
        },
        players: [
          { gameUserId: "p1", username: "RadiantAssassin", status: "alive" },
          { gameUserId: "p2", username: "ZoeNXo", status: "alive" },
          { gameUserId: "p3", username: "AshleyDPro", status: "alive" },
        ],
      }),
    )
    .then(() => {
      console.log("Crash game screen loaded!");
      console.log(
        "The purple space background with scrolling stars should be visible.",
      );
      console.log("Player count header and feed should display mock data.");

      const screen = navigation.getCurrentScreen() as CrashGameScreen | null;
      if (!screen) return;

      // Mock GameStateSyncPayload to populate PlayerCountHeader and CrashFeed
      const mockPlayers = [
        {
          id: "p1",
          name: "RadiantAssassin",
          status: "alive" as const,
          survivalTime: 12.5,
          boostCount: 1,
          coolCount: 0,
          prize: 0,
          rank: null,
        },
        {
          id: "p2",
          name: "SUPER_EASY---ZoeNXo",
          status: "alive" as const,
          survivalTime: 12.3,
          boostCount: 0,
          coolCount: 1,
          prize: 0,
          rank: null,
        },
        {
          id: "p3",
          name: "MEDIUM---AshleyDPro",
          status: "exited" as const,
          survivalTime: 10.2,
          boostCount: 2,
          coolCount: 0,
          prize: 250,
          rank: 3,
        },
        {
          id: "p4",
          name: "HARD---AidenZInIt",
          status: "bust" as const,
          survivalTime: 8.1,
          boostCount: 1,
          coolCount: 1,
          prize: 0,
          rank: null,
        },
        {
          id: "p5",
          name: "HITMAN_JOLLY---LilyPClutch",
          status: "exited" as const,
          survivalTime: 11.8,
          boostCount: 0,
          coolCount: 2,
          prize: 500,
          rank: 1,
        },
        {
          id: "p6",
          name: "EASY---IslaBFrenzy",
          status: "alive" as const,
          survivalTime: 12.5,
          boostCount: 1,
          coolCount: 0,
          prize: 0,
          rank: null,
        },
        {
          id: "p7",
          name: "MEDIUM_TWO---EvaTWorks",
          status: "exited" as const,
          survivalTime: 9.5,
          boostCount: 3,
          coolCount: 0,
          prize: 100,
          rank: 5,
        },
      ];

      const mockFeedMessages = [
        {
          id: "f1",
          playerName: "RadiantAssassin",
          action: "boost" as const,
          survivalTime: 11.2,
        },
        {
          id: "f2",
          playerName: "SUPER_EASY---ZoeNXo",
          action: "cool" as const,
          survivalTime: 10.8,
        },
        {
          id: "f3",
          playerName: "HITMAN_JOLLY---LilyPClutch",
          action: "exit" as const,
          survivalTime: 11.8,
        },
        {
          id: "f4",
          playerName: "HARD---AidenZInIt",
          action: "bust" as const,
          survivalTime: 8.1,
        },
        {
          id: "f5",
          playerName: "MEDIUM---AshleyDPro",
          action: "exit" as const,
          survivalTime: 10.2,
        },
        {
          id: "f6",
          playerName: "MEDIUM_TWO---EvaTWorks",
          action: "exit" as const,
          survivalTime: 9.5,
        },
      ];

      // Initial state: GREEN zone (low heat)
      screen.getState().applyGameStateSync({
        heat: 93,
        velocity: 1.0,
        elapsed: 2.0,
        heatZone: "critical" as const,
        phase: "running" as const,
        serverTime: Date.now(),
        players: mockPlayers,
        feedMessages: mockFeedMessages,
      });

      // Trigger a manual display update
      (screen as any).updateDisplay?.();

      console.log("Mock data applied:");
      console.log(`  - ${mockPlayers.length} players in PlayerCountHeader`);
      console.log(`  - ${mockFeedMessages.length} messages in CrashFeed`);
      console.log(
        "  - Feed should show: HEATED!, COOLED!, CASHED OUT! with prizes, and BUST!",
      );
      console.log("\n=== Heat Zone Gradient Demo ===");
      console.log("Initial: GREEN zone (0x00cc66 → 0x00ff88)");

      // Test bubble animations
      console.log("\n=== Bubble Animation Tests ===");
      console.log("Heat icon animation will trigger in 4 seconds...");
      console.log("Cool icon animation will trigger in 8 seconds...");

      // Trigger heat icon animation after 4 seconds
      setTimeout(() => {
        const currentScreen =
          navigation.getCurrentScreen() as CrashGameScreen | null;
        if (currentScreen && (currentScreen as any).bubbleEffect) {
          console.log("🔥 Triggering HEAT bubble animation!");
          (currentScreen as any).bubbleEffect.trigger("heat");
        }
      }, 4000);

      // Trigger cool icon animation after 8 seconds
      setTimeout(() => {
        const currentScreen =
          navigation.getCurrentScreen() as CrashGameScreen | null;
        if (currentScreen && (currentScreen as any).bubbleEffect) {
          console.log("❄️ Triggering COOL bubble animation!");
          (currentScreen as any).bubbleEffect.trigger("cool");
        }
      }, 8000);

      // Demo: cycle through heat zones to show gradient changes
      // setTimeout(() => {
      //   const currentScreen =
      //     navigation.getCurrentScreen() as CrashGameScreen | null;
      //   if (!currentScreen) return;
      //   currentScreen.getState().applyGameStateSync({
      //     heat: 50,
      //     velocity: 1.3,
      //     elapsed: 5.0,
      //     heatZone: "yellow" as const,
      //     phase: "running" as const,
      //     serverTime: Date.now(),
      //     players: mockPlayers,
      //     feedMessages: mockFeedMessages,
      //   });
      //   (currentScreen as any).updateDisplay?.();
      //   console.log("3s: YELLOW zone (0xff8800 → 0xffcc00)");
      // }, 3000);

      // setTimeout(() => {
      //   const currentScreen =
      //     navigation.getCurrentScreen() as CrashGameScreen | null;
      //   if (!currentScreen) return;
      //   currentScreen.getState().applyGameStateSync({
      //     heat: 75,
      //     velocity: 1.8,
      //     elapsed: 8.0,
      //     heatZone: "red" as const,
      //     phase: "running" as const,
      //     serverTime: Date.now(),
      //     players: mockPlayers,
      //     feedMessages: mockFeedMessages,
      //   });
      //   (currentScreen as any).updateDisplay?.();
      //   console.log("6s: RED zone (0xff4400 → 0xff6600)");
      // }, 6000);

      // setTimeout(() => {
      //   const currentScreen =
      //     navigation.getCurrentScreen() as CrashGameScreen | null;
      //   if (!currentScreen) return;
      //   currentScreen.getState().applyGameStateSync({
      //     heat: 95,
      //     velocity: 2.5,
      //     elapsed: 11.0,
      //     heatZone: "critical" as const,
      //     phase: "running" as const,
      //     serverTime: Date.now(),
      //     players: mockPlayers,
      //     feedMessages: mockFeedMessages,
      //   });
      //   (currentScreen as any).updateDisplay?.();
      //   console.log("9s: CRITICAL zone (0xff0000 → 0xff4444)");
      // }, 9000);

      // setTimeout(() => {
      //   const currentScreen =
      //     navigation.getCurrentScreen() as CrashGameScreen | null;
      //   if (!currentScreen) return;
      //   currentScreen.getState().applyGameStateSync({
      //     heat: 20,
      //     velocity: 1.0,
      //     elapsed: 14.0,
      //     heatZone: "green" as const,
      //     phase: "running" as const,
      //     serverTime: Date.now(),
      //     players: mockPlayers,
      //     feedMessages: mockFeedMessages,
      //   });
      //   (currentScreen as any).updateDisplay?.();
      //   console.log("12s: Back to GREEN zone (cycle complete)");
      // }, 12000);
    });

  // navigation.showScreen(TournamentGameScreen, ftueTournamentGameData);

  // navigation.showScreen(TournamentGameScreen, testrecon);

  // Test Leaderboard
  // const currentUserId = "693007c4d3a7941dc32552d1"; // RadiantAssassin5418

  // const leaderboard = new Leaderboard({
  //   leaderboardPlayers: event1Players,
  //   extra: event1Extra,
  //   players: mockPlayers,
  //   currentUserId,
  //   isDraftingPhase: false,
  //   variant: "result",
  // });

  // leaderboard.x = 15;
  // leaderboard.y = 100;
  // app.stage.addChild(leaderboard);

  console.log("Initial leaderboard created");

  // // Event 2: After 3 seconds - all players score 33
  // setTimeout(() => {
  //   console.log("Update 1: All players score 33, first column active");
  //   leaderboard.updatePlayers({
  //     leaderboardPlayers: event2Players,
  //     extra: event2Extra,
  //     players: mockPlayers,
  //     currentUserId,
  //     isDraftingPhase: false,
  //   });
  // }, 3000);

  // // Event 3: After 6 seconds - rankings change
  // setTimeout(() => {
  //   console.log("Update 2: Rankings change, one player drops");
  //   leaderboard.updatePlayers({
  //     leaderboardPlayers: event3Players,
  //     extra: event3Extra,
  //     players: mockPlayers,
  //     currentUserId,
  //     isDraftingPhase: false,
  //   });
  // }, 6000);

  // // Event 4: After 9 seconds - more score changes
  // setTimeout(() => {
  //   console.log("Update 3: More score changes and rank shifts");
  //   leaderboard.updatePlayers({
  //     leaderboardPlayers: event4Players,
  //     extra: event4Extra,
  //     players: mockPlayers,
  //     currentUserId,
  //     isDraftingPhase: false,
  //   });
  // }, 9000);

  // // Event 5: After 12 seconds - column 2 becomes active
  // setTimeout(() => {
  //   console.log("Update 4: Second column becomes active");
  //   leaderboard.updatePlayers({
  //     leaderboardPlayers: event5Players,
  //     extra: event5Extra,
  //     players: mockPlayers,
  //     currentUserId,
  //     isDraftingPhase: false,
  //   });
  // }, 12000);

  // return;

  // navigation.showScreen(LobbyScreen, {
  //   appWidth: app.screen.width,
  //   appHeight: app.screen.height,
  //   lobbies: [
  //     {
  //       _id: "123",
  //       entryFee: 100,
  //       winAmount: 1000,
  //       lobbyType: LOBBY_TYPE.FREE,
  //       currencyCode: CURRENCY_CODES.USD,
  //       currencySymbol: "$",
  //       isActive: true,
  //       lobbyFormat: LOBBY_FORMAT.DUEL,
  //       partnerId: "123",
  //       numPlayers: 2,
  //     },
  //     {
  //       _id: "456",
  //       entryFee: 200,
  //       winAmount: 2000,
  //       lobbyType: LOBBY_TYPE.FREE,
  //       currencyCode: CURRENCY_CODES.USD,
  //       currencySymbol: "$",
  //       lobbyFormat: LOBBY_FORMAT.TOURNAMENT,
  //       partnerId: "123",
  //       numPlayers: 8,
  //       isActive: true,
  //       rankRewards: [
  //         {
  //           currencyCode: CURRENCY_CODES.USD,
  //           rank: 1,
  //           rewardAmount: 1000,
  //         },
  //         {
  //           currencyCode: CURRENCY_CODES.USD,
  //           rank: 2,
  //           rewardAmount: 500,
  //         },
  //         {
  //           currencyCode: CURRENCY_CODES.USD,
  //           rank: 3,
  //           rewardAmount: 250,
  //         },
  //         {
  //           currencyCode: CURRENCY_CODES.USD,
  //           rank: 4,
  //           rewardAmount: 125,
  //         },
  //       ],
  //       extra: {
  //         tournamentType: "single",
  //       },
  //     },
  //   ],
  // });

  // navigation.showScreen(ResultScreen, {
  //   winAmount: 1000,
  //   currencyCode: CURRENCY_CODES.USD,
  //   currencySymbol: "$",
  //   players: [
  //     ...Array.from({ length: 8 }, (_, index) => ({
  //       userId: `user${index + 1}`,
  //       name: `User ${index + 1}`,
  //       score: Math.floor(Math.random() * 100),
  //       rank: index + 1,
  //       isTopper: index === 0,
  //       avatarUrl: `https://d29i2jg7pajoz0.cloudfront.net/avatars/${index + 1}.png`,
  //       fallbackImageUrl: `https://d29i2jg7pajoz0.cloudfront.net/avatars/${index + 1}.png`,
  //       isUser: index === 0,
  //     })),
  //   ],
  //   currentUserId: "user1",
  // });

  // navigation.showScreen(MatchMakingScreen, {
  //   fromRematchModel: false,
  //   remainingTime: 10,
  //   username: "John Doe",
  //   playerProfilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/1.png",
  //   playerFallbackImageUrl:
  //     "https://d29i2jg7pajoz0.cloudfront.net/avatars/1.png",
  //   lobbyDetails: mockLobby,
  //   isPracticeMode: true, // Test mode doesn't use real socket
  // });

  // const opponentProfilePicture = new OpponentProfileBar({
  //   // onExitButtonPress() {
  //   //   console.log("exit button pressed");
  //   // },
  //   profilePictureUrl:
  //     ftuePhaseTwoData.players[ftuePhaseTwoData.gameUserId].profilePicture,
  //   fallbackImageUrl:
  //     ftuePhaseTwoData.players[ftuePhaseTwoData.gameUserId].fallbackImageUrl,
  //   // disableExitButton: true,
  //   hideOpponentProfilePicture: false,
  //   showActionInfo: false,
  //   animateOpponentProfilePicture: true,
  // });
  // app.stage.addChild(opponentProfilePicture);
  // const dummyCn = new Container();
  // const gp = new Graphics();
  // gp.rect(0, 0, 100, 100);
  // gp.fill("red");
  // dummyCn.addChild(gp);
  // app.stage.addChild(dummyCn);
  // dummyCn.position.set(100, 100);
  // setTimeout(() => {
  //   initBustAnimation(dummyCn);
  //   playBustAnimation(dummyCn, 100, 100);
  // }, 3000);
  // navigation.showScreen(LobbyScreen, {
  //   lobbies: lobbies,
  //   banners: [],
  // });
  // navigation.showScreen(GameScreen, {
  //   gameUserId: '123',
  //   matchId: '456',
  //   gameState: GAME_STATE.PHASE_ONE,
  //   isReconnection: false,
  //   players: {
  //     '123': {
  //       gameUserId: '123',
  //       username: 'John Doe',
  //       profilePicture: './raw-assets-us/avatars/default-avatar.png',
  //       networkStatus: 0,
  //       extraTurnTimeLeft: 0,
  //       skipTurnCount: 0,
  //       cardsColumns: [], // Ensure this is populated as needed
  //     },
  //   },
  //   activeColumnIndex: 0,
  //   turnInfo: {
  //     ownTurnInfo: {
  //       turnTime: 10,
  //       remainingTurnTime: 10,
  //       isExtraTurnTime: false,
  //       allowActions: [ALLOW_ACTIONS.HIT, ALLOW_ACTIONS.STAND],
  //       card: null,
  //     },
  //     opponentTurnInfo: {
  //       turnTime: 10,
  //       remainingTurnTime: 10,
  //       isExtraTurnTime: false,
  //     },
  //   },
  // })
});
