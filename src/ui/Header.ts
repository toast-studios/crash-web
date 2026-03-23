import { Container, Graphics, Sprite } from "pixi.js";
import { app } from "../app";
import { CircleButton } from "./CircleButton";
import gsap from "gsap";
import { VIEW_MODE } from "../constants";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class Header extends Container {
  public exitButton: CircleButton | null = null;
  private partnerLogo: Sprite | null = null;
  private inboxButton: CircleButton | null = null;
  private settingButton: CircleButton | null = null;
  private size: number = 60;
  private pedding: number = 30;
  private layout: "default" | "ember" = "default";
  public viewMode = import.meta.env.VITE_VIEW_MODE;
  private gameTableWidth: number;
  constructor({
    enableExitButton,
    onExitButtonPress,
    enablePartnerLogoButton,
    enableInboxButton,
    onInboxButtonPress,
    enableSettingButton,
    onSettingButtonPress,
    layout = "default",
    gameTableWidth,
  }: {
    enablePartnerLogoButton?: boolean;
    enableExitButton?: boolean;
    enableInboxButton?: boolean;
    enableSettingButton?: boolean;
    onExitButtonPress?: () => void;
    onInboxButtonPress?: () => void;
    onSettingButtonPress?: () => void;
    layout?: "default" | "ember";
    gameTableWidth?: number;
  }) {
    super();

    this.layout = layout;
    this.gameTableWidth = gameTableWidth || 0;
    const newContainer = new Graphics();
    newContainer.rect(0, 0, app.screen.width, 1);
    newContainer.fill({
      color: "red",
      alpha: 0,
    });

    if (enableExitButton) {
      this.exitButton = new CircleButton({ iconName: "exit-icon" });
      this.exitButton.onPress.connect(onExitButtonPress as () => void);
      this.addChild(this.exitButton);
    }
    if (enablePartnerLogoButton) {
      this.partnerLogo = Sprite.from("partner_logo");
      this.addChild(this.partnerLogo);
    }
    if (enableInboxButton) {
      this.inboxButton = new CircleButton({ iconName: "inbox-icon" });
      this.inboxButton.onPress.connect(onInboxButtonPress as () => void);
      this.addChild(this.inboxButton);
    }

    if (enableSettingButton) {
      this.settingButton = new CircleButton({ iconName: "setting" });
      this.settingButton.onPress.connect(onSettingButtonPress as () => void);
      this.addChild(this.settingButton);
    }
    this.initialize();
  }

  private initialize() {
    // Use the stored layout type
    if (this.layout === "ember") {
      this.initializeEmberLayout();
    } else {
      this.initializeDefaultLayout();
    }
  }

  private initializeEmberLayout() {
    // For ember: exit button on left, settings button on right
    if (this.exitButton) {
      this.exitButton.x = this.exitButton.width / 2;
      this.exitButton.y = this.exitButton.height / 2 + this.pedding - 5;
    }

    if (this.settingButton) {
      this.settingButton.anchor.set(0.5);
      this.settingButton.x = app.screen.width - 50;
      if (
        this.viewMode == VIEW_MODE.WEB_VIEW &&
        CURRENT_PARTNER == PARTNER_ID.em
      ) {
        this.settingButton.x =
          app.screen.width / 2 + this.gameTableWidth / 2 - 255;
      }
      this.settingButton.y = this.settingButton.height / 2 + this.pedding - 5;
    }
  }

  private initializeDefaultLayout() {
    // Default layout for other partners
    if (this.exitButton) {
      this.exitButton.x = this.exitButton.width / 2;
      this.exitButton.y = this.exitButton.height / 2 + this.pedding;
    }

    if (this.partnerLogo) {
      this.partnerLogo.anchor.set(0.5);
      this.partnerLogo.width = this.size;
      this.partnerLogo.height = this.size;
      this.partnerLogo.x =
        this.exitButton!.x + this.exitButton!.width + this.pedding;
      this.partnerLogo.y = this.partnerLogo.height / 2 + this.pedding;
    }

    if (this.settingButton) {
      this.settingButton.anchor.set(0.5);
      if (this.exitButton) {
        this.settingButton.x =
          this.exitButton.x + this.exitButton.width + this.pedding;
      } else {
        this.settingButton.x = this.x + 80;
      }
      this.settingButton.y = this.settingButton.height / 2 + this.pedding;
    }

    if (this.inboxButton) {
      this.inboxButton.anchor.set(0.5);
      this.inboxButton.x =
        (this.settingButton ? this.settingButton!.x : app.screen.width) -
        this.inboxButton.width -
        this.pedding;
      this.inboxButton.y = this.inboxButton.height / 2 + this.pedding;
    }
  }

  // eslint-disble-next-line @typescript-eslint/no-unused-vars
  public resize() {
    // Implement if needed
    this.initialize();
  }

  public async show() {
    this.visible = true;
  }

  public async hide() {
    this.visible = false;
  }

  public hideExitButton() {
    if (this.exitButton) {
      this.exitButton.setDisabled();
    }
  }
  public hideSettingButton() {
    if (this.settingButton) {
      this.settingButton.setDisabled();
      gsap.to(this.settingButton, {
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }
}
