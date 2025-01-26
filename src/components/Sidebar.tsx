import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      className="fixed right-0 top-0 h-screen w-[400px] bg-white shadow-lg z-[9999] overflow-y-auto transition-transform duration-300"
      style={{
        borderLeft: "1px solid #e5e7eb",
      }}
    >
      <App />
    </div>
  );
};

export default Sidebar;
