import { Assets, Container, Graphics, Sprite } from "pixi.js";
import { Logger } from "../utils/logger";

type ProfilePictureProps = {
  imageUrl: string;
  fallbackImageUrl: string;
  isOpponent: false;
  useWhiteBorder?: boolean;
  size?: number;
  borderOffset?: number;
};

type OpponentProfilePictureProps = {
  imageUrl: string;
  fallbackImageUrl: string;
  useWhiteBorder?: boolean;
  size?: number;
  borderOffset?: number;
};

export class ProfilePicture extends Container {
  constructor(props: ProfilePictureProps | OpponentProfilePictureProps) {
    super();

    const { imageUrl, fallbackImageUrl, useWhiteBorder, size = 55 } = props;
    let { borderOffset } = props;

    const mask = new Graphics();
    mask.roundRect(0, 0, size, size, size / 2);
    mask.fill({ color: 0xffffff, alpha: 1 });

    // Calculate border offset (floor 10% of size, minimum 2, max 10)
    borderOffset =
      typeof borderOffset === "number"
        ? borderOffset
        : Math.floor(Math.max(2, Math.min(3, size * 0.05)));
    const border = Sprite.from(useWhiteBorder ? "border-white" : "border");
    border.width = size + borderOffset * 2;
    border.height = size + borderOffset * 2;
    border.x = -borderOffset;
    border.y = -borderOffset;

    this.addChild(border);
    this.addChild(mask);

    if (imageUrl) {
      this.loadImage(imageUrl, size, mask).catch((error) => {
        // Logger.warn("Error loading profile picture showing fallback", error);
        if (fallbackImageUrl) {
          this.loadImage(fallbackImageUrl, size, mask).catch((error) => {
            Logger.error("Error loading fallback profile picture", error);
          });
        } else {
          Logger.error("No fallback image url provided", error);
        }
      });
    }
  }

  private async loadImage(imageUrl: string, size: number, mask: Graphics) {
    const texture = await Assets.load(imageUrl);
    const sprite = new Sprite(texture);

    sprite.width = size;
    sprite.height = size;
    sprite.mask = mask;
    this.addChildAt(sprite, 0);
  }
}
