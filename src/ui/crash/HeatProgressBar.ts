import {
  Container,
  Sprite,
  Text,
  Graphics,
  FillGradient,
  type DestroyOptions,
} from "pixi.js";
import gsap from "gsap";
import {
  CRASH_ASSETS,
  CRASH_LAYOUT,
  CRASH_COLORS,
} from "../../constants/crashLayout";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";
import type { HeatZone } from "../../types/crashGame";

const PERCENTAGE_FONT_SIZE = 22;
const FIXED_BAR_WIDTH = 220;
const FIXED_BAR_HEIGHT = 30;
const FIXED_BOOM_BOX_WIDTH = 40;
const BOOM_CRASH_FONT_SIZE = 12;

// Below ~0.87 so a thin band of shadow can show under the bright fill; user
// can tune height vs. mask clearance.
const FILL_HEIGHT_RATIO = 0.85;

// Shadow hex is shifted **down** (Pixi +y) so the bright fill stays vertically
// centered on the track (tips on y=0) while a dark band still shows along the
// bottom. Previously shifting the fill up (-FILL_Y_SHIFT) moved both tips off
// the center line.
const SHADOW_FILL_OFFSET_Y = 2;

// Reduced edge width (shallower diagonal cut) and larger radius (rounder corners)
const HEXAGON_EDGE_WIDTH = 10;
const CORNER_RADIUS = 10;

const MASK_INSET = 2;
const FILL_QUICK_TO_DURATION = 0.12;

const CRITICAL_THRESHOLD = 90;
const BOOM_CRASH_CRITICAL_COLOR = 0x533200;
const CRITICAL_PULSE_SCALE = 1.28;
const CRITICAL_PULSE_DURATION = 0.45;

// Diagonal stripe shimmer
const STRIPE_WIDTH = 9;
const STRIPE_GAP = 6;
const STRIPE_PATTERN_PERIOD = STRIPE_WIDTH + STRIPE_GAP;
const STRIPE_ALPHA = 0.22;
const STRIPE_DURATION = 1.8;
const STRIPE_PADDING = 2;

const HEAT_ZONE_GRADIENTS: Record<
  HeatZone,
  { left: number; right: number; shadow: number }
> = {
  green: { left: 0x00ff88, right: 0x00cc66, shadow: 0x004d26 },
  yellow: { left: 0xffcc00, right: 0xff8800, shadow: 0xaa3d00 },
  red: { left: 0xff6600, right: 0xff4400, shadow: 0x991d00 },
  critical: { left: 0xff4444, right: 0xff0000, shadow: 0x880000 },
} as const;

/**
 * Horizontal heat meter using a mask + translation approach for GPU-accelerated
 * updates. The fill Graphics is drawn once at 100% width and clipped by a
 * hexagon-shaped mask. Progress changes only translate fillGroup.x via
 * gsap.quickTo, avoiding per-frame Graphics re-tessellation.
 *
 * Display hierarchy inside fillContainer:
 *   fillGroup (x animated for progress)
 *     ├── shadowFill  (y=+SHADOW_FILL_OFFSET_Y, dark hex — sits slightly below center)
 *     └── fill        (y=0, bright gradient — chevron tips on mask center line)
 *           ├── stripeMask   (x=+STRIPE_PADDING, smaller hexagon — clips stripes with padding)
 *           └── stripeContainer (x=+STRIPE_PADDING, animated right-angled diagonal shimmer stripes)
 *
 * boomBoxGroup (last child — drawn above bar + percentage; x anchors to right of bar)
 *   ├── boomBox
 *   └── boomCrashText ("CRASH!")
 */
export class HeatProgressBar extends Container {
  private background: Graphics;
  private maskGraphics: Graphics;
  private fillContainer: Container;
  private fillGroup: Container;
  private shadowFill: Graphics;
  private fill: Graphics;
  private stripeContainer: Container;
  private stripeMask: Graphics;
  private stripeTween: gsap.core.Tween | null = null;
  private criticalPulseTween: gsap.core.Tween | null = null;
  private isCritical = false;
  private percentageText: Text;
  private boomBoxGroup: Container;
  private boomBox: Sprite;
  private boomCrashText: Text;

