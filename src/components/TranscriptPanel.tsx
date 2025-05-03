import React, { useState, useEffect, useRef } from "react";

interface TranscriptPanelProps {
  transcript: string; // Receives the latest complete transcript segment
}

const MAX_LINES = 10; // Keep the last N lines visible

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcript,
}) => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcript && transcript.trim() !== "") {
      setLines((prevLines) => {
        const newLines = [...prevLines, transcript.trim()];
        // Keep only the last MAX_LINES
        return newLines.slice(Math.max(newLines.length - MAX_LINES, 0));
      });
    }
  }, [transcript]); // Rerun when the transcript prop changes

  useEffect(() => {
    // Scroll to bottom when lines change
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [lines]); // Rerun when lines array changes

  return (
    <div
      className="
        d4m-relative d4m-p-4 d4m-rounded-xl
        d4m-bg-gradient-to-b d4m-from-gray-700/90 d4m-via-gray-800/90 d4m-to-gray-900/90
        d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/30
        d4m-shadow-lg d4m-backdrop-blur-sm
      "
    >
      <h2 className="d4m-text-xs d4m-font-semibold d4m-text-cyan-300 d4m-mb-2 d4m-opacity-80">
        LIVE TRANSCRIPT
      </h2>
      <div
        ref={scrollContainerRef}
        className="d4m-h-32 d4m-overflow-hidden d4m-relative d4m-mask-gradient" // Fixed height and hide overflow
        style={
          {
            "--mask-gradient":
              "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            maskImage: "var(--mask-gradient)",
            WebkitMaskImage: "var(--mask-gradient)", // For Safari compatibility
          } as React.CSSProperties
        }
      >
        <div className="d4m-flex d4m-flex-col-reverse">
          {" "}
          {/* Reverse column to make new items appear at bottom */}
          {lines.length === 0 ? (
            <p className="d4m-text-sm d4m-text-gray-400 d4m-italic d4m-p-2">
              Listening...
            </p>
          ) : (
            lines.map((line, index) => {
              const isLastLine = index === lines.length - 1;
              const opacity = 1 - (lines.length - 1 - index) * 0.15; // Decrease opacity for older lines

              return (
                <p
                  key={index}
                  className={`
                    d4m-text-sm d4m-px-2 d4m-py-0.5 d4m-transition-all d4m-duration-300 ease-in-out
                    ${
                      isLastLine
                        ? "d4m-text-blue-300 d4m-font-medium"
                        : "d4m-text-gray-300"
                    }
                  `}
                  style={{ opacity: Math.max(0.1, opacity) }} // Ensure minimum opacity
                >
                  {line}
                </p>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
