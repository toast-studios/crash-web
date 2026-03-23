import { Container, FillGradient, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { TiledBackground } from "./TiledBackground";
import { app } from "../app";
import { MatchMakingScreen } from "../screens/MatchMakingScreen";
import { FONT_WEIGHTS } from "../constants/typography";
import { sfx } from "../utils/audio";
import { GAME_MODES, VIEW_MODE } from "../constants";
import { API_CONSTANTS } from "../network/constants";

export class MatchmakingCounter extends Container {
  private matchStartInText: Text;
  public matchStartCountdownText: Text;

  private continueAnimation: boolean = true;
  private onTimeUpdateCallback: (remainingTime: number) => void;
  private textStyleForTwoDigits: TextStyle;
  private textStyleForOneDigit: TextStyle;
  private viewMode = import.meta.env.VITE_VIEW_MODE;

  private background: TiledBackground;

  constructor({
    text,
    background,
    onTimeUpdateCallback,
  }: {
    text: string;
    background: TiledBackground;
    onTimeUpdateCallback: (remainingTime: number) => void;
  }) {
    super();
    this.background = background;
    this.onTimeUpdateCallback = onTimeUpdateCallback;
    this.textStyleForTwoDigits = this.addTwoDigitsTextStyle();
    this.textStyleForOneDigit = this.addOneDigitTextStyle();

    this.matchStartCountdownText = new Text({
      text,
      style:
        text.length > 1
          ? this.textStyleForTwoDigits
          : this.textStyleForOneDigit,
    });

    this.matchStartCountdownText.resolution = 4;

    this.matchStartInText = new Text({
      text: "MATCH STARTS IN",
      style: {
        fill: "#fff",
        fontSize: 25,
        fontFamily: "Pridi",
        fontWeight: FONT_WEIGHTS.REGULAR,
      },
    });
    this.matchStartInText.resolution = 4;

    this.addChild(this.matchStartInText);
    this.addChild(this.matchStartCountdownText);

    this.initialize();
  }

  private initialize() {
    this.matchStartInText.x = this.width / 2 - this.matchStartInText.width / 2;
    this.matchStartCountdownText.y += 30;
  }

  public shouldAnimateLogo(): boolean {
    const initialCount = Number(this.matchStartCountdownText.text);
    return initialCount > 3;
  }

  private addTwoDigitsTextStyle() {
    const fill = new FillGradient(0, 0, 156, 0);

    fill.addColorStop(0.19, 0xffffff);
    fill.addColorStop(0.59, 0xd1d1d2);
    fill.addColorStop(1, 0xa3a4a5);

    const style = new TextStyle({
      dropShadow: {
        color: "#00000080",
        angle: 90,
        blur: 4,
        distance: 4,
      },
      fill: { fill },
      fontSize: 80,
      fontFamily: "Pridi",
      fontWeight: "800",
    });

    return style;
  }

  private addOneDigitTextStyle() {
    const fill = new FillGradient(0, 0, 92, 0);

    fill.addColorStop(0.19, 0xffffff);
    fill.addColorStop(0.59, 0xd1d1d2);
    fill.addColorStop(1, 0xa3a4a5);

    const style = new TextStyle({
      dropShadow: {
        color: "#00000080",
        angle: 90,
        blur: 4,
        distance: 4,
      },
      fill: { fill },
      fontSize: 80,
      fontFamily: "Pridi",
      fontWeight: "800",
    });

    return style;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {}

  //@todo optimize this method
  /** Show the component */
  public show() {
    let countdown = Number(this.matchStartCountdownText.text);
    let modifiedFillStyle = countdown < 10;

    const updateCountdown = (decrement: number = 1) => {
      if (decrement) {
        countdown -= decrement;
        this.onTimeUpdateCallback(countdown);
      }
      if (!this.continueAnimation) {
        return;
      }
      this.matchStartCountdownText.text = countdown.toString();

      if (countdown > 3) {
        sfx.play("common/countdown_timer.wav");
      } else if (countdown >= 0) {
        sfx.play("common/3_sec_count.wav");
      }

      if (countdown === 3) {
        // const background = this.parent?.getChildByName(
        //   'tiledBackground'
        // ) as TiledBackground
        if (this.background) {
          this.background.animateGameTable({
            x: app.screen.width / 2,
            y: app.screen.height / 2,
            scale: this.viewMode == VIEW_MODE.WEB_VIEW ? 0.65 : 0.5,
          });
        }

        if (this.width > this.matchStartCountdownText.width) {
          this.matchStartCountdownText.x =
            this.width / 2 - this.matchStartCountdownText.width / 2 + 5;
        }

        this.matchStartInText.visible = false;

        const matchMakingScreen = this.parent as MatchMakingScreen;
        if (matchMakingScreen?.playerBar) {
          matchMakingScreen.playerBar.animateToLeft();
        }
        if (matchMakingScreen?.opponentBar) {
          matchMakingScreen.opponentBar.hideExitButton();
        }
        if (matchMakingScreen?.header) {
          matchMakingScreen.header.hideExitButton();
          matchMakingScreen.header.hideSettingButton();
        }
        matchMakingScreen.hideLogo();

        if (API_CONSTANTS.GAME_MODES == GAME_MODES.PRACTICE) {
          matchMakingScreen.animatePokerChipToProfilePicture(false);
        } else {
          matchMakingScreen.animatePokerChipToProfilePicture();
        }

        matchMakingScreen.cardMachine.visible = false;
        matchMakingScreen.aceAndJack.visible = false;
      }

      if (countdown < 10 && !modifiedFillStyle) {
        modifiedFillStyle = true;
        this.matchStartCountdownText.style = this.textStyleForOneDigit;
      }
      if (this.width > this.matchStartCountdownText.width) {
        this.matchStartCountdownText.x =
          this.width / 2 - this.matchStartCountdownText.width / 2 + 5;
      }

      if (countdown > 0) {
        gsap.to(this.matchStartCountdownText, {
          duration: 1,
          onComplete: () => updateCountdown(),
        });
      }
    };

    // Handle initial state for low numbers
    if (countdown <= 3) {
      // Update text style for single digit
      if (countdown < 10) {
        this.matchStartCountdownText.style = this.textStyleForOneDigit;
      }

      // Center the countdown text
      if (this.width > this.matchStartCountdownText.width) {
        this.matchStartCountdownText.x =
          this.width / 2 - this.matchStartCountdownText.width / 2 + 5;
      }

      this.matchStartInText.visible = false;

      // const background = this.parent?.getChildByName(
      //   'tiledBackground'
      // ) as TiledBackground
      if (this.background) {
        this.background.setGameTableFinalState({
          x: app.screen.width / 2,
          y: app.screen.height / 2,
          scale: this.viewMode == VIEW_MODE.WEB_VIEW ? 0.65 : 0.5,
        });
      }

      const matchMakingScreen = this.parent as MatchMakingScreen;
      if (matchMakingScreen?.playerBar) {
        matchMakingScreen.playerBar.setFinalLeftPosition();
      }
      if (matchMakingScreen?.opponentBar) {
        matchMakingScreen.opponentBar.hideExitButton();
      }
      if (matchMakingScreen?.header) {
        matchMakingScreen.header.hideExitButton();
        matchMakingScreen.header.hideSettingButton();
      }
      matchMakingScreen.hideLogo();
      // matchMakingScreen.hideCardsAndAceAndJack();

      // if (matchMakingScreen.pokerChip) {
      //   matchMakingScreen.pokerChip.y =
      //     app.screen.height / 2 + matchMakingScreen.pokerChip.height + 120
      // }

      if (matchMakingScreen.pokerChip) {
        matchMakingScreen.animatePokerChipToProfilePicture(false);
      }

      if (this.viewMode != VIEW_MODE.WEB_VIEW) {
        if (matchMakingScreen.cardMachine) {
          matchMakingScreen.cardMachine.y = app.screen.height / 2;
        }
        if (matchMakingScreen.aceAndJack) {
          matchMakingScreen.aceAndJack.y =
            app.screen.height / 2 - matchMakingScreen.aceAndJack.height / 2;
          matchMakingScreen.aceAndJack.x = 0;
        }
      } else {
        matchMakingScreen.cardMachine.visible = false;
        matchMakingScreen.aceAndJack.visible = false;
      }
    }

    // Start the countdown animation
    updateCountdown(0);
  }

  /** Hide the component */
  public async hide() {
    this.continueAnimation = false;
    gsap.killTweensOf(this.matchStartCountdownText);
    this.visible = false;
  }
}
