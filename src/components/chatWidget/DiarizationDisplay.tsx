import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Waves,
} from "lucide-react";
import { DiarizationDisplayProps } from "./types";
import { SpeakerNameEditor } from "./SpeakerNameEditor";

export const DiarizationDisplay: React.FC<
  DiarizationDisplayProps & {
    showDiarization: boolean;
    toggleDiarization: () => void;
    textColor: string;
    speakerNames: Record<string, string>;
    setSpeakerNames: (names: Record<string, string>) => void;
  }
> = ({
  diarizationResults,
  diarizationConnected,
  accentColor,
  fullScreen,
  setFullScreen,
  showDiarization,
  toggleDiarization,
  textColor,
  speakerNames,
  setSpeakerNames,
}) => {
  const diarizationContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when diarization results update
  useEffect(() => {
    if (diarizationContainerRef.current) {
      diarizationContainerRef.current.scrollTo({
        top: diarizationContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [diarizationResults]);

  return (
    <div className="d4m-w-full">
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-2">
        <h2
          className={`d4m-text-md d4m-font-bold ${textColor} d4m-flex d4m-items-center d4m-gap-1`}
        >
          <Waves className="d4m-w-4 d4m-h-4" />
          Diarization
          {diarizationConnected && (
            <span className="d4m-w-2 d4m-h-2 d4m-bg-green-500 d4m-rounded-full d4m-ml-1"></span>
          )}
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
          <button type="button" onClick={toggleDiarization}>
            {showDiarization ? (
              <ChevronUp className="d4m-w-4 d4m-h-4" />
            ) : (
              <ChevronDown className="d4m-w-4 d4m-h-4" />
            )}
          </button>
        </div>
      </div>
      {showDiarization && (
        <React.Fragment>
          {fullScreen && (
            <div
              className="d4m-fixed d4m-top-0 d4m-left-0 d4m-right-0 d4m-bg-gray-800 d4m-p-2 d4m-flex d4m-justify-between d4m-items-center d4m-border-b d4m-border-gray-700"
              style={{ zIndex: 1000 }}
            >
              <h2 className={`d4m-text-md d4m-font-bold d4m-text-white`}>
                Diarization
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
            ref={diarizationContainerRef}
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
              {diarizationResults.length === 0 && (
                <p className="d4m-text-sm d4m-text-gray-500 d4m-italic d4m-text-center">
                  {diarizationConnected
                    ? "Waiting for diarization results..."
                    : "Connecting to diarization server..."}
                </p>
              )}

              {/* Diarization Results */}
              {diarizationResults.map((segment, index) => (
                <div key={index} className="d4m-flex d4m-gap-2 d4m-items-start">
                  <SpeakerNameEditor
                    speaker={segment.speaker}
                    accentColor={accentColor}
                    speakerNames={speakerNames}
                    setSpeakerNames={setSpeakerNames}
                  />
                  <p className="d4m-text-sm d4m-text-gray-300 d4m-flex-1">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};
