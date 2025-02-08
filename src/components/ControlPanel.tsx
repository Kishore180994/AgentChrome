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
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
        ext-space-y-4
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200">
        Control Panel
      </h2>

      <div className="ext-flex ext-items-center ext-justify-between ext-gap-4">
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
        <div className="ext-mt-4 ext-p-4 ext-bg-red-800/40 ext-border ext-border-red-700 ext-rounded-md ext-shadow-sm">
          <div className="ext-flex ext-items-start ext-gap-3">
            <AlertCircle className="ext-w-6 ext-h-6 ext-text-red-300 ext-flex-shrink-0" />
            <div>
              <h3 className="ext-text-sm ext-font-semibold ext-text-red-200">
                {error.message}
              </h3>
              {error.details && (
                <p className="ext-mt-2 ext-text-sm ext-text-red-100">
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
