import { Container, NineSliceSprite, Sprite, Text, Texture } from "pixi.js";
import gsap from "gsap";
import { TOURNAMENT_STYLES } from "./TournamentStyles";
import { formatCurrency } from "../utils/currency";
import { CURRENCY_CODES, CURRENCY_UI_MAPPING } from "../types";
import { sfx } from "../utils/audio";
import { CurrencyDisplay } from "./CurrencyDisplay";

export class TournamentHeader extends Container {
  private exitButton: Container;
  private settingButton: Container;
  private priceBox: Container;
  private roundIndicator: Text;
  private winAmount: number;
  private currencySymbol: string;
  private currencyCode: CURRENCY_CODES;
  private onExitPress?: () => void;
  private onSettingPress?: () => void;
  private currentRound: number;
  private totalRounds: number;

  constructor({
    winAmount,
    currencySymbol,
    currencyCode,
    onExitPress,
    onSettingPress,
    currentRound = 1,
    totalRounds = 1,
  }: {
    entryFee: number;
    winAmount: number;
    currencySymbol: string;
    currencyCode: CURRENCY_CODES;
    onExitPress?: () => void;
    onSettingPress?: () => void;
    currentRound?: number;
    totalRounds?: number;
  }) {
    super();
    this.winAmount = winAmount;
    this.currencySymbol = currencySymbol;
    this.currencyCode = currencyCode;
    this.currentRound = currentRound;
    this.totalRounds = totalRounds;

    this.onExitPress = onExitPress;
    this.onSettingPress = onSettingPress;

    this.exitButton = this.createButton("exit_icon_new", this.onExitPress);
    this.addChild(this.exitButton);

    this.settingButton = this.createButton(
      "setting_icon_new",
      this.onSettingPress,
    );
    this.addChild(this.settingButton);

    this.priceBox = this.createPriceBox();
    this.addChild(this.priceBox);

    this.roundIndicator = new Text({
      text: this.getRoundText(),
      style: {
        ...TOURNAMENT_STYLES.HEADER.PRICE_LABEL,
        fontSize: 14,
        fill: 0xaaaaaa,
      },
    });
    this.roundIndicator.anchor.set(0.5, 0);
    this.roundIndicator.visible = this.totalRounds > 1;
    this.addChild(this.roundIndicator);
  }

  private getRoundText(): string {
    return `Round ${this.currentRound}/${this.totalRounds}`;
  }

  public updateRound(currentRound: number, totalRounds?: number): void {
    this.currentRound = currentRound;
    if (totalRounds !== undefined) {
      this.totalRounds = totalRounds;
    }
    this.roundIndicator.text = this.getRoundText();
    this.roundIndicator.visible = this.totalRounds > 1;
  }

