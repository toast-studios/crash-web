// Debug Utility - Standalone Script
// Just include this script to enable debug overlay functionality
// Remove the script tag to disable completely

class DebugUtils {
  static enabled = true;
  static maxLogs = 100;
  static logs = [];
  static originalConsole = {};
  static initialized = false;

  static init() {
    if (!this.enabled || this.initialized) return;
    this.initialized = true;

    // Create debug overlay elements if they don't exist
    this.createDebugElements();

    // Override console methods to capture logs
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.addLog("info", args.join(" "));
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.addLog("warn", args.join(" "));
    };

    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.addLog("error", args.join(" "));
    };

    this.log("🐛 Debug system initialized");
    this.logDeviceInfo();
  }

  static createDebugElements() {
    // Check if elements already exist
    if (document.getElementById("debug-overlay")) return;

    // Create debug styles
    const style = document.createElement("style");
    style.textContent = `
        .debug-overlay {
          position: fixed;
          top: 10px;
          left: 10px;
          width: 350px;
          max-height: 400px;
          background: rgba(0, 0, 0, 0.9);
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.3;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #333;
          overflow-y: auto;
          z-index: 9999;
          display: none;
        }

        .debug-overlay.active {
          display: block;
        }

        .debug-overlay .debug-header {
          color: #ffff00;
          font-weight: bold;
          margin-bottom: 8px;
          padding-bottom: 5px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .debug-overlay .debug-close {
          background: #ff4444;
          color: white;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
        }

        .debug-overlay .debug-clear {
          background: #4444ff;
          color: white;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
          margin-right: 5px;
        }

        .debug-overlay .debug-log {
          margin: 2px 0;
          padding: 2px 0;
        }

        .debug-overlay .debug-log.info {
          color: #00ff00;
        }

        .debug-overlay .debug-log.warn {
          color: #ffaa00;
        }

        .debug-overlay .debug-log.error {
          color: #ff4444;
        }

        .debug-overlay .debug-log .timestamp {
          color: #888;
          font-size: 9px;
        }

        .debug-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: 1px solid #333;
          padding: 8px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          z-index: 9998;
          user-select: none;
        }

        .debug-toggle:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        @media (max-width: 768px) {
          .debug-overlay {
            width: calc(100vw - 20px);
            max-width: 350px;
            font-size: 10px;
          }

          .debug-toggle {
            bottom: 10px;
            right: 10px;
            padding: 6px 10px;
            font-size: 11px;
          }
        }
      `;
    document.head.appendChild(style);

    // Create debug overlay
    const overlay = document.createElement("div");
    overlay.id = "debug-overlay";
    overlay.className = "debug-overlay";
    overlay.innerHTML = `
        <div class="debug-header">
          <span>🐛 Debug Console</span>
          <div>
            <button class="debug-clear" onclick="window.DebugUtils.clear()">Clear</button>
            <button class="debug-close" onclick="window.DebugUtils.hide()">×</button>
          </div>
        </div>
        <div id="debug-content"></div>
      `;
    document.body.appendChild(overlay);

    // Create debug toggle button
    const toggle = document.createElement("div");
    toggle.id = "debug-toggle";
    toggle.className = "debug-toggle";
    toggle.textContent = "🐛 Debug";
    toggle.onclick = () => this.toggle();
    document.body.appendChild(toggle);
  }

  static addLog(type, message) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { type, message, timestamp };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.updateDisplay();
  }

  static updateDisplay() {
    if (!this.enabled) return;

    const content = document.getElementById("debug-content");
    if (!content) return;

    content.innerHTML = this.logs
      .map(
        (log) =>
          `<div class="debug-log ${log.type}">
          <span class="timestamp">[${log.timestamp}]</span> ${log.message}
        </div>`,
      )
      .join("");

    content.scrollTop = content.scrollHeight;
  }

  static show() {
    if (!this.enabled) return;
    const overlay = document.getElementById("debug-overlay");
    if (overlay) overlay.classList.add("active");
  }

  static hide() {
    if (!this.enabled) return;
    const overlay = document.getElementById("debug-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  static toggle() {
    if (!this.enabled) return;
    const overlay = document.getElementById("debug-overlay");
    if (overlay) overlay.classList.toggle("active");
  }

  static clear() {
    if (!this.enabled) return;
    this.logs = [];
    this.updateDisplay();
  }

  static log(message) {
    this.addLog("info", message);
  }

  static warn(message) {
    this.addLog("warn", message);
  }

  static error(message) {
    this.addLog("error", message);
  }

  // Utility methods
  static logCanvasInfo(width, height, windowWidth, windowHeight, gameRatio) {
    if (!this.enabled) return;
    this.log(`📱 Window: ${windowWidth}×${windowHeight}`);
    this.log(`🎮 Canvas: ${width}×${height}`);
    this.log(
      `📐 Ratio: ${(width / height).toFixed(3)} (target: ${gameRatio.toFixed(3)})`,
    );
  }

  static logDeviceInfo() {
    if (!this.enabled) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.log(`📱 Device: ${isMobile ? "Mobile" : "Desktop"}`);
    this.log(`🌐 UserAgent: ${navigator.userAgent.substring(0, 50)}...`);
    this.log(`🖥️ Screen: ${screen.width}×${screen.height}`);
    this.log(`📄 Window: ${window.innerWidth}×${window.innerHeight}`);
  }
}

// Make globally accessible
window.DebugUtils = DebugUtils;
