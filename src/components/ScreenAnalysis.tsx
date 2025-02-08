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
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200 ext-mb-3">
        Screen Analysis
      </h2>
      <div className="ext-space-y-4 ext-whitespace-pre-wrap">
        {screenAnalysis ? (
          <p className="ext-text-gray-200">{screenAnalysis}</p>
        ) : (
          <p className="ext-text-gray-500 italic">
            Analyzing screen content...
          </p>
        )}
      </div>
    </div>
  );
};
