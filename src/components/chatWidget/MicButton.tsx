import React from "react";
import { Mic } from "lucide-react";
import { MicButtonProps } from "./types";

export const MicButton: React.FC<MicButtonProps> = ({
  accentColor,
  audioLevel,
  onStop,
}) => {
  // Calculate dynamic styles based on audioLevel
  const baseScale = 1;
  const maxScaleAddition = 0.4; // Max scale increase (e.g., 1.0 + 0.4 = 1.4)
  const baseOpacity = 0.3;
  const maxOpacityAddition = 0.4; // Max opacity increase (e.g., 0.3 + 0.4 = 0.7)

  const rippleStyle1 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition * 0.6})`, // Less sensitive ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition * 0.6,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out", // Smooth transitions
  };

  const rippleStyle2 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition * 0.8})`, // Medium ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition * 0.8,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
  };

  const rippleStyle3 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition})`, // Most sensitive ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
  };

  return (
    <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-2">
      <div className="d4m-text-sm d4m-text-center d4m-text-gray-400 d4m-mb-2">
        Using both microphone for transcription and tab audio for diarization
      </div>
      <div className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-h-40">
        <button
          type="button"
          onClick={onStop}
          className={`d4m-relative d4m-w-20 d4m-h-20 d4m-rounded-full d4m-bg-${accentColor}-500 d4m-text-white d4m-flex d4m-items-center d4m-justify-center d4m-shadow-lg d4m-transition-all d4m-duration-300 d4m-transform hover:d4m-scale-105 d4m-cursor-pointer focus:d4m-outline-none`}
        >
          {/* Ripple/Glow Animations */}
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-400`}
            style={rippleStyle1}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-300`}
            style={rippleStyle2}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-200`}
            style={rippleStyle3}
          ></span>
          {/* Keep the glow separate */}
          <div
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-border-4 d4m-border-${accentColor}-300 d4m-opacity-70 d4m-animate-mic-glow`}
          ></div>
          <Mic className="d4m-w-8 d4m-h-8 d4m-relative d4m-z-10 d4m-animate-mic-bounce" />
        </button>
      </div>
    </div>
  );
};
