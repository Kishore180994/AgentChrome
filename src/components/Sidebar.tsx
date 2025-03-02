import React from "react";
import App from "../App";

const Sidebar: React.FC = () => {
  return (
    <div
      id="agent-chrome-sidebar"
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(to top, rgba(17, 24, 39, 0.9), rgba(0, 0, 0, 0.9))",
        backdropFilter: "blur(12px)",
        borderLeft: "1px solid rgba(6, 182, 212, 0.3)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflowY: "auto",
        color: "#f3f4f6",
        padding: "16px",
      }}
    >
      <App />
    </div>
  );
};

export default Sidebar;
