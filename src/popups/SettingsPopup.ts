import { Container, Sprite, Texture, Text } from "pixi.js";
import gsap from "gsap";
import { sfx } from "../utils/audio";
import { app } from "../app";
import { Slider } from "../ui/slider";
import { navigation } from "../utils/navigation";
import { startPractice } from "../views/practice/practiceInitializer";
import { bgm } from "../utils/audio";
export class SettingsPopup extends Container {
  private bg: Sprite;
  private modalBg: Sprite;
  private volumeSlider!: Slider;
  private bgmSlider!: Slider;
  private muteButton!: Sprite;
  private bgmMuteButton!: Sprite;
  private currentVolume: number = sfx.getVolume();
  private currentBgmVolume: number = bgm.getVolume();
  private previousVolume: number = sfx.getVolume();
  private previousBgmVolume: number = bgm.getVolume();
  private closeButton: Sprite | null = null;

  constructor(options?: { hideHowToPlayButton?: boolean }) {
    super();

    // Setup background
    this.bg = new Sprite(Texture.WHITE);
    this.bg.width = app.screen.width;
    this.bg.height = app.screen.height;
    this.bg.tint = 0x0f0f0f;
    this.bg.alpha = 0.75;
    this.bg.interactive = true;
    this.bg.on("pointerdown", () => {
      navigation.dismissPopup();
    });
    this.addChild(this.bg);

    // Setup modal background
    this.modalBg = Sprite.from("model-bg");
    this.modalBg.width = this.modalBg.width / 2;
    this.modalBg.height = !options?.hideHowToPlayButton
      ? this.modalBg.height / 2 + 120
      : this.modalBg.height / 2;
    this.modalBg.x = app.screen.width / 2 - this.modalBg.width / 2;
    this.modalBg.y = app.screen.height / 2 - this.modalBg.height / 2;
    this.modalBg.interactive = true;
    this.modalBg.on("pointerdown", (event) => {
      event.stopPropagation();
    });
    this.addChild(this.modalBg);

    this.closeButton = Sprite.from("close-button");
    this.closeButton.width = 50;
    this.closeButton.height = 50;
    this.closeButton.x =
      this.modalBg.x + this.modalBg.width - this.closeButton.width - 15;
    this.closeButton.y = this.modalBg.y + 15;
    this.closeButton.interactive = true;
    this.closeButton.on("pointerdown", () => {
      navigation.dismissPopup();
    });
    this.addChild(this.closeButton);

    // Add title
    const title = new Text({
      text: "Settings",
      style: {
        fill: 0xffffff,
        fontSize: 32,
        fontWeight: "bold",
      },
    });
    title.x = app.screen.width / 2 - title.width / 2;
    title.y = this.modalBg.y + 100;
    this.addChild(title);

    // Add SFX volume label
    const sfxLabel = new Text({
      text: "SFX Volume",
      style: {
        fill: 0xffffff,
        fontSize: 18,
      },
    });
    sfxLabel.x = this.modalBg.x + 40;
    sfxLabel.y = title.y + 100;
    this.addChild(sfxLabel);

    // Create SFX mute button
    this.muteButton = Sprite.from(
      this.currentVolume > 0 ? "sound-on" : "sound-off",
    );

    // Create SFX slider
    this.volumeSlider = new Slider({
      width: this.modalBg.width - 100 - 50,
      height: 15,
      initialValue: this.currentVolume,
      onValueChange: (value) => {
        this.currentVolume = value;
        sfx.setVolume(value);
        this.muteButton.texture = Texture.from(
          value > 0 ? "sound-on" : "sound-off",
        );
      },
      onValueChangeEnd: () => {
        if (this.currentVolume > 0) {
          sfx.play("common/button-click.mp3");
        }
      },
    });
    this.volumeSlider.x = sfxLabel.x;
    this.volumeSlider.y = sfxLabel.y + 40;
    this.addChild(this.volumeSlider);

    this.muteButton.width = 50;
    this.muteButton.height = 50;
    this.muteButton.x = this.modalBg.x + this.modalBg.width - 80;
    this.muteButton.y = this.volumeSlider.y - 17;
    this.muteButton.interactive = true;
    this.muteButton.cursor = "pointer";
    this.muteButton.on("pointerdown", this.toggleMute.bind(this));
    this.addChild(this.muteButton);

    // Add BGM volume label
    const bgmLabel = new Text({
      text: "BGM Volume",
      style: {
        fill: 0xffffff,
        fontSize: 18,
      },
    });
    bgmLabel.x = this.modalBg.x + 40;
    bgmLabel.y = this.volumeSlider.y + 50;
    this.addChild(bgmLabel);

    // Create BGM mute button
    this.bgmMuteButton = Sprite.from(
      this.currentBgmVolume > 0 ? "music-on" : "music-off",
    );

    // Create BGM slider
    this.bgmSlider = new Slider({
      width: this.modalBg.width - 100 - 50,
      height: 15,
      initialValue: this.currentBgmVolume,
      onValueChange: (value) => {
        this.currentBgmVolume = value;
        bgm.setVolume(value);
        this.bgmMuteButton.texture = Texture.from(
          value > 0 ? "music-on" : "music-off",
        );
      },
      onValueChangeEnd: () => {
        if (this.currentBgmVolume > 0) {
          sfx.play("common/button-click.mp3");
        }
      },
    });
    this.bgmSlider.x = bgmLabel.x;
    this.bgmSlider.y = bgmLabel.y + 40;
    this.addChild(this.bgmSlider);

    this.bgmMuteButton.width = 50;
    this.bgmMuteButton.height = 50;
    this.bgmMuteButton.x = this.modalBg.x + this.modalBg.width - 80; // Fixed position - same as SFX button
    this.bgmMuteButton.y = this.bgmSlider.y - 17;
    this.bgmMuteButton.interactive = true;
    this.bgmMuteButton.cursor = "pointer";
    this.bgmMuteButton.on("pointerdown", this.toggleBgmMute.bind(this));
    this.addChild(this.bgmMuteButton);

    if (!options?.hideHowToPlayButton) {
      // Add How to Play button
      const howToPlayButtonBg = Sprite.from("golden-button-bg");
      howToPlayButtonBg.width = 200;
      howToPlayButtonBg.height = 60;
      howToPlayButtonBg.x = app.screen.width / 2 - howToPlayButtonBg.width / 2;
      howToPlayButtonBg.y = this.bgmSlider.y + 80;
      howToPlayButtonBg.interactive = true;
      howToPlayButtonBg.cursor = "pointer";

      const howToPlayText = new Text({
        text: "How to Play",
        style: {
          fill: 0x1a1c1e,
          fontSize: 18,
          fontWeight: "bold",
        },
      });
      howToPlayText.x =
        howToPlayButtonBg.x +
        howToPlayButtonBg.width / 2 -
        howToPlayText.width / 2;
      howToPlayText.y =
        howToPlayButtonBg.y +
        howToPlayButtonBg.height / 2 -
        howToPlayText.height / 2;

      howToPlayButtonBg.on("pointerdown", () => {
        sfx.play("common/button-click.mp3");
        startPractice();
        // navigation.presentPopup(InfoPopup, {
        //     message: "Learn how to play Two Plus One Jack!\n\n1. Place your cards in three columns\n2. Try to get as close to 21 as possible without going over\n3. Win 2 out of 3 columns to win the game!",
        //     showOkButton: true
        // });
      });

      this.addChild(howToPlayButtonBg);
      this.addChild(howToPlayText);
    }
  }

