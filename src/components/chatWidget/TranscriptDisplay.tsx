import React, { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { TranscriptDisplayProps } from "./types";

export const TranscriptDisplay: React.FC<
  TranscriptDisplayProps & {
    showTranscript: boolean;
    toggleTranscript: () => void;
    textColor: string;
  }
> = ({
  lines,
  interimTranscript,
  fullScreen,
  setFullScreen,
  showTranscript,
  toggleTranscript,
  textColor,
}) => {
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTo({
        top: transcriptContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [lines, interimTranscript]);

  return (
    <div className="d4m-w-full">
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-2">
        <h2 className={`d4m-text-md d4m-font-bold ${textColor}`}>
          Live Transcript
        </h2>
        <div className="d4m-flex d4m-gap-2">
          <button
            type="button"
            onClick={() => setFullScreen(!fullScreen)}
            className="d4m-p-1 d4m-rounded d4m-hover:bg-gray-700"
            title={fullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {fullScreen ? (
              <Minimize2 className="d4m-w-4 d4m-h-4" />
            ) : (
              <Maximize2 className="d4m-w-4 d4m-h-4" />
            )}
          </button>
          <button type="button" onClick={toggleTranscript}>
            {showTranscript ? (
              <ChevronUp className="d4m-w-4 d4m-h-4" />
            ) : (
              <ChevronDown className="d4m-w-4 d4m-h-4" />
            )}
          </button>
        </div>
      </div>
      {showTranscript && (
        <>
          {/* Fixed control bar for full screen mode */}
          {fullScreen && (
            <div
              className="transcript-full-screen d4m-fixed d4m-top-0 d4m-left-0 d4m-right-0 d4m-bg-gray-800 d4m-p-2 d4m-flex d4m-justify-between d4m-items-center d4m-border-b d4m-border-gray-700"
              style={{ zIndex: 1000 }}
            >
              <h2 className={`d4m-text-md d4m-font-bold d4m-text-white`}>
                Live Transcript
              </h2>
              <button
                type="button"
                onClick={() => setFullScreen(false)}
                className="d4m-p-2 d4m-rounded d4m-bg-gray-700 d4m-hover:bg-gray-600"
                title="Exit Full Screen"
              >
                <Minimize2 className="d4m-w-5 d4m-h-5 d4m-text-white" />
              </button>
            </div>
          )}
          <div
            ref={transcriptContainerRef}
            className={`
              ${
                fullScreen
                  ? "d4m-fixed d4m-inset-0 d4m-z-50 d4m-pt-12 d4m-px-4 d4m-pb-4 d4m-bg-gray-900"
                  : "d4m-h-48 d4m-relative"
              }
              d4m-overflow-y-auto
              d4m-rounded-lg d4m-p-2
              d4m-bg-gradient-to-b d4m-from-gray-700/70 d4m-via-gray-800/80 d4m-to-gray-900/90
              d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/20
              d4m-scrollbar-thin d4m-scrollbar-thumb-gray-400 d4m-scrollbar-track-transparent
            `}
            style={
              {
                "--mask-gradient":
                  "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                maskImage: fullScreen ? "none" : "var(--mask-gradient)",
                WebkitMaskImage: fullScreen ? "none" : "var(--mask-gradient)",
              } as React.CSSProperties
            }
          >
            {/* Inner div for the actual content */}
            <div className="d4m-w-full d4m-space-y-1">
              {/* Placeholder */}
              {lines.length === 0 && !interimTranscript && (
                <p className="d4m-text-sm d4m-text-gray-500 d4m-italic d4m-text-center">
                  Listening...
                </p>
              )}

              {/* Finalized Lines */}
              {lines.map((line, index) => {
                const isLastFinalized = index === lines.length - 1;
                return (
                  <p
                    key={index}
                    className={`
                      d4m-text-sm d4m-text-center
                      ${
                        isLastFinalized
                          ? "d4m-text-blue-300 d4m-font-medium" // Last final line is blue and medium weight
                          : "d4m-text-gray-300" // Older lines are gray
                      }
                    `}
                  >
                    {line}
                  </p>
                );
              })}

              {/* Interim Transcript */}
              {interimTranscript && (
                <p className="d4m-text-sm d4m-text-blue-200/70 d4m-text-center">
                  {interimTranscript}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
