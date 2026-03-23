import { Container, FillGradient, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { app } from "../app";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class VersusText extends Container {
  // private username1Text: Text
  // private username2Text: Text
  private vsText: Text;

  constructor() {
    super();

    // const textStyle = new TextStyle({
    //   fontFamily: 'Inter',
    //   fontSize: 32,
    //   fill: 0xffffff,
    //   align: 'center',
    //   fontWeight: '800',
    // })

    const colorStops = [0xa58d41, 0xffe9a3];

    if (CURRENT_PARTNER === PARTNER_ID.em) {
      colorStops[0] = 0x339c50;
      colorStops[1] = 0x00d13a;
    }
    // Create a fill gradient
    const gradientFill = new FillGradient(0, 0, 100, 88);

    // Add the color stops to the fill gradient with specific percentages
    gradientFill.addColorStop(0.2, colorStops[0]);
    gradientFill.addColorStop(0.84, colorStops[1]);

    const vsTextStyle = new TextStyle({
      fontFamily: "Pridi",
      fontSize: 88,
      fill: gradientFill,
      align: "center",
      fontWeight: "800",
    });

    // this.username1Text = new Text({ text: username1, style: textStyle });
    // this.username2Text = new Text({ text: username2, style: textStyle });
    this.vsText = new Text({ text: "VS", style: vsTextStyle });

    // this.username1Text.anchor.set(0.5)
    // this.username2Text.anchor.set(0.5)
    this.vsText.anchor.set(0.5);

    // Center the container in the screen
    this.position.set(app.screen.width / 2, app.screen.height / 2);

    this.addChild(this.vsText);

    this.positionElements();
  }

  private positionElements() {
    // this.username1Text.position.set(0, -80)
    this.vsText.position.set(0, 0);
    // this.username2Text.position.set(0, 80)
  }

  public async show(animate: boolean, onHideStartCallback: () => void) {
    if (!animate) {
      this.alpha = 1;
      return;
    }

    // Set initial positions and alpha
    // this.username1Text.y = -150 // Start above
    // this.username2Text.y = 150 // Start below
    // this.username1Text.alpha = 0
    // this.username2Text.alpha = 0
    this.vsText.alpha = 0;

    // Animate usernames and VS text
    // Username 1 animation (from top)
    // gsap.to(this.username1Text, {
    //   y: -80,
    //   alpha: 1,
    //   duration: 1,
    //   ease: 'power2.out',
    // })
    // // Username 2 animation (from bottom)
    // gsap.to(this.username2Text, {
    //   y: 80,
    //   alpha: 1,
    //   duration: 1,
    //   ease: 'power2.out',
    // })

    // VS text fade in
    gsap.to(this.vsText, {
      alpha: 1,
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => {
        // * Hide animation
        // gsap.to(this.username1Text, {
        //   alpha: 0,
        //   duration: 0.5,
        //   delay: 1,
        //   onStart: () => {
        //     onHideStartCallback()
        //   },
        //   ease: 'linear',
        // })
        // gsap.to(this.username2Text, {
        //   alpha: 0,
        //   duration: 0.5,
        //   delay: 1,
        //   ease: 'linear',
        // })
        gsap.to(this.vsText, {
          alpha: 0,
          duration: 0.5,
          delay: 0.5,
          ease: "linear",
          onStart: () => {
            onHideStartCallback();
          },
          onComplete: () => {
            this.visible = false;
            this.parent?.removeChild(this);
          },
        });
      },
    });
  }

  public resize(width: number, height: number) {
    this.position.set(width / 2, height / 2);
  }
}
