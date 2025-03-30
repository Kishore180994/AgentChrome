import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Sidebar from "./components/Sidebar";
import "./sidebar.css";

// Render directly into the side panel's root
const container = document.getElementById("agent-chrome-root");
if (!container) {
  throw new Error("Side panel container not found");
}

// 🌟 Create shadow root
const shadowRoot = container.attachShadow({ mode: "open" });

// 🌟 Create a div inside shadow root
const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

// 🌟 Inject styles manually
const styleLink = document.createElement("link");
styleLink.setAttribute("rel", "stylesheet");
styleLink.setAttribute("href", chrome.runtime.getURL("sidebar.css"));
shadowRoot.appendChild(styleLink);

// 🌟 Mount React app
createRoot(mountPoint).render(
  <StrictMode>
    <Sidebar />
  </StrictMode>
);