  private toggleMute() {
    if (this.currentVolume > 0) {
      // Store current volume and mute
      this.previousVolume = this.currentVolume;
      this.volumeSlider.setValue(0);
      this.muteButton.texture = Texture.from("sound-off");
    } else {
      // Restore to previous volume or default to 1
      const restoreVolume = this.previousVolume > 0 ? this.previousVolume : 1;
      this.volumeSlider.setValue(restoreVolume);
      this.muteButton.texture = Texture.from("sound-on");
    }
    sfx.play("common/button-click.mp3");
  }

  private toggleBgmMute() {
    if (this.currentBgmVolume > 0) {
      // Store current volume and mute
      this.previousBgmVolume = this.currentBgmVolume;
      this.bgmSlider.setValue(0);
      this.bgmMuteButton.texture = Texture.from("music-off");
    } else {
      // Restore to previous volume or default to 1
      const restoreVolume =
        this.previousBgmVolume > 0 ? this.previousBgmVolume : 1;
      this.bgmSlider.setValue(restoreVolume);
      this.bgmMuteButton.texture = Texture.from("music-on");
    }
    sfx.play("common/button-click.mp3");
  }

  public async show() {
    gsap.killTweensOf(this.bg);
    this.bg.alpha = 0;
    gsap.to(this.bg, { alpha: 0.8, duration: 0.2, ease: "linear" });
  }

  public async hide() {
    gsap.killTweensOf([this.bg]);

    gsap.to(this.bg, { alpha: 0, duration: 0.2, ease: "linear" });
  }
}
