import React from "react";
import { Mic, MicOff, Eye, AlertCircle } from "lucide-react";

import { SpeechError } from "../services/speech";
import { ControlButton } from "./ControlButton";

interface ControlPanelProps {
  isListening: boolean;
  isWatching: boolean;
  error: SpeechError | null;
  onToggleListening: () => void;
  onToggleWatching: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isListening,
  isWatching,
  error,
  onToggleListening,
  onToggleWatching,
}) => {
  return (
    <div
      className="
        d4m-relative d4m-bg-gray-800/80 d4m-p-6 d4m-rounded-xl
        d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/50
        d4m-shadow-xl d4m-backdrop-blur-md
        d4m-space-y-4
      "
    >
      <h2 className="d4m-td4m-sm d4m-font-semibold d4m-td4m-cyan-200">
        Control Panel
      </h2>

      <div className="d4m-flex d4m-items-center d4m-justify-between d4m-gap-4">
        <ControlButton
          onClick={onToggleListening}
          icon={isListening ? MicOff : Mic}
          text={isListening ? "Stop Listening" : "Start Listening"}
          active={isListening}
          variant={isListening ? "danger" : "default"}
        />

        <ControlButton
          onClick={onToggleWatching}
          icon={Eye}
          text={isWatching ? "Stop Watching" : "Start Watching"}
          active={isWatching}
          variant={isWatching ? "primary" : "default"}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="d4m-mt-4 d4m-p-4 d4m-bg-red-800/40 d4m-border d4m-border-red-700 d4m-rounded-md d4m-shadow-sm">
          <div className="d4m-flex d4m-items-start d4m-gap-3">
            <AlertCircle className="d4m-w-6 d4m-h-6 d4m-td4m-red-300 d4m-flex-shrink-0" />
            <div>
              <h3 className="d4m-td4m-sm d4m-font-semibold d4m-td4m-red-200">
                {error.message}
              </h3>
              {error.details && (
                <p className="d4m-mt-2 d4m-td4m-sm d4m-td4m-red-100">
                  {error.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
