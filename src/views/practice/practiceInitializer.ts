import { MatchMakingScreen } from "../../screens/NewMatchMakingScreen";

import { CURRENCY_CODES, LOBBY_FORMAT } from "../../types";

import { LOBBY_TYPE } from "../../types";
import { practicePhaseOneData } from "../../store/Practice";
import { navigation } from "../../utils/navigation";
import { localStorageUtil } from "../../utils/localStorageUtil";
import { LOCAL_STORAGE_KEYS } from "../../utils/localStorageUtil";
import { getWebviewData } from "../../utils/window";
import { Logger } from "../../utils/logger";
import { ClientEvent } from "../../utils/clientEvent";

const startPractice = () => {
  try {
    Logger.info("startPractice called");
    const webviewData = getWebviewData();
    // Store is_meta_freewin in localStorage if present
    if (webviewData?.is_meta_freewin !== undefined) {
      localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_META_FREEWIN, "true");
      localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_FREEWIN, "true");
    }
    if (webviewData?.is_freewin !== undefined) {
      localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_FREEWIN, "true");
    }

    const randomNum = Math.floor(Math.random() * (100 - 10 + 1)) + 10;
    const randomProfile = `https://d1ug5xjyltvxmg.cloudfront.net/profile_pictures/${randomNum}.png`;
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.OPPONENT_PROFILE_PICTURE,
      randomProfile,
    );
    Logger.info(
      "Opponent profile picture set from practice initializer:",
      randomProfile,
    );
    practicePhaseOneData.players.opponent.profilePicture = randomProfile;
    practicePhaseOneData.players.opponent.fallbackImageUrl = randomProfile;

    const getUserProfilePicture =
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.PLAYER_PROFILE_PICTURE) ||
      "https://d29i2jg7pajoz0.cloudfront.net/avatars/8.png";

    practicePhaseOneData.players[
      practicePhaseOneData.gameUserId
    ].profilePicture = getUserProfilePicture;
    practicePhaseOneData.players[
      practicePhaseOneData.gameUserId
    ].fallbackImageUrl = getUserProfilePicture;

    ClientEvent.WaitingForOpponent({
      remainingTime: 4,
    });
    navigation.showScreen(MatchMakingScreen, {
      remainingTime: 6,
      fromRematchModel: false,
      username:
        practicePhaseOneData.players[practicePhaseOneData.gameUserId].username,
      playerProfilePicture:
        practicePhaseOneData.players[practicePhaseOneData.gameUserId]
          .profilePicture,
      playerFallbackImageUrl:
        practicePhaseOneData.players[practicePhaseOneData.gameUserId]
          .fallbackImageUrl,
      lobbyDetails: {
        _id: "123",
        entryFee: 0,
        currencyCode: CURRENCY_CODES.USD,
        lobbyType: LOBBY_TYPE.FREE,
        winAmount: 0,
        currencySymbol: "$",
        partnerId: "123",
        isActive: true,
        numPlayers: 2,
        lobbyFormat: LOBBY_FORMAT.DUEL,
      },
      isPracticeMode: true, // Explicitly mark as practice mode
    });

    const MatchMakingScreenRef =
      navigation.getCurrentScreen() as MatchMakingScreen;
    MatchMakingScreenRef.handleSocketMatchFound({
      opponents: [
        {
          gameUserId: "opponent",
          username: "opponent",
          profilePicture: randomProfile,
        },
      ],
      gameUserId: practicePhaseOneData.gameUserId,
    });

    setTimeout(() => {
      ClientEvent.MatchFound([
        {
          gameUserId: "opponent",
          username: "opponent",
          profilePicture: randomProfile,
        },
      ]);
    }, 1000);
    setTimeout(() => {
      ClientEvent.GameStateChange({
        gameState: "Gameplay",
      });
    }, 6000);
  } catch (error) {
    Logger.error("error in init practice screen", error);
  }
};

export { startPractice };
