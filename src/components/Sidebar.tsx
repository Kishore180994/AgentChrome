import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      className="
        fixed right-0 top-0
        h-screen w-[400px]
        bg-gray-900/80
        backdrop-blur-md
        ring-1 ring-inset ring-gray-500/50
        shadow-xl
        z-[9999]
        overflow-y-auto
        transition-transform duration-300
        border-l border-gray-700/50
      "
    >
      <App />
    </div>
  );
};

export default Sidebar;
