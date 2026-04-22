// Robust HTML Loader Controller
class Loader {
  private slowNetworkWarningShown: boolean;
  private slowNetworkTimeout: NodeJS.Timeout | null;
  private elements: {
    loader: HTMLElement;
    progressFill: HTMLElement;
    status: HTMLElement;
  };

  constructor() {
    this.slowNetworkWarningShown = false;
    this.slowNetworkTimeout = null;

    this.elements = {
      loader: document.getElementById("html-loader") as HTMLElement,
      progressFill: document.getElementById("progress-fill") as HTMLElement,
      status: document.getElementById("loader-status") as HTMLElement,
    };

    this.setupEventListeners();
    this.startSlowNetworkTimer();
  }

  setupEventListeners() {
    // Listen for progress events
    window.addEventListener("loadingProgress", (event) => {
      this.updateProgress(
        (event as CustomEvent).detail.percentage,
        (event as CustomEvent).detail.message,
      );
    });

    // Listen for game loaded event
    window.addEventListener("gameLoaded", () => {
      this.completeLoading();
    });
  }

  startSlowNetworkTimer() {
    this.slowNetworkTimeout = setTimeout(() => {
      if (!this.slowNetworkWarningShown) {
        this.showSlowNetworkWarning();
      }
    }, 10000); // 10 seconds
  }

  showSlowNetworkWarning() {
    this.slowNetworkWarningShown = true;
    const currentText = this.elements.status.textContent;
    this.elements.status.innerHTML =
      currentText +
      ' <span style="color: #ff9500;">- Slow internet detected</span>';
    this.elements.status.classList.add("warning");
  }

  updateProgress(percentage: number, message: string) {
    // Reset slow network warning on each step
    this.resetSlowNetworkWarning();

    // Update progress bar
    this.elements.progressFill.style.width = percentage + "%";

    // Update status text
    if (message) {
      this.elements.status.textContent = message;
    }
  }

  resetSlowNetworkWarning() {
    // Clear existing timeout
    if (this.slowNetworkTimeout) {
      clearTimeout(this.slowNetworkTimeout);
    }

    // Reset warning state
    this.slowNetworkWarningShown = false;
    this.elements.status.classList.remove("warning");

    // Start new timeout
    this.startSlowNetworkTimer();
  }

  completeLoading() {
    // Clear slow network timer
    if (this.slowNetworkTimeout) {
      clearTimeout(this.slowNetworkTimeout);
    }

    // Set to 100%
    this.elements.progressFill.style.width = "100%";

    // Hide loader immediately
    this.elements.loader.classList.add("hidden");
    setTimeout(() => {
      this.elements.loader.remove();
    }, 800);
  }
}

// Initialize robust loader
new Loader();

// Dispatch initial progress
setTimeout(() => {
  window.dispatchEvent(
    new CustomEvent("loadingProgress", {
      detail: {
        step: "appInit",
        percentage: 5,
        message: "Initializing game...",
      },
    }),
  );
}, 100);
