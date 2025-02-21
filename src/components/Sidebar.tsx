import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      className="
        w-[400px]
        h-screen
        bg-gradient-to-t
        from-gray-900/90
        to-black/90
        backdrop-blur-xl
        border-l
        border-cyan-500/30
        shadow-2xl
        z-[9999]
        overflow-y-auto
        transition-transform
        duration-300
        ease-in-out
        text-gray-100
        p-4
      "
    >
      <App />
    </div>
  );
};

export default Sidebar;
