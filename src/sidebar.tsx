import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Sidebar from "./components/Sidebar";
import "./index.css";

// Render directly into the side panel's root
const container = document.getElementById("agent-chrome-root");
if (!container) {
  throw new Error("Side panel container not found");
}

createRoot(container).render(
  <StrictMode>
    <Sidebar />
  </StrictMode>
);
