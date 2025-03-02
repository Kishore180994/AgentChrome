import { TaskHistory } from "../types/actionType";

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
      this.isSidebarVisible = false;
      this.isHorizontalBarVisible = false;
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

  injectSidebar(): void {
    if (document.getElementById("agent-chrome-root")) return;

    this.sidebarContainer = document.createElement("div");
    this.sidebarContainer.id = "agent-chrome-root";
    this.sidebarContainer.style.cssText = `
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
    `;
    document.body.appendChild(this.sidebarContainer);

    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    this.isSidebarVisible = true;
    this.updateStyles();
    this.syncState();
  }

  injectHorizontalBar(): void {
    if (document.getElementById("agent-chrome-bar")) return;

    this.horizontalBarContainer = document.createElement("div");
    this.horizontalBarContainer.id = "agent-chrome-bar";
    this.horizontalBarContainer.style.cssText = `
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
    `;

    this.horizontalBarContainer.innerHTML = `
      <div id="current-step" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 20px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg id="expand-icon" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; fill: #ffffff; transition: transform 0.3s ease;" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          <span id="step-text" style="color: #ffffff; font-size: 14px; font-weight: 500; text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);"></span>
          <span id="step-spinner" style="width: 16px; height: 16px; border: 3px solid rgba(255, 255, 255, 0.3); border-top: 3px solid #00ffff; border-radius: 50%; animation: spin 1s linear infinite; display: none;"></span>
        </div>
        <button id="close-btn" style="background: none; border: none; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; fill: #ffffff; transition: fill 0.3s ease;" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div id="step-history" style="display: none; max-height: 0; overflow-y: auto; padding: 10px 20px; background: rgba(20, 30, 50, 0.9); border-top: 1px solid rgba(255, 255, 255, 0.1); transition: max-height 0.3s ease;"></div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

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

    document.body.appendChild(this.horizontalBarContainer);

    this.isHorizontalBarVisible = false;
    this.updateStyles();
    this.syncState();
  }

  toggleSidebar(): void {
    if (!this.sidebarContainer) this.injectSidebar();
    this.isSidebarVisible = !this.isSidebarVisible;
    this.updateStyles();
    this.syncState();
  }

  closeSidebar(): void {
    if (!this.sidebarContainer) return;
    this.isSidebarVisible = false;
    this.updateStyles();
    this.syncState();
  }

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
    this.isBarExpanded = false;
    this.updateStyles();
    this.syncState();
  }

  updateHorizontalBar(taskHistory: TaskHistory[]): void {
    if (!this.horizontalBarContainer) return;
    if (JSON.stringify(this.executionSteps) !== JSON.stringify(taskHistory)) {
      this.executionSteps = taskHistory;
      const currentStep = taskHistory[taskHistory.length - 1];
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
        (history as HTMLElement).style.display = "block";
        (history as HTMLElement).style.maxHeight = "200px";
      } else if (history) {
        (history as HTMLElement).style.display = "none";
        (history as HTMLElement).style.maxHeight = "0";
      }

      this.syncState();
    }
  }

  private toggleBarExpansion(): void {
    if (!this.horizontalBarContainer) return;
    this.isBarExpanded = !this.isBarExpanded;
    this.updateStyles();
    this.syncState();
  }

  private updateStyles(): void {
    if (this.sidebarContainer) {
      this.sidebarContainer.style.transform = this.isSidebarVisible
        ? "translateX(0)"
        : "translateX(100%)";
    }

    if (this.horizontalBarContainer) {
      this.horizontalBarContainer.style.transform = this.isHorizontalBarVisible
        ? "translateY(0)"
        : "translateY(100%)";
      this.horizontalBarContainer.style.height = this.isBarExpanded
        ? "250px"
        : "48px";
      const history = this.horizontalBarContainer.querySelector(
        "#step-history"
      ) as HTMLElement;
      if (history) {
        history.style.display = this.isBarExpanded ? "block" : "none";
        history.style.maxHeight = this.isBarExpanded ? "200px" : "0";
      }
      const expandIcon = this.horizontalBarContainer.querySelector(
        "#expand-icon"
      ) as HTMLElement;
      if (expandIcon) {
        expandIcon.style.transform = this.isBarExpanded
          ? "rotate(180deg)"
          : "rotate(0deg)";
      }
    }
  }
}
