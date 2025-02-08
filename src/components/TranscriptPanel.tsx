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
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200 ext-mb-3">
        Transcript
      </h2>
      <div className="ext-space-y-3 ext-whitespace-pre-wrap">
        {transcript ? (
          <p className="ext-text-sm ext-text-gray-200 ext-leading-relaxed">
            {transcript}
          </p>
        ) : (
          <p className="ext-text-sm ext-text-gray-400 ext-italic">
            Start listening to see the transcript...
          </p>
        )}
      </div>
    </div>
  );
};