  private progress = 100;
  private currentZone: HeatZone = "green";
  private fillQuickTo: gsap.QuickToFunc;

  private readonly barWidth: number;
  private readonly barHeight: number;
  private readonly fillWidth: number;
  private readonly fillHeight: number;

  constructor() {
    super();

    this.barWidth = FIXED_BAR_WIDTH;
    this.barHeight = FIXED_BAR_HEIGHT;
    this.fillWidth = this.barWidth - MASK_INSET * 2;
    this.fillHeight = this.barHeight * FILL_HEIGHT_RATIO;

    // --- Background ---
    this.background = new Graphics();
    this.traceHexagonPath(this.background, this.barWidth, this.barHeight);
    const bgGradient = new FillGradient(
      0,
      -this.barHeight / 2,
      0,
      this.barHeight / 2,
    );
    bgGradient.addColorStop(0, 0x15092b);
    bgGradient.addColorStop(1, 0x341569);
    this.background.fill(bgGradient);
    this.addChild(this.background);

    // --- Inner mask (clips fill + shadow to the hexagon border inset) ---
    const maskWidth = this.barWidth - MASK_INSET * 2;
    const maskHeight = this.barHeight - MASK_INSET * 2;
    this.maskGraphics = new Graphics();
    this.traceHexagonPath(this.maskGraphics, maskWidth, maskHeight);
    this.maskGraphics.fill(0xffffff);
    this.maskGraphics.x = MASK_INSET;
    this.addChild(this.maskGraphics);

    // --- Fill container (applies the hexagon mask) ---
    this.fillContainer = new Container();
    this.fillContainer.mask = this.maskGraphics;
    this.fillContainer.x = MASK_INSET;
    this.addChild(this.fillContainer);

    // --- fillGroup: single object animated for progress, holds shadow + fill ---
    this.fillGroup = new Container();
    this.fillContainer.addChild(this.fillGroup);

    // Shadow fill — same hexagon, dark zone color, shifted **down** so the
    // bright fill (y=0) stays on the vertical center line while the shadow
    // peeks out along the bottom (and mask clips excess).
    this.shadowFill = new Graphics();
    this.drawShadowFill();
    this.shadowFill.y = SHADOW_FILL_OFFSET_Y;
    this.fillGroup.addChild(this.shadowFill);

    // Bright fill — y=0 so left/right chevron tips align with the mask center line.
    this.fill = new Graphics();
    this.drawFillHexagon();
    this.fill.y = 0;
    this.fillGroup.addChild(this.fill);

    // --- Stripe shimmer (child of fill — moves with fill, hexagon-masked) ---
    // stripeMask uses a smaller hexagon with padding inset so stripes don't touch
    // the fill edges. Since it is a child of fill it moves with fill.y / fillGroup.x automatically.
    this.stripeMask = new Graphics();
    const stripeMaskWidth = this.fillWidth - STRIPE_PADDING * 2;
    const stripeMaskHeight = this.fillHeight - STRIPE_PADDING * 2;
    this.traceHexagonPath(this.stripeMask, stripeMaskWidth, stripeMaskHeight);
    this.stripeMask.fill(0xffffff);
    this.stripeMask.x = STRIPE_PADDING;
    this.fill.addChild(this.stripeMask);

    this.stripeContainer = new Container();
    this.stripeContainer.alpha = STRIPE_ALPHA;
    this.stripeContainer.mask = this.stripeMask;
    this.stripeContainer.x = STRIPE_PADDING;
    this.drawStripes();
    this.fill.addChild(this.stripeContainer);
    this.startStripeAnimation();

    // --- Progress animation (targets fillGroup.x) ---
    const initialX = -this.fillWidth * (1 - this.progress / 100);
    this.fillGroup.x = initialX;

    this.fillQuickTo = gsap.quickTo(this.fillGroup, "x", {
      duration: FILL_QUICK_TO_DURATION,
      ease: "power2.out",
    });

    // --- Percentage text ---
    this.percentageText = new Text({
      text: "50%",
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: PERCENTAGE_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: CRASH_COLORS.PERCENTAGE_TEXT,
        align: "left",
      },
    });
    this.percentageText.anchor.set(0, 0.5);
    this.percentageText.x = CRASH_LAYOUT.PERCENTAGE_PADDING_LEFT;
    this.percentageText.y = 0;
    // this.addChild(this.percentageText);

