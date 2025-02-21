export class SidebarManager {
  private sidebarContainer: HTMLDivElement | null = null;
  private isVisible = false;

  toggleSidebar(): void {
    if (!this.sidebarContainer) this.injectSidebar();
    this.isVisible = !this.isVisible;
    this.sidebarContainer?.classList.toggle("hidden", !this.isVisible);
    document.body.classList.toggle("sidebar-hidden", !this.isVisible);
  }

  private injectSidebar(): void {
    if (document.getElementById("agent-chrome-root")) return;

    this.sidebarContainer = document.createElement("div");
    this.sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(this.sidebarContainer);

    if (!document.getElementById("agent-chrome-style")) {
      const style = document.createElement("style");
      style.id = "agent-chrome-style";
      style.textContent = `
        body { width: calc(100% - 400px) !important; margin-right: 400px !important; transition: all 0.3s ease-in-out !important; }
        body.sidebar-hidden { width: 100% !important; margin-right: 0 !important; }
        #agent-chrome-root { position: fixed; top: 0; right: 0; width: 400px; height: 100vh; background: white; box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1); z-index: 2147483647; transition: transform 0.3s ease-in-out; }
        #agent-chrome-root.hidden { transform: translateX(100%); }
      `;
      document.head.appendChild(style);
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    this.isVisible = true;
  }
}
