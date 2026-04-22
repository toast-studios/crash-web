import { Select } from "@pixi/ui";
import { Container } from "pixi.js";
import { socketManager } from "../../network/SocketManager";
import CONSTANTS from "../../constants";
import { navigation } from "../../utils/navigation";
import { InfoPopup } from "../../popups/InfoPopup";
import { app } from "../../app";

export class TestJoinGameUI extends Container {
  private select: Select;

  constructor() {
    super();
    this.select = new Select({
      closedBG: `stand-action-button`,
      openBG: `stand-action-button`,
      items: {
        items: ["JK_SUPER", "JN__B"],
        backgroundColor: "blue",
        hoverColor: "#fff111",
        width: 200,
        height: 100,
        radius: 50,
      },
      textStyle: { fill: "#000000", fontSize: 20 },
      scrollBox: {
        width: 200,
        height: 350,
        radius: 30,
      },
    });

    this.select.y = app.screen.height / 4;
    this.select.x = app.screen.width / 2 - this.select.width / 2;
    this.select.width = 180;
    this.select.height = 80;
    this.select.onSelect.connect((__item, text) => {
      navigation.presentPopup(InfoPopup, {
        message: "Connecting to game...",
        showLoader: true,
      });
      socketManager.emit(
        CONSTANTS.ACTIONS.JOIN_GAME,
        {
          matchId: "KING_TABLE",
          playerDetails: {
            gameUserId: text,
            username: text,
            lobbyId: "test",
            profilePicture:
              text === "JK_SUPER"
                ? "https://d29i2jg7pajoz0.cloudfront.net/avatars/8.png"
                : "https://d29i2jg7pajoz0.cloudfront.net/avatars/3.png",
            // profilePicture: "NO_IMAGE",
          },
        },
        (data) => {
          if (data.error) {
            navigation.presentPopup(InfoPopup, {
              message: data.message,
            });
          }
        },
      );
    });
    this.addChild(this.select);
  }
}
