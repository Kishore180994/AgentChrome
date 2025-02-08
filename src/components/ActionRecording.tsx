import React from "react";
import { StagehandControls } from "./StagehandControls";

export const ActionRecording: React.FC = () => {
  return (
    <div
      className="
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200 ext-mb-3">
        Action Recording
      </h2>
      <StagehandControls />
    </div>
  );
};
