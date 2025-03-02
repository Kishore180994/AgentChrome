import React from "react";

interface TranscriptPanelProps {
  transcript: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcript,
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
        Transcript
      </h2>
      <div className="d4m-space-y-3 d4m-whitespace-pre-wrap">
        {transcript ? (
          <p className="d4m-text-sm d4m-text-gray-200 d4m-leading-relaxed">
            {transcript}
          </p>
        ) : (
          <p className="d4m-text-sm d4m-text-gray-400 d4m-italic">
            Start listening to see the transcript...
          </p>
        )}
      </div>
    </div>
  );
};
