import { Container, Sprite } from "pixi.js";
import gsap from "gsap";

export class FTUEPointer extends Container {
  private pointer: Sprite;
  private multiplePointers: Sprite[] = [];

  constructor() {
    super();
    this.eventMode = "none"; // Allow pointer events to pass through
    this.pointer = Sprite.from("ftue-pointer");
    this.pointer.eventMode = "none"; // Allow pointer events to pass through
    this.zIndex = 1000;
    this.pointer.scale.set(0.2);
    this.visible = false;
    this.addChild(this.pointer);
  }

  public animateDrag(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    this.pointer.position.set(from.x + 50, from.y - 50);
    const startLoopAnimation = (initialAnimation: boolean = false) => {
      this.visible = true;
      this.pointer.alpha = 0;
      gsap.to(this.pointer.position, {
        x: from.x - 10,
        y: from.y - 20,
        duration: 0.5,
        delay: initialAnimation ? 0.5 : 3,
        ease: "none",
        onComplete: () => {
          gsap.fromTo(
            this.pointer,
            {
              alpha: 0,
            },
            {
              alpha: 1,
              duration: 0.3,
              onComplete: () => {
                gsap.fromTo(
                  this.pointer.position,
                  {
                    x: from.x - 10,
                    y: from.y - 20,
                  },
                  {
                    x: to.x,
                    y: to.y,
                    duration: 1,
                    ease: "power4.inOut",
                    onComplete: () => {
                      gsap.to(this.pointer, {
                        alpha: 0,
                        duration: 0.2,
                        ease: "none",
                        onComplete: () => {
                          this.visible = false;
                          startLoopAnimation();
                          this.pointer.position.set(from.x + 50, from.y - 50);
                        },
                      });
                    },
                  },
                );
              },
            },
          );
        },
      });
    };
    startLoopAnimation(true);
  }

  public animateTap(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    this.visible = true;
    this.pointer.position.set(from.x, from.y);
    this.pointer.alpha = 0;

    gsap.to(this.pointer, {
      alpha: 1,
      duration: 0.5,
      onComplete: () => {
        gsap.to(this.pointer.position, {
          y: to.y,
          duration: 1,
          yoyo: true,
          repeat: -1,
          ease: "none",
        });
      },
    });
  }

  public animateUpDown({
    x,
    y,
    angle,
  }: {
    x: number;
    y: number;
    angle?: number;
  }) {
    this.visible = true;
    this.pointer.position.set(x, y);
    if (angle) {
      this.pointer.angle = angle;
    }
    gsap.killTweensOf(this.pointer);
    gsap.killTweensOf(this.pointer.position);
    gsap.to(this.pointer, {
      alpha: 1,
      duration: 0.5,
      onComplete: () => {
        gsap.to(this.pointer.position, {
          y: y - 10,
          x,
          duration: 0.5,
          yoyo: true,
          repeat: -1,
        });
      },
    });
  }

  public stopAnimation() {
    gsap.to(this.pointer, {
      alpha: 0,
      duration: 0.1,
      ease: "power1.inOut",
      onComplete: () => {
        this.visible = false;
        this.angle = 0;
        gsap.killTweensOf(this.pointer.position);
        gsap.killTweensOf(this.pointer);
      },
    });
    // Stop all multiple pointers
    this.stopMultipleAnimations();
  }

  public animateMultipleTaps(
    positions: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
    }>,
  ) {
    // Stop and hide the single pointer first
    gsap.killTweensOf(this.pointer);
    gsap.killTweensOf(this.pointer.position);
    this.pointer.alpha = 0;
    this.pointer.visible = false;

    // Clear existing multiple pointers
    this.stopMultipleAnimations();

    // Create and animate pointers for each position with wave effect
    positions.forEach((pos, index) => {
      const pointer = Sprite.from("ftue-pointer");
      pointer.eventMode = "none"; // Allow pointer events to pass through
      pointer.scale.set(0.2);
      pointer.position.set(pos.from.x, pos.from.y);
      pointer.alpha = 0; // start hidden for fade-in
      this.addChild(pointer);
      this.multiplePointers.push(pointer);

      // Stagger the animation delay to create a wave effect
      const waveDelay = index * 0.08; // 80ms delay between each pointer

      // Fade-in each pointer with the same stagger
      gsap.to(pointer, {
        alpha: 1,
        duration: 0.2,
        delay: waveDelay,
        ease: "power1.out",
      });

      // Start the position animation with a staggered delay
      gsap.to(pointer.position, {
        y: pos.to.y,
        duration: 1,
        delay: waveDelay,
        yoyo: true,
        repeat: -1,
        ease: "none",
      });
    });

    this.visible = true;
  }

  public animateMultipleUpDown(
    positions: Array<{ x: number; y: number; angle?: number }>,
  ) {
    // Stop and hide the single pointer first
    gsap.killTweensOf(this.pointer);
    gsap.killTweensOf(this.pointer.position);
    this.pointer.alpha = 0;
    this.pointer.visible = false;

    // Clear existing multiple pointers
    this.stopMultipleAnimations();

    // Create and animate pointers for each position with wave effect
    positions.forEach((pos, index) => {
      const pointer = Sprite.from("ftue-pointer");
      pointer.eventMode = "none"; // Allow pointer events to pass through
      pointer.scale.set(0.2);
      pointer.position.set(pos.x, pos.y);
      if (pos.angle !== undefined) {
        pointer.angle = pos.angle;
      }
      pointer.alpha = 0; // start hidden for fade-in
      this.addChild(pointer);
      this.multiplePointers.push(pointer);

      // Stagger the animation delay to create a wave effect
      const waveDelay = index * 0.15; // 150ms delay between each pointer

      // Fade-in each pointer with the same stagger
      gsap.to(pointer, {
        alpha: 1,
        duration: 0.2,
        delay: waveDelay,
        ease: "power1.out",
      });

      // Start the position animation with a staggered delay
      gsap.to(pointer.position, {
        y: pos.y - 10,
        x: pos.x,
        duration: 0.5,
        delay: waveDelay,
        yoyo: true,
        repeat: -1,
      });
    });

    this.visible = true;
  }

  private stopMultipleAnimations() {
    this.multiplePointers.forEach((pointer) => {
      // Stop ongoing movement tweens first
      gsap.killTweensOf(pointer.position);
      gsap.killTweensOf(pointer);
      // Fade out smoothly before removing
      gsap.to(pointer, {
        alpha: 0,
        duration: 0.12,
        ease: "power1.inOut",
        onComplete: () => {
          if (pointer.parent) {
            pointer.parent.removeChild(pointer);
          }
        },
      });
    });
    this.multiplePointers = [];
  }
}
