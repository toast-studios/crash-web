import { Container, FillGradient, Graphics, Sprite, Text } from "pixi.js";
import { app } from "../app";
import gsap from "gsap";
import { sfx } from "../utils/audio";
import {
  playDrawAnimation,
  playYouLoseAnimation,
  playYouWinAnimation,
} from "../animations/lottie";
import { END_GAME_REASON } from "../store/storeTypes";
import { PlayerProfileBar } from "./PlayerProfileBar";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class ResultOverlay extends Container {
  private background: Graphics;
  private playerScoreGroup: Container | null = null;
  private opponentScoreGroup: Container | null = null;
  private playerScoreBox: Sprite | null = null;
  private opponentScoreBox: Sprite | null = null;
  private playerScoreText: Text | null = null;
  private opponentScoreText: Text | null = null;
  private endGameText: Text | null = null;
  private hyphenGraphic: Graphics | null = null;
  private playerAudioName: string;
  public playerWon: boolean;
  private gameEndType: END_GAME_REASON;
  private playerWonImage: Sprite | null = null;
  private newContainerBg: Graphics | null = null;
  private defaultScreenWidth: number = 1920;
  private scaleCalculate: number = 0.7;
  private result_timeout: NodeJS.Timeout | null = null;
  constructor({
    playerScore,
    opponentScore,
    playerWon,
    gameEndType,
  }: {
    playerScore: number;
    opponentScore: number;
    playerWon: boolean;
    gameEndType: END_GAME_REASON;
  }) {
    super();

    this.playerWon = playerWon;
    this.gameEndType = gameEndType;

    this.background = new Graphics();
    this.background.rect(0, 0, app.screen.width, app.screen.height);
    this.background.fill({ color: 0x000000, alpha: 0.65 });
    this.addChild(this.background);

    const primaryGradient = new FillGradient(0, 0, 0, 40);
    primaryGradient.addColorStop(0.57, 0xffffff);
    primaryGradient.addColorStop(1, 0x999999);

    if (
      gameEndType === END_GAME_REASON.GAME_OVER ||
      gameEndType === END_GAME_REASON.DRAW
    ) {
      // Create containers for each score group
      this.playerScoreGroup = new Container();
      this.opponentScoreGroup = new Container();

      // Create score boxes
      this.playerScoreBox = Sprite.from("score-box-single");
      this.opponentScoreBox = Sprite.from("score-box-single");

      // Set scale for both boxes
      // this.playerScoreBox.scale.set(0.6);
      // this.opponentScoreBox.scale.set(0.6);
      this.playerScoreBox.width = this.playerScoreBox.texture.width * 0.6;
      this.playerScoreBox.height = this.playerScoreBox.texture.height * 0.6;

      this.opponentScoreBox.width = this.opponentScoreBox.texture.width * 0.6;
      this.opponentScoreBox.height = this.opponentScoreBox.texture.height * 0.6;

      this.playerScoreText = new Text({
        text: playerScore.toString(),
        style: {
          fontFamily: "Pridi",
          fontSize: 48,
          fill: primaryGradient,
        },
      });

      this.opponentScoreText = new Text({
        text: opponentScore.toString(),
        style: {
          fontFamily: "Pridi",
          fontSize: 48,
          fill: primaryGradient,
        },
      });

      // Set anchor points for text centering
      // this.playerScoreText.anchor.set(0.5, 0.5);
      // this.opponentScoreText.anchor.set(0.5, 0.5);
      // We will center them in initialize()

      // Create hyphen graphic
      this.hyphenGraphic = new Graphics();
      this.hyphenGraphic.rect(0, 0, 14, 8);
      this.hyphenGraphic.fill(primaryGradient);
      // this.hyphenGraphic.pivot.set(7, 4); // Center the hyphen
      this.hyphenGraphic.alpha = 0;

      // Add elements to their respective groups
      this.playerScoreGroup.addChild(this.playerScoreBox, this.playerScoreText);
      this.opponentScoreGroup.addChild(
        this.opponentScoreBox,
        this.opponentScoreText,
      );

      // Add groups and hyphen to main container
      this.addChild(
        this.playerScoreGroup,
        this.opponentScoreGroup,
        this.hyphenGraphic,
      );
    } else {
      let text = "";
      switch (gameEndType) {
        case END_GAME_REASON.OPPONENT_LEAVE_GAME:
          text = "Opponent left the game";
          break;
        case END_GAME_REASON.OPPONENT_DISCONNECTED:
          text = "Opponent disconnected";
          break;
        case END_GAME_REASON.OPPONENT_SKIP_TURN:
          if (!playerWon) {
            text = "You skipped all turns";
          } else {
            text = "Opponent skipped all turns";
          }
          break;
        default:
          text = "";
          break;
      }
      this.endGameText = new Text({
        text,
        style: {
          fontFamily: "Pridi",
          fontSize: 31,
          fill: 0xffffff,
          fontWeight: "800",
        },
      });

      this.addChild(this.endGameText);
    }

    if (playerWon) {
      // this.playerAudioName = "common/full_match_win.wav";
      this.playerAudioName = "common/winning_the_game.wav";
    } else if (gameEndType === END_GAME_REASON.DRAW) {
      this.playerAudioName = "common/draw.mp3";
    } else {
      //this.playerAudioName = "common/full_match_lose.wav";
      this.playerAudioName = "common/losing_the_game.wav";
    }

    this.initialize();
  }

  private initialize() {
    if (this.playerScoreGroup && this.opponentScoreGroup) {
      const spacing = 40;
      const boxWidth = this.playerScoreBox!.width; // Already scaled via width setter
      const boxHeight = this.playerScoreBox!.height;
      const totalWidth = boxWidth * 2 + spacing;

      // Position the groups
      this.playerScoreGroup.x = app.screen.width / 2 - totalWidth / 2;
      this.playerScoreGroup.y = app.screen.height / 2 - boxHeight / 2 + 30;

      this.opponentScoreGroup.x = this.playerScoreGroup.x + boxWidth + spacing;
      this.opponentScoreGroup.y = this.playerScoreGroup.y;

      // Position text relative to its group (local coordinates)
      if (this.playerScoreText && this.opponentScoreText) {
        // Center text in box
        this.playerScoreText.x = boxWidth / 2 - this.playerScoreText.width / 2;
        this.playerScoreText.y =
          boxHeight / 2 - this.playerScoreText.height / 2;

        this.opponentScoreText.x =
          boxWidth / 2 - this.opponentScoreText.width / 2;
        this.opponentScoreText.y =
          boxHeight / 2 - this.opponentScoreText.height / 2;
      }

      // Position the hyphen
      if (this.hyphenGraphic) {
        // Original: pivot at (7,4), pos at (center + 12, center + 12)
        // New: pos at (center + 12 - 7, center + 12 - 4)
        this.hyphenGraphic.x =
          this.playerScoreGroup.x +
          this.playerScoreGroup.width +
          this.hyphenGraphic.width;
        this.hyphenGraphic.y =
          this.playerScoreGroup.y +
          this.playerScoreGroup.height / 2 -
          this.hyphenGraphic.height / 2;
      }

      // Initially hide score elements
      this.playerScoreGroup.alpha = 0;
      this.opponentScoreGroup.alpha = 0;
      if (this.hyphenGraphic) {
        this.hyphenGraphic.alpha = 0;
      }
    }

    if (this.endGameText) {
      // Center endGameText on screen
      this.endGameText.x = app.screen.width / 2 - this.endGameText.width / 2;
      this.endGameText.y = app.screen.height / 2 - this.endGameText.height / 2;
      this.endGameText.alpha = 0;
    }
  }

  public show() {
    const isCarnival = CURRENT_PARTNER === PARTNER_ID.bt;
    const delay = isCarnival ? 0.5 : 1;
    if (this.endGameText) {
      // Show end game text first
      gsap.to(this.endGameText, {
        alpha: 1,
        duration: 1,
        ease: "none",
        onComplete: () => {
          // After text is shown, wait 2 seconds then fade it out
          gsap.to(this.hyphenGraphic, {
            alpha: 1,
            duration: 0.5,
            ease: "none",
          });
          gsap.to(this.endGameText, {
            alpha: 0,
            duration: 0.5,
            delay: 0.5,
            ease: "none",
            onComplete: () => {
              // Play audio and show score animation after text fades out
              this.result_timeout = setTimeout(() => {
                sfx.stopAllSounds();
                sfx.play(this.playerAudioName);
                this.showScoreAnimation();
                if (isCarnival) {
                  // skip audio play
                  //skip lottie animations
                  return;
                }

                if (this.gameEndType === END_GAME_REASON.DRAW) {
                  playDrawAnimation();
                  return;
                }
                if (this.playerWon) {
                  playYouWinAnimation();
                  return;
                }
                playYouLoseAnimation();
              }, delay);
            },
          });
        },
      });
    } else {
      // If no end game text, show score animation directly
      this.result_timeout = setTimeout(() => {
        sfx.stopAllSounds(isCarnival);
        sfx.play(this.playerAudioName);
        this.showScoreAnimation();
        if (isCarnival) {
          // skip audio play
          //skip lottie animations
          return;
        }
        if (this.gameEndType === END_GAME_REASON.DRAW) {
          playDrawAnimation();
          return;
        }
        if (this.playerWon) {
          playYouWinAnimation();
          return;
        }
        playYouLoseAnimation();
      }, delay);
    }
  }

  // private showPlayYouWon(playerBar: PlayerProfileBar) {
  //   this.newContainerBg = new Graphics();
  //   this.newContainerBg.rect(0, 0, app.screen.width, app.screen.height);
  //   this.newContainerBg.fill({
  //     color: "#ffffff",
  //     alpha: 0.35,
  //   });
  //   this.addChild(this.newContainerBg);

  //   // Create and configure the player won image
  //   this.playerWonImage = Sprite.from("you-won");
  //   this.scaleCalculate = app.screen.width / this.defaultScreenWidth;

  //   const finalScale = Math.max(this.scaleCalculate, 0.6);
  //   this.playerWonImage.scale.set(finalScale);
  //   this.playerWonImage.x = (app.screen.width - this.playerWonImage.width) / 2;
  //   this.playerWonImage.y =
  //     (app.screen.height - this.playerWonImage.height) / 2 - 100;

  //   this.addChild(this.playerWonImage);

  //   // Calculate the profile bar scaling
  //   let finalScaleProfileBar = Math.min(this.scaleCalculate * 3.75, 2.5);
  //   finalScaleProfileBar = Math.max(finalScaleProfileBar, 2.3);

  //   playerBar.scale.set(finalScaleProfileBar);
  //   playerBar.x = (app.screen.width - playerBar.width) / 2;
  //   playerBar.y = (app.screen.height - playerBar.height) / 2 + 175;

  //   playerBar.pokerChipBackground.visible = false;
  //   playerBar.pokerChip.visible = false;

  //   this.addChild(playerBar);
  // }

  private showScoreAnimation() {
    // these groups are created only in game over or draw scenarios
    if (this.playerScoreGroup && this.opponentScoreGroup) {
      // Store final positions for groups
      const finalPlayerGroupX = this.playerScoreGroup.x;
      const finalOpponentGroupX = this.opponentScoreGroup.x;

      // Set initial positions for groups
      this.playerScoreGroup.x = -this.playerScoreBox!.width;
      this.opponentScoreGroup.x =
        app.screen.width + this.opponentScoreBox!.width;

      const animationDuration = CURRENT_PARTNER === PARTNER_ID.bt ? 0.75 : 1;
      // Animate the groups
      gsap.to([this.playerScoreGroup, this.opponentScoreGroup], {
        alpha: 1,
        duration: animationDuration,
        ease: "power2.out",
      });

      gsap.to(this.playerScoreGroup, {
        x: finalPlayerGroupX,
        duration: animationDuration,
        ease: "power2.out",
      });

      gsap.to(this.opponentScoreGroup, {
        x: finalOpponentGroupX,
        duration: animationDuration,
        ease: "power2.out",
      });

      if (this.hyphenGraphic) {
        gsap.to(this.hyphenGraphic, {
          alpha: 1,
          duration: animationDuration,
          ease: "power2.out",
        });
      }
    }
  }

  public getPlayerWon() {
    return this.playerWon;
  }

  public hide() {
    if (this.playerScoreGroup && this.opponentScoreGroup) {
      gsap.to(
        [this.playerScoreGroup, this.opponentScoreGroup, this.hyphenGraphic],
        {
          alpha: 0,
          duration: 1,
          ease: "none",
          onComplete: () => {
            if (this.result_timeout) {
              clearTimeout(this.result_timeout);
            }
            this.destroy();
          },
        },
      );
    }

    if (this.endGameText) {
      gsap.to(this.endGameText, {
        alpha: 0,
        duration: 1,
        ease: "none",
        onComplete: () => {
          if (this.result_timeout) {
            clearTimeout(this.result_timeout);
          }
          this.destroy();
        },
      });
    }
  }

  public resize(playerBar: PlayerProfileBar) {
    if (this.playerWon && this.newContainerBg) {
      this.newContainerBg.clear();
      this.newContainerBg.rect(0, 0, app.screen.width, app.screen.height);
      this.newContainerBg.fill({ color: 0xffffff, alpha: 0.35 });

      if (this.playerWonImage) {
        this.scaleCalculate = app.screen.width / this.defaultScreenWidth;
        const finalScale = Math.max(this.scaleCalculate, 0.6);

        this.playerWonImage.scale.set(finalScale);
        this.playerWonImage.x =
          (app.screen.width - this.playerWonImage.width) / 2;
        this.playerWonImage.y =
          (app.screen.height - this.playerWonImage.height) / 2 - 100;
      }

      if (playerBar && this.playerWonImage) {
        let finalScale = Math.min(this.scaleCalculate * 3.75, 2.5);
        finalScale = Math.max(finalScale, 2.3);

        playerBar.scale.set(finalScale);
        playerBar.x = (app.screen.width - playerBar.width) / 2;
        playerBar.y = (app.screen.height - playerBar.height) / 2 + 175;
      }
    }
  }
}
