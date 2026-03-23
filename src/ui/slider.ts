import { Container, Sprite, FederatedPointerEvent } from "pixi.js";
import gsap from "gsap";

interface SliderOptions {
  width: number;
  height: number;
  initialValue?: number;
  onValueChange?: (value: number) => void;
  onValueChangeEnd?: (value: number) => void;
}

export class Slider extends Container {
  private background: Sprite;
  private fillBackground: Sprite;
  private fillMask: Sprite;
  private handle: Sprite;
  private isDragging: boolean = false;
  private currentValue: number;
  private options: SliderOptions;
  private dragStartX: number = 0;
  private dragStartValue: number = 0;

  constructor(options: SliderOptions) {
    super();
    this.options = options;
    this.currentValue = options.initialValue || 0;

    // Make the container interactive
    this.interactive = true;
    this.eventMode = "static"; // This helps prevent cursor flickering

    // Setup background
    this.background = Sprite.from("slider-background");
    this.background.width = options.width;
    this.background.height = options.height;
    this.addChild(this.background);

    // Setup fill background
    this.fillBackground = Sprite.from("slider-fill-background");
    this.fillBackground.width = options.width;
    this.fillBackground.height = options.height;
    this.addChild(this.fillBackground);

    // Setup mask for fill
    this.fillMask = Sprite.from("slider-fill-mask");
    this.fillMask.width = options.width * this.currentValue;
    this.fillMask.height = options.height;
    this.addChild(this.fillMask);
    this.fillBackground.mask = this.fillMask;

    // Setup handle
    this.handle = Sprite.from("slider-end-point");
    this.handle.anchor.set(0.5);
    const originalAspectRatio = this.handle.width / this.handle.height;
    this.handle.height = options.height * 2;
    this.handle.width = this.handle.height * originalAspectRatio;
    this.handle.y = options.height / 2;
    this.addChild(this.handle);

    // Set initial position
    this.updateHandlePosition(this.currentValue, false);

    // Setup events for the entire container
    this.on("pointerenter", this.onPointerEnter.bind(this))
      .on("pointerleave", this.onPointerLeave.bind(this))
      .on("pointerdown", this.onPointerDown.bind(this))
      .on("pointerup", this.onPointerUp.bind(this))
      .on("pointerupoutside", this.onPointerUp.bind(this))
      .on("pointermove", this.onPointerMove.bind(this));
  }

  private onPointerEnter() {
    if (!this.isDragging) {
      document.body.style.cursor = "pointer";
    }
  }

  private onPointerLeave() {
    if (!this.isDragging) {
      document.body.style.cursor = "default";
    }
  }

  private onPointerDown(event: FederatedPointerEvent) {
    const localX = event.getLocalPosition(this).x;
    document.body.style.cursor = "grabbing";

    // If clicking near the handle, start dragging
    const handleBounds = this.handle.getBounds();
    const isNearHandle = Math.abs(localX - this.handle.x) < handleBounds.width;

    if (isNearHandle) {
      this.isDragging = true;
      this.dragStartX = localX;
      this.dragStartValue = this.currentValue;
    } else {
      // Direct click on track
      const value = Math.max(0, Math.min(1, localX / this.options.width));
      this.updateHandlePosition(value, true);
      this.options.onValueChangeEnd?.(value);
    }
  }

  private onPointerUp() {
    this.isDragging = false;
    document.body.style.cursor = "pointer";
    this.options.onValueChangeEnd?.(this.currentValue);
  }

  private onPointerMove(event: FederatedPointerEvent) {
    if (!this.isDragging) return;

    const localX = event.getLocalPosition(this).x;
    const deltaX = localX - this.dragStartX;
    const deltaValue = deltaX / this.options.width;
    const newValue = Math.max(0, Math.min(1, this.dragStartValue + deltaValue));

    this.updateHandlePosition(newValue, true);
  }

  private updateHandlePosition(value: number, animate: boolean = true) {
    this.currentValue = value;
    const targetX = this.options.width * value;

    if (animate) {
      gsap.to(this.handle, {
        x: targetX,
        duration: 0.1,
        ease: "power2.out",
      });
      gsap.to(this.fillMask, {
        width: targetX,
        duration: 0.1,
        ease: "power2.out",
      });
    } else {
      this.handle.x = targetX;
      this.fillMask.width = targetX;
    }

    this.options.onValueChange?.(value);
  }

  public getValue(): number {
    return this.currentValue;
  }

  public setValue(value: number, animate: boolean = true) {
    this.updateHandlePosition(Math.max(0, Math.min(1, value)), animate);
  }

  public destroy() {
    // Clean up cursor style when component is destroyed
    document.body.style.cursor = "default";
    super.destroy();
  }
}
