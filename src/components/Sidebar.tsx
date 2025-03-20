import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      className="
        d4m-w-[400px] 
        d4m-h-screen
        d4m-from-gray-900/90
        d4m-to-black/90
        d4m-border-l
        d4m-border-cyan-500/30
        d4m-shadow-2xl
        d4m-z-[9999]
        d4m-overflow-y-auto
        d4m-transition-transform
        d4m-duration-300
        d4m-ease-in-out
        d4m-text-gray-100
        d4m-p-4
      "
    >
      <App />
    </div>
  );
};

export default Sidebar;
