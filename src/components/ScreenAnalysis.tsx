import React from "react";

interface ScreenAnalysisProps {
  screenAnalysis: string;
}

export const ScreenAnalysis: React.FC<ScreenAnalysisProps> = ({
  screenAnalysis,
}) => {
  return (
    <div
      className="
        d4m-relative d4m-bg-gray-800/80 d4m-p-6 d4m-rounded-xl
        d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/50
        d4m-shadow-xl d4m-backdrop-blur-md
      "
    >
      <h2 className="d4m-text-sm d4m-font-semibold d4m-text-cyan-200 d4m-mb-3">
        Screen Analysis
      </h2>
      <div className="d4m-space-y-4 d4m-whitespace-pre-wrap">
        {screenAnalysis ? (
          <p className="d4m-text-gray-200">{screenAnalysis}</p>
        ) : (
          <p className="d4m-text-gray-500 italic">
            Analyzing screen content...
          </p>
        )}
      </div>
    </div>
  );
};
