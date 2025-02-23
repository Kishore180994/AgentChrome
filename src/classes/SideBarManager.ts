export class SidebarManager {
  private sidebarContainer: HTMLDivElement | null = null;
  private horizontalBarContainer: HTMLDivElement | null = null;
  private isSidebarVisible = false;
  private isHorizontalBarVisible = false;
  private isBarExpanded = false;
  private tabId: number | null = null;

  constructor(tabId?: number) {
    if (tabId) {
      this.tabId = tabId;
      this.isSidebarVisible = false; // Start with sidebar hidden until toggled
      this.isHorizontalBarVisible = false; // Start with horizontal bar hidden
      this.loadState(tabId);
    }
  }

  private executionSteps: {
    step: string;
    status: string;
    message?: string;
  }[] = [];

  private async syncState(): Promise<void> {
    if (!this.tabId) return;
    const state = {
      isSidebarVisible: this.isSidebarVisible,
      isHorizontalBarVisible: this.isHorizontalBarVisible,
      isBarExpanded: this.isBarExpanded,
      executionSteps: this.executionSteps,
    };
    await chrome.storage.sync.set({ [`sidebarState_${this.tabId}`]: state });
  }

  private async loadState(tabId: number): Promise<void> {
    const result = await chrome.storage.sync.get([`sidebarState_${tabId}`]);
    const state = result[`sidebarState_${tabId}`] || {
      isSidebarVisible: false,
      isHorizontalBarVisible: false,
      isBarExpanded: false,
      executionSteps: [],
    };
    this.isSidebarVisible = state.isSidebarVisible;
    this.isHorizontalBarVisible = state.isHorizontalBarVisible;
    this.isBarExpanded = state.isBarExpanded;
    this.executionSteps = state.executionSteps;
    this.tabId = tabId;
    this.updateStyles();
  }

  static getInstance(tabId: number): SidebarManager {
    let instance = (window as any)[`sidebarManager_${tabId}`] as SidebarManager;
    if (!instance) {
      instance = new SidebarManager(tabId);
      (window as any)[`sidebarManager_${tabId}`] = instance;
      instance.loadState(tabId);
    }
    return instance;
  }

  // Inject Sidebar
  injectSidebar(): void {
    if (document.getElementById("agent-chrome-root")) return;

    this.sidebarContainer = document.createElement("div");
    this.sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(this.sidebarContainer);

    const style = document.createElement("style");
    style.id = "agent-chrome-sidebar-style";
    style.textContent = `
    #agent-chrome-root {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: linear-gradient(135deg, rgba(30, 40, 60, 0.9), rgba(60, 80, 120, 0.7));
      backdrop-filter: blur(10px);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: -2px 0 15px rgba(0, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      z-index: 2147483647;
      transition: transform 0.3s ease-in-out;
    }
    #agent-chrome-root.hidden { transform: translateX(100%); }
    body.sidebar-hidden { width: 100% !important; margin-right: 0 !important; }
  `;
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    this.isSidebarVisible = true;
    this.updateStyles();
    this.syncState();
  }

  // Inject Horizontal Bar with Glossy, Modern CSS
  injectHorizontalBar(): void {
    if (document.getElementById("agent-chrome-bar")) return;

    this.horizontalBarContainer = document.createElement("div");
    this.horizontalBarContainer.id = "agent-chrome-bar";
    document.body.appendChild(this.horizontalBarContainer);

    // Horizontal Bar HTML (unchanged)
    this.horizontalBarContainer.innerHTML = `
    <div id="current-step" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 20px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <!-- Chevron Up SVG Icon -->
        <svg id="expand-icon" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; fill: #ffffff;" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        <span id="step-text" style="color: #ffffff; font-size: 14px; font-weight: 500;"></span>
        <span id="step-spinner" style="width: 16px; height: 16px; border: 3px solid rgba(255, 255, 255, 0.3); border-top: 3px solid #00ffff; border-radius: 50%; animation: spin 1s linear infinite; display: none;"></span>
      </div>
      <!-- Close Button (X) -->
      <button id="close-btn" style="background: none; border: none; cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; fill: #ffffff;" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    <div id="step-history" style="display: none; max-height: 0; overflow-y: auto; padding: 10px 20px; background: rgba(20, 30, 50, 0.9); transition: max-height 0.3s ease;"></div>
  `;

    // CSS for Glossy, Modern Look (unchanged, already matches)
    const style = document.createElement("style");
    style.textContent = `
    #agent-chrome-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 48px;
      background: linear-gradient(135deg, rgba(30, 40, 60, 0.9), rgba(60, 80, 120, 0.7));
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 -4px 15px rgba(0, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      z-index: 2147483647;
      transition: height 0.3s ease-in-out;
      cursor: pointer;
    }
    #agent-chrome-bar.hidden {
      transform: translateY(100%);
    }
    #agent-chrome-bar.expanded {
      height: 250px;
    }
    #current-step {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
    }
    #step-text {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
    }
    #step-spinner {
      width: 16px;
      height: 16px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid #00ffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: none;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #expand-icon {
      transition: transform 0.3s ease;
    }
    #agent-chrome-bar.expanded #expand-icon {
      transform: rotate(180deg);
    }
    #close-btn {
      background: none;
      border: none;
      cursor: pointer;
    }
    #close-btn svg {
      transition: fill 0.3s ease;
    }
    #close-btn:hover svg {
      fill: #ff4444;
    }
    #step-history {
      display: none;
      max-height: 0;
      overflow-y: auto;
      padding: 10px 20px;
      background: rgba(20, 30, 50, 0.9);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      transition: max-height 0.3s ease;
    }
    #step-history.expanded {
      display: block;
      max-height: 200px;
    }
    #step-history div {
      padding: 5px 0;
      color: #b0b0b0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: color 0.3s ease;
    }
    #step-history div:hover {
      color: #ffffff;
    }
  `;
    document.head.appendChild(style);

    // Event Listeners (unchanged)
    this.horizontalBarContainer.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id !== "close-btn") {
        this.toggleBarExpansion();
      }
    });
    const closeBtn = this.horizontalBarContainer.querySelector("#close-btn");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleBarExpansion();
    });

    this.isHorizontalBarVisible = false;
    this.updateStyles();
    this.syncState();
  }

  // Toggle Sidebar Visibility
  toggleSidebar(): void {
    if (!this.sidebarContainer) this.injectSidebar();
    this.isSidebarVisible = !this.isSidebarVisible;
    this.updateStyles();
    this.syncState();
  }

  // Explicitly Close Sidebar
  closeSidebar(): void {
    if (!this.sidebarContainer) return;
    this.isSidebarVisible = false;
    this.updateStyles();
    this.syncState();
  }

  // Show Horizontal Bar
  showHorizontalBar(): void {
    if (!this.horizontalBarContainer) this.injectHorizontalBar();
    if (!this.isHorizontalBarVisible) {
      this.isHorizontalBarVisible = true;
      this.updateStyles();
      this.syncState();
    }
  }

  hideHorizontalBar(): void {
    if (!this.horizontalBarContainer) return;
    this.isHorizontalBarVisible = false;
    this.isBarExpanded = false; // Reset expansion state
    this.updateStyles();
    this.syncState();
  }

  updateHorizontalBar(
    taskHistory: { step: string; status: string; message?: string }[]
  ): void {
    if (!this.horizontalBarContainer) return;
    // Only update if steps have changed
    if (JSON.stringify(this.executionSteps) !== JSON.stringify(taskHistory)) {
      this.executionSteps = taskHistory;
      const currentStep = taskHistory[taskHistory.length - 1]; // Latest step
      const stepText = this.horizontalBarContainer.querySelector("#step-text");
      const spinner = this.horizontalBarContainer.querySelector(
        "#step-spinner"
      ) as HTMLElement;
      const history =
        this.horizontalBarContainer.querySelector("#step-history");

      if (stepText && spinner) {
        stepText.textContent = currentStep
          ? `${currentStep.step}${
              currentStep.message ? ` - ${currentStep.message}` : ""
            }`
          : "Processing...";
        spinner.style.display =
          currentStep && currentStep.status === "pending"
            ? "inline-block"
            : "none";
        console.log(
          "[SidebarManager] Updated stepText to:",
          stepText.textContent
        );
      }

      if (history && this.isBarExpanded) {
        history.innerHTML = taskHistory
          .map(
            (step) =>
              `<div>${step.step}: ${step.status}${
                step.message ? ` - ${step.message}` : ""
              }</div>`
          )
          .join("");
        history.classList.add("expanded");
      } else if (history) {
        history.classList.remove("expanded");
      }

      this.syncState();
    }
  }

  private toggleBarExpansion(): void {
    if (!this.horizontalBarContainer) return;
    this.isBarExpanded = !this.isBarExpanded;

    const history = this.horizontalBarContainer.querySelector("#step-history");
    if (history) {
      (history as HTMLElement).style.display = this.isBarExpanded
        ? "block"
        : "none";
      (history as HTMLElement).style.maxHeight = this.isBarExpanded
        ? "200px"
        : "0";
      this.updateHorizontalBar(this.executionSteps); // Refresh with current steps
    }

    this.updateStyles();
    this.syncState();
  }

  // Apply Styles Based on Visibility and Expansion
  private updateStyles(): void {
    if (this.sidebarContainer) {
      this.sidebarContainer.classList.toggle("hidden", !this.isSidebarVisible);
      document.body.classList.toggle("sidebar-hidden", !this.isSidebarVisible);
    }

    if (this.horizontalBarContainer) {
      this.horizontalBarContainer.classList.toggle(
        "hidden",
        !this.isHorizontalBarVisible
      );
      this.horizontalBarContainer.classList.toggle(
        "expanded",
        this.isBarExpanded
      );
    }
    this.syncState();
  }
}
