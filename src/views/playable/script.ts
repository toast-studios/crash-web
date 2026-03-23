import { connectToSocket } from "../../utils/socket";
import { navigation } from "../../utils/navigation";
import { InfoPopup } from "../../popups/InfoPopup";
import { apiClient } from "../../network/apis";
import { Logger } from "../../utils/logger";
import { API_CONSTANTS } from "../../network/constants";
import { delayCall } from "../../utils/game";
// import { ClientEvent } from '../../utils/clientEvent'
import { init } from "../../main";
import { LOCAL_STORAGE_KEYS } from "../../utils/localStorageUtil";
import { localStorageUtil } from "../../utils/localStorageUtil";
import { getQueryParams } from "../../utils/window";
const playScreen = document.getElementById("playScreen") as HTMLDivElement;
const emailInput = document.getElementById("emailInput") as HTMLInputElement;
const emailForm = document.getElementById("emailForm") as HTMLFormElement;

const getOrgMail = (orgName: string) => {
  const randNum = Math.floor(Math.random() * 10000) + new Date().getTime();
  return `player${randNum}@${orgName}.com`;
};

// Prefer email from query params; fallback to saved email
const queryParams = getQueryParams();
const orgName = queryParams["org"] ? queryParams["org"].trim() : "playtoast";
const savedEmail =
  localStorageUtil.getItem(LOCAL_STORAGE_KEYS.PLAY_USER_EMAIL) || "";
const orgEmail = getOrgMail(orgName);

let effectiveEmail = "";

// ALWAYS prioritize org param if present, even if saved email exists
// This ensures fresh authentication when org param is provided
if (queryParams["org"]) {
  effectiveEmail = orgEmail;
  localStorageUtil.setItem(LOCAL_STORAGE_KEYS.PLAY_USER_EMAIL, orgEmail);
  // Remove org param from URL after saving
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("org");
    const remainingQuery = url.searchParams.toString();
    const newUrl =
      url.pathname + (remainingQuery ? `?${remainingQuery}` : "") + url.hash;
    window.history.replaceState({}, "", newUrl);
  } catch (e) {
    console.log("error in removing org from url", e);
  }
} else if (savedEmail) {
  effectiveEmail = savedEmail;
} else {
  effectiveEmail = orgEmail;
}

Logger.info("effectiveEmail", effectiveEmail);

//Not showing email input and play screen
emailInput.style.display = "none";
playScreen.style.display = "none";

const handleAutoAuth = async (email: string) => {
  // Clear any expired tokens before re-authenticating
  localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
  localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

  apiClient
    .authenticatePlayUser(email)
    .then((res) => {
      if (res.isRejoin) {
        navigation.presentPopup(InfoPopup, {
          message: "",
          showLoader: true,
          showOkButton: false,
        });
        connectToSocket(res.game.gameAuthToken);
      } else {
        localStorageUtil.setItem(LOCAL_STORAGE_KEYS.PLAY_USER_EMAIL, email);
        if (playScreen) {
          playScreen.style.display = "none";
        }
        navigation.goBackToLobby(false);
      }
    })
    .catch((error) => {
      Logger.error("Auto-auth failed", error);
      // Show playScreen on auth errors so user can try again
      if (playScreen) {
        playScreen.style.display = "flex";
      }
      navigation.presentPopup(InfoPopup, {
        message: "Unable to authenticate. Please click PLAY to try again.",
        showLoader: false,
        showOkButton: true,
        onOkPress: () => {
          navigation.dismissPopup();
        },
      });
    });
};

// Setup PLAY button handler for re-authentication
const setupPlayButtonHandler = () => {
  if (!emailForm) return;

  // Remove any existing listeners by cloning the form
  const newForm = emailForm.cloneNode(true) as HTMLFormElement;
  emailForm.parentNode?.replaceChild(newForm, emailForm);

  const form = document.getElementById("emailForm") as HTMLFormElement;
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get email from input or use effectiveEmail
    const input = document.getElementById("emailInput") as HTMLInputElement;
    const email = input?.value?.trim() || effectiveEmail;

    if (!email) {
      Logger.info("No email provided for re-authentication");
      navigation.presentPopup(InfoPopup, {
        message: "Please enter a valid email address.",
      });
      return;
    }

    // Hide playScreen and show loader
    if (playScreen) {
      playScreen.style.display = "none";
    }
    navigation.presentPopup(InfoPopup, {
      message: "",
      showLoader: true,
      showOkButton: false,
    });

    // Re-authenticate with the email
    await handleAutoAuth(email);
  });
};

init()
  .then(async () => {
    // Always set up the PLAY button handler in case user needs to manually authenticate
    setupPlayButtonHandler();

    const authToken = localStorageUtil.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (authToken) {
      try {
        connectToSocket(authToken)
          .then((isConnected) => {
            Logger.info("playable rejoin check", {
              isRejoinSuccess: isConnected,
            });
            if (isConnected && playScreen) {
              playScreen.style.display = "none";
            } else {
              // Rejoin failed - show playScreen for re-authentication
              if (playScreen) {
                playScreen.style.display = "flex";
              }
              localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
              localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
              setupPlayButtonHandler(); // Re-setup handler when showing playScreen
            }
          })
          .catch((error) => {
            Logger.error("error in playable rejoin check", error);
            // Show playScreen on errors so user can re-authenticate
            if (playScreen) {
              playScreen.style.display = "flex";
            }
            localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
            localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
            setupPlayButtonHandler(); // Re-setup handler when showing playScreen
          });
      } catch (error) {
        Logger.error("error in playable rejoin check", error);
        // Show playScreen on errors so user can re-authenticate
        if (playScreen) {
          playScreen.style.display = "flex";
        }
        localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
        localStorageUtil.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        setupPlayButtonHandler(); // Re-setup handler when showing playScreen
      }
    } else {
      // No auth token - try auto auth, but set up button handler in case it fails
      try {
        await handleAutoAuth(effectiveEmail);
      } catch (error) {
        Logger.error("Auto-auth failed, showing playScreen", error);
        if (playScreen) {
          playScreen.style.display = "flex";
        }
        setupPlayButtonHandler(); // Re-setup handler when showing playScreen
      }
    }

    // * wait for 500ms for init logger
    delayCall(500, () => {
      // * check logs and upload if is there
      try {
        Logger.checkAndUploadExistingLogs(
          effectiveEmail,
          API_CONSTANTS.LOG_UPLOAD_URL,
        );
      } catch (error) {
        Logger.error("Error uploading logs", error);
      }
    });
  })
  .catch((error) => {
    Logger.error("Error initializing app", error);
    // Show playScreen on initialization errors
    if (playScreen) {
      playScreen.style.display = "flex";
    }
    setupPlayButtonHandler();
  });
