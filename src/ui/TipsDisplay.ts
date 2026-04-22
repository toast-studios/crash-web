import { Container, Sprite, Text } from "pixi.js";
import { FONT_WEIGHTS } from "../constants/typography";
import gsap from "gsap";

const BLACKJACK_TIPS = [
  "If you're going over 21, make\nsure it's tequila, not your hand.",
  "Under 21 is how you win here,\notherwise, bottoms up.",
  "One win is luck. Two wins? That's a Hustle.",
  "Win two, brag forever.\nLose two, blame the cards.",
  "The final hit is where\nHustlers turn the tables.",
  "One last hit can turn the table…\nin 21Hustle and in life.",
  "The final hit is sometimes a sweet\nhigh or a bad trip. Play it wisely.",
  "Hit big, win bigger.",
  "Great hustlers know when to hit,\nto stand and then to hit again.",
  "Hit smart, hustle harder.",
  "Math is hard. So is losing.",
  "Houston, we have a Hustle.",
  "You talking to me… or to your cards?",
  "I see busted people…",
  "Frankly, my dear, I don't give a 22.",
  "Fasten your seat belts,\nit's going to be a bumpy ride.",
  "To infinity… wait no, only 21.",
  "The first rule of 21 Hustle:\nyou don't talk about 21 Hustle.",
  "I'll have what she's Hustling.",
];

export interface TipsDisplayOptions {
  width: number;
  y: number;
}

export class TipsDisplay extends Container {
  private tipsBulb: Sprite;
  private tipsText: Text;
  private usedTips: Set<number> = new Set();
  private animationInterval: NodeJS.Timeout | null = null;
  private screenWidth: number;

  constructor(options: TipsDisplayOptions) {
    super();

    this.screenWidth = options.width;

    this.tipsBulb = Sprite.from("tips-bulb");
    this.tipsBulb.width /= 2;
    this.tipsBulb.height /= 2;
    this.tipsBulb.alpha = 0;
    this.addChild(this.tipsBulb);

    this.tipsText = new Text({
      text: "",
      style: {
        fill: "#9ca3af",
        fontSize: 14,
        fontFamily: "Inter",
        fontWeight: FONT_WEIGHTS.REGULAR,
        align: "left",
        wordWrap: true,
        wordWrapWidth: this.screenWidth - 80,
      },
    });
    this.tipsText.alpha = 0;
    this.addChild(this.tipsText);

    this.layout();
  }

  private layout() {
    // Get the actual width of the rendered text
    const actualTextWidth = this.tipsText.width;
    const spacing = 10;

    // Calculate total width (bulb + spacing + text)
    const totalWidth = this.tipsBulb.width + spacing + actualTextWidth;

    // Center the entire content
    const startX = -totalWidth / 2;

    // Position bulb on the left
    this.tipsBulb.x = startX + this.tipsBulb.width / 2 - 5;
    if (this.tipsText.text.split("\n").length === 1) {
      this.tipsBulb.y = -this.tipsText.height / 2 - 5;
    } else {
      this.tipsBulb.y = -this.tipsText.height / 2 + 3;
    }

    // Position text to the right of bulb
    this.tipsText.x = startX + this.tipsBulb.width + 20;
    this.tipsText.y = -this.tipsText.height / 2;
  }

  private getRandomTip(): string {
    // Reset if all tips have been used
    if (this.usedTips.size >= BLACKJACK_TIPS.length) {
      this.usedTips.clear();
    }

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * BLACKJACK_TIPS.length);
    } while (this.usedTips.has(randomIndex));

    this.usedTips.add(randomIndex);
    return BLACKJACK_TIPS[randomIndex];
  }

  public start() {
    // Show first tip immediately
    this.showNextTip();

    // Set up interval to switch tips every 5 seconds
    this.animationInterval = setInterval(() => {
      this.showNextTip();
    }, 3000);
  }

  private showNextTip() {
    const tip = this.getRandomTip();

    // Fade out current tip and bulb
    gsap.to(this.tipsText, {
      alpha: 0,
      duration: 1,
      ease: "power2.in",
    });
    gsap.to(this.tipsBulb, {
      alpha: 0,
      duration: 1,
      ease: "power2.in",
      onComplete: () => {
        // Update text
        this.tipsText.text = tip;
        this.layout();

        // Fade in new tip
        gsap.to(this.tipsText, {
          alpha: 1,
          duration: 1,
          ease: "power2.out",
        });

        // Fade in bulb and start blinking
        gsap.to(this.tipsBulb, {
          alpha: 1,
          duration: 1,
          ease: "power2.out",
        });
      },
    });
  }

  public stop() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
      gsap.killTweensOf(this.tipsText);
      gsap.killTweensOf(this.tipsBulb);
    }

    // Fade out final tip and bulb
    gsap.to([this.tipsText, this.tipsBulb], {
      alpha: 0,
      duration: 0.3,
      ease: "power2.in",
    });
  }
}
