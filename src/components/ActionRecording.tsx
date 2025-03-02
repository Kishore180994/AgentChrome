import React from "react";
import { StagehandControls } from "./StagehandControls";

export const ActionRecording: React.FC = () => {
  return (
    <div
      className="
        d4m-relative d4m-bg-gray-800/80 d4m-p-6 d4m-rounded-xl
        d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/50
        d4m-shadow-xl d4m-backdrop-blur-md
      "
    >
      <h2 className="d4m-text-sm d4m-font-semibold d4m-text-cyan-200 d4m-mb-3">
        Action Recording
      </h2>
      <StagehandControls />
    </div>
  );
};