    // --- Boom box + label (right of bar, above bar layers in z-order) ---
    this.boomBoxGroup = new Container();
    this.boomBoxGroup.x = this.barWidth + CRASH_LAYOUT.BOOM_BOX_OFFSET_X;
    this.boomBoxGroup.y = 0;

    this.boomBox = Sprite.from(CRASH_ASSETS.BOOM_BOX);
    this.boomBox.anchor.set(0.5);
    this.boomBox.height = FIXED_BAR_HEIGHT + 5;
    this.boomBox.width = FIXED_BOOM_BOX_WIDTH;
    this.boomBox.x = -5;
    this.boomBox.y = 2;
    this.boomBoxGroup.addChild(this.boomBox);

    this.boomCrashText = new Text({
      text: "CRASH",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: BOOM_CRASH_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: CRASH_COLORS.PERCENTAGE_TEXT,
        align: "center",
        stroke: 0xd08b00,
      },
    });
    this.boomCrashText.anchor.set(0.5);
    this.boomCrashText.x = -3;
    this.boomCrashText.y = 1;
    this.boomBoxGroup.addChild(this.boomCrashText);

    this.addChild(this.boomBoxGroup);
  }

  /** Update the heat fill (0–100). Only translates fillGroup.x — no Graphics redraw. */
  public setProgress(percent: number): void {
    this.progress = Math.max(0, Math.min(100, percent));

    // Visual fill stops advancing at CRITICAL_THRESHOLD even if progress keeps climbing
    const visualProgress = Math.min(this.progress, CRITICAL_THRESHOLD);
    const targetX = -this.fillWidth * (1 - visualProgress / 100);
    this.fillQuickTo(targetX);

    this.percentageText.text = `${Math.round(this.progress)}%`;

    if (this.progress >= CRITICAL_THRESHOLD && !this.isCritical) {
      this.enterCriticalState();
    } else if (this.progress < CRITICAL_THRESHOLD && this.isCritical) {
      this.exitCriticalState();
    }
  }

  /** Switch fill gradient color when heat zone changes. Skips redraw if zone is unchanged. */
  public setHeatZone(zone: HeatZone): void {
    if (zone === this.currentZone) return;
    this.currentZone = zone;

    this.fill.clear();
    this.drawFillHexagon();

    this.shadowFill.clear();
    this.drawShadowFill();
  }

  public getBarWidth(): number {
    return this.barWidth;
  }

  public getBarHeight(): number {
    return this.barHeight;
  }

  public destroy(options?: DestroyOptions): void {
    this.stripeTween?.kill();
    this.stripeTween = null;
    this.criticalPulseTween?.kill();
    this.criticalPulseTween = null;
    gsap.killTweensOf(this.fillGroup);
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  /**
   * Activates the critical state: turns the "CRASH!" label red and starts a
   * looping scale-pulse tween so the user knows the meter is pegged.
   */
  private enterCriticalState(): void {
    this.isCritical = true;
    this.boomCrashText.style.fill = BOOM_CRASH_CRITICAL_COLOR;

    this.criticalPulseTween?.kill();
    this.boomCrashText.scale.set(1);
    this.criticalPulseTween = gsap.to(this.boomCrashText.scale, {
      x: CRITICAL_PULSE_SCALE,
      y: CRITICAL_PULSE_SCALE,
      duration: CRITICAL_PULSE_DURATION,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Deactivates the critical state: restores the default label color and
   * smoothly snaps the scale back to 1.
   */
  private exitCriticalState(): void {
    this.isCritical = false;
    this.criticalPulseTween?.kill();
    this.criticalPulseTween = null;
    gsap.to(this.boomCrashText.scale, { x: 1, y: 1, duration: 0.2 });
    this.boomCrashText.style.fill = CRASH_COLORS.PERCENTAGE_TEXT;
  }

  /**
   * Trace the hexagon path onto a Graphics target.
   * Vertically centred around y=0 (from -halfH to +halfH).
   * Uses absolute pixel values for edge width and corner radius to ensure
   * visual consistency across all hexagons (background, mask, fill).
   * Does NOT fill — caller is responsible for calling target.fill().
   */
  private traceHexagonPath(
    target: Graphics,
    width: number,
    height: number,
  ): void {
    const edgeWidth = HEXAGON_EDGE_WIDTH;
    const halfHeight = height / 2;
    const radius = CORNER_RADIUS;

    target.moveTo(edgeWidth + radius, -halfHeight);
    target.lineTo(width - edgeWidth - radius, -halfHeight);
    target.arcTo(width - edgeWidth, -halfHeight, width, 0, radius);
    target.lineTo(width, 0);
    target.arcTo(width - edgeWidth, halfHeight, edgeWidth, halfHeight, radius);
    target.lineTo(edgeWidth + radius, halfHeight);
    target.arcTo(edgeWidth, halfHeight, 0, 0, radius);
    target.lineTo(0, 0);
    target.arcTo(
      edgeWidth,
      -halfHeight,
      edgeWidth + radius,
      -halfHeight,
      radius,
    );
    target.closePath();
  }

  /**
   * Draw the bright gradient fill hexagon.
   * Drawn once at full width; progress is revealed by translating fillGroup.x.
   */
  private drawFillHexagon(): void {
    const colors = HEAT_ZONE_GRADIENTS[this.currentZone];

    const gradient = new FillGradient(0, 0, this.fillWidth, 0);
    gradient.addColorStop(0, colors.left);
    gradient.addColorStop(1, colors.right);

    this.traceHexagonPath(this.fill, this.fillWidth, this.fillHeight);
    this.fill.fill(gradient);
  }

  /**
   * Draw the shadow hexagon (same shape as fill, darker zone color).
   * Sits behind fill inside fillGroup, offset down by SHADOW_FILL_OFFSET_Y so
   * the bright fill (y=0) stays centered while the shadow shows along the bottom.
   */
  private drawShadowFill(): void {
    const { shadow } = HEAT_ZONE_GRADIENTS[this.currentZone];
    this.traceHexagonPath(this.shadowFill, this.fillWidth, this.fillHeight);
    this.shadowFill.fill(shadow);
  }

  /**
   * Draw diagonal parallelogram stripes onto stripeContainer.
   * Right-angled stripes (mirrored) that slant from top-right to bottom-left.
   * Stripes span from -PATTERN_PERIOD to stripeWidth + slant + PATTERN_PERIOD
   * so the seamless GSAP loop snap (x: 0 → P → 0) is invisible.
   */
  private drawStripes(): void {
    this.stripeContainer.removeChildren();

    const stripes = new Graphics();
    const stripeWidth = this.fillWidth - STRIPE_PADDING * 2;
    const stripeHeight = this.fillHeight - STRIPE_PADDING * 2;
    const halfH = stripeHeight / 2;
    const slant = stripeHeight;
    const startX = -STRIPE_PATTERN_PERIOD;
    const endX = stripeWidth + slant + STRIPE_PATTERN_PERIOD;

    for (let x = startX; x < endX; x += STRIPE_PATTERN_PERIOD) {
      stripes.moveTo(x + slant, -halfH);
      stripes.lineTo(x + slant + STRIPE_WIDTH, -halfH);
      stripes.lineTo(x + STRIPE_WIDTH, halfH);
      stripes.lineTo(x, halfH);
      stripes.closePath();
    }

    stripes.fill(0xffffff);
    this.stripeContainer.addChild(stripes);
  }

  /**
   * Start a seamless infinite GSAP loop that slides stripeContainer.x from 0
   * to STRIPE_PATTERN_PERIOD. The pattern tiles exactly with that period, so
   * the snap back to 0 each cycle is invisible.
   */
  private startStripeAnimation(): void {
    this.stripeTween?.kill();
    this.stripeContainer.x = 0;

    this.stripeTween = gsap.to(this.stripeContainer, {
      x: STRIPE_PATTERN_PERIOD,
      duration: STRIPE_DURATION,
      ease: "none",
      repeat: -1,
    });
  }
}
