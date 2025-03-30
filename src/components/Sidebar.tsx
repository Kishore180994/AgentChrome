import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      className="d4m-wrapper
      d4m-bg-gray-900
        d4m-to-black/90
        d4m-transition-transform
        d4m-duration-300
        d4m-ease-in-out
        d4m-text-gray-100
      "
    >
      <App />
    </div>
  );
};

export default Sidebar;
