import { Container, Text, Graphics } from "pixi.js";
import { socketManager } from "../network/SocketManager";
import CONSTANTS from "../constants";
import gsap from "gsap";

export class NetworkIndicator extends Container {
  private static readonly PING_INTERVAL = 2000; // Ping every 2 seconds
  private static readonly PING_TIMEOUT = 2000; // 2 second timeout
  private static readonly GOOD_PING = 100; // Threshold for good connection
  private static readonly FAIR_PING = 300; // Threshold for fair connection

  private pingText: Text;
  private indicator: Graphics;
  private intervalId: number | null = null;
  private timeoutId: number | null = null;
  private lastPingTime: number = 0;

  constructor() {
    super();

    // Create the indicator circle
    this.indicator = new Graphics();
    this.drawIndicator(0x888888); // Gray by default
    this.addChild(this.indicator);

    // Create ping text
    this.pingText = new Text({
      text: "-- ms",
      style: {
        fontSize: 12,
        fill: 0xffffff,
      },
    });
    this.pingText.x = 20; // Position text to the right of the indicator
    this.pingText.y = -7; // Center vertically
    this.addChild(this.pingText);

    try {
      // This is block error in ftue case
      if (socketManager.isConnected) {
        this.startPingMeasurements();
      }
    } catch (error) {
      console.error("Error starting ping measurements", error);
    }
  }

  private drawIndicator(color: number) {
    this.indicator.clear();
    this.indicator.beginFill(color);
    this.indicator.drawCircle(8, 0, 6);
    this.indicator.endFill();
  }

  private startPingMeasurements() {
    // Clear any existing intervals
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    // Setup ping interval
    this.intervalId = setInterval(() => {
      this.sendPing();
    }, NetworkIndicator.PING_INTERVAL) as unknown as number;

    // Send initial ping
    this.sendPing();
  }

  private sendPing() {
    // Clear any existing timeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    // Record start time
    this.lastPingTime = Date.now();

    // Send ping
    socketManager.emit(CONSTANTS.ACTIONS.PING, {}, () => {
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }

      const pingTime = Date.now() - this.lastPingTime;
      this.updateDisplay(pingTime);
    });

    // Set timeout
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, NetworkIndicator.PING_TIMEOUT) as unknown as number;
  }

  private updateDisplay(pingTime: number) {
    // Update text
    this.pingText.text = `${pingTime} ms`;

    // Update indicator color based on ping time
    let color: number;
    if (pingTime <= NetworkIndicator.GOOD_PING) {
      color = 0x00ff00; // Green
    } else if (pingTime <= NetworkIndicator.FAIR_PING) {
      color = 0xffff00; // Yellow
    } else {
      color = 0xff0000; // Red
    }

    // Animate the color change
    gsap.to(this.indicator, {
      duration: 0.3,
      pixi: { tint: color },
    });
  }

  private handleTimeout() {
    this.pingText.text = "Timeout";
    this.drawIndicator(0xff0000); // Red
  }

  public destroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    super.destroy();
  }
}