  private createButton(iconName: string, onPress?: () => void): Container {
    const button = new Container();

    const background = Sprite.from("circle-button-bg");
    background.width = background.texture.width * 0.5;
    background.height = background.texture.height * 0.5;
    background.x = -background.width / 2;
    background.y = -background.height / 2;
    button.addChild(background);

    const sprite = Sprite.from(iconName);
    sprite.width = sprite.texture.width * 0.5;
    sprite.height = sprite.texture.height * 0.5;
    sprite.x = -sprite.width / 2;
    sprite.y = -sprite.height / 2;
    button.addChild(sprite);

    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerdown", () => {
      sfx.play("common/button-click.mp3");
      gsap.to(button.scale, { x: 0.9, y: 0.9, duration: 0.1 });
    });

    button.on("pointerup", () => {
      gsap.to(button.scale, { x: 1, y: 1, duration: 0.1 });
      onPress?.();
    });

    button.on("pointerupoutside", () => {
      gsap.to(button.scale, { x: 1, y: 1, duration: 0.1 });
    });

    return button;
  }

  private createPriceBox(): Container {
    const container = new Container();

    const labelText = new Text({
      text: "Prize",
      style: TOURNAMENT_STYLES.HEADER.PRICE_LABEL,
    });
    labelText.x = -labelText.width / 2;
    labelText.y = -labelText.height / 2;
    container.addChild(labelText);

    // Get currency icon from mapping
    const currencyMapping = CURRENCY_UI_MAPPING[this.currencyCode];
    const currencyIcon = currencyMapping?.icon;

    // Create currency display if icon exists
    let currencyDisplay: CurrencyDisplay | undefined;
    if (currencyIcon) {
      currencyDisplay = new CurrencyDisplay({
        icon: currencyIcon,
        size: 20,
      });
      container.addChild(currencyDisplay);
    }

    // Format currency text (without symbol if icon exists)
    const valueText = new Text({
      text: formatCurrency(
        this.winAmount,
        this.currencyCode,
        this.currencySymbol,
        !currencyIcon, // Include symbol only if no icon
      ),
      style: TOURNAMENT_STYLES.HEADER.PRICE_VALUE,
    });
    valueText.x = -valueText.width / 2;
    valueText.y = -valueText.height / 2;
    container.addChild(valueText);

    const overlay = Sprite.from("price_box_left_overlay");
    overlay.width = overlay.texture.width * 0.5;
    overlay.height = overlay.texture.height * 0.5;
    overlay.x = 0;
    overlay.y = -overlay.height / 2;
    container.addChildAt(overlay, 0);

    const leftSideWidth = overlay.width;
    const textPadding = 10;
    const borderGap = 30;
    const iconSpacing = 4;
    const iconWidth = currencyDisplay
      ? currencyDisplay.getDisplayWidth() + iconSpacing
      : 0;
    const rightSideWidth =
      iconWidth + valueText.width + textPadding + borderGap;
    const rightSideTextWidthPlusPadding = leftSideWidth + rightSideWidth;
    const totalWidth =
      rightSideTextWidthPlusPadding > 180 ? rightSideTextWidthPlusPadding : 180;
    const totalHeight = overlay.height;

    const background = new NineSliceSprite({
      texture: Texture.from("price_box_bg"),
      leftWidth: 60,
      topHeight: 60,
      rightWidth: 60,
      bottomHeight: 60,
    });
    background.scale.x = 0.5;
    background.scale.y = 0.5;
    background.width = totalWidth * 2;
    background.height = totalHeight * 2;
    background.x = -totalWidth / 2;
    background.y = -totalHeight / 2;
    container.addChildAt(background, 0);

    overlay.x = background.x;
    overlay.y = -overlay.height / 2;

    labelText.x = background.x + leftSideWidth / 2 - labelText.width / 2;
    labelText.y = -labelText.height / 2 - 2;

    // Position currency icon and value text
    const rightContentCenterX =
      background.x + leftSideWidth + rightSideWidth / 2;
    const totalContentWidth = iconWidth + valueText.width;
    const contentStartX = rightContentCenterX - totalContentWidth / 2;

    if (currencyDisplay) {
      currencyDisplay.x = contentStartX;
      currencyDisplay.y = -currencyDisplay.getDisplayHeight() / 2 - 2;
      valueText.x = contentStartX + iconWidth;
    } else {
      valueText.x = rightContentCenterX - valueText.width / 2;
    }
    valueText.y = -valueText.height / 2 - 2;

    return container;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public layout(width: number, __height: number) {
    const sidePadding = 20;

    this.exitButton.x = sidePadding + this.exitButton.width / 2;
    this.exitButton.y = this.exitButton.height / 2;

    this.settingButton.x = width - sidePadding - this.settingButton.width / 2;
    this.settingButton.y = this.settingButton.height / 2;

    this.priceBox.x = width / 2;
    this.priceBox.y = this.priceBox.height / 2;

    this.roundIndicator.x = width / 2;
    this.roundIndicator.y = this.priceBox.y + this.priceBox.height / 2 + 4;
  }

  public resize(width: number, height: number) {
    this.layout(width, height);
  }
}
