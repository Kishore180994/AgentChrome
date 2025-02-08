import React, { useState } from "react";
import { Play, Square, Trash2 } from "lucide-react";

interface Action {
  type: string;
  data: any;
  timestamp: number;
}

export function StagehandControls() {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startRecording = () => {
    console.log("Starting action recording...");
    try {
      setError(null);

      // Listen for interactive events
      document.addEventListener("click", handleAction);
      document.addEventListener("input", handleAction);
      document.addEventListener("keydown", handleAction);

      setIsRecording(true);
      console.log("Action recording started");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error starting recording";
      console.error("Error starting recording:", err);
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    console.log("Stopping action recording...");
    try {
      // Remove listeners
      document.removeEventListener("click", handleAction);
      document.removeEventListener("input", handleAction);
      document.removeEventListener("keydown", handleAction);

      setIsRecording(false);
      console.log("Action recording stopped");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error stopping recording";
      console.error("Error stopping recording:", err);
      setError(errorMessage);
    }
  };

  const clearActions = () => {
    console.log("Clearing recorded actions...");
    setActions([]);
    setError(null);
  };

  const handleAction = (event: Event) => {
    try {
      const target = event.target as HTMLElement;
      if (!target) return;

      // Only record actions on interactive elements
      if (!isInteractiveElement(target)) return;

      const action: Action = {
        type: event.type,
        data: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          value: (target as HTMLInputElement).value,
          textContent: target.textContent?.trim(),
        },
        timestamp: Date.now(),
      };

      console.log("Action recorded:", action);
      setActions((prev) => [...prev, action]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error recording action";
      console.error("Error recording action:", err);
      setError(errorMessage);
    }
  };

  const isInteractiveElement = (element: HTMLElement): boolean => {
    const interactiveTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    return (
      interactiveTags.includes(element.tagName) ||
      element.hasAttribute("role") ||
      element.hasAttribute("tabindex")
    );
  };

  return (
    <div className="ext-space-y-4 ext-text-sm ext-text-gray-200">
      {/* Recording Controls */}
      <div className="ext-flex ext-items-center ext-space-x-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`ext-flex ext-items-center ext-space-x-2 ext-px-4 ext-py-2 ext-rounded-lg ext-transition-colors ext-ring-1 ${
            isRecording
              ? "ext-bg-red-700 ext-text-red-100 ext-ring-red-500/50 ext-hover:bg-red-600"
              : "ext-bg-green-700 ext-text-green-100 ext-ring-green-500/50 ext-hover:bg-green-600"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="ext-w-4 ext-h-4" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Play className="ext-w-4 ext-h-4" />
              <span>Start Recording</span>
            </>
          )}
        </button>

        {/* Clear Actions */}
        <button
          onClick={clearActions}
          disabled={actions.length === 0}
          className="
            ext-flex ext-items-center ext-space-x-2
            ext-px-4 ext-py-2 ext-rounded-lg 
            ext-ring-1 ext-ring-gray-500/50
            ext-bg-gray-700 ext-text-gray-200
            ext-hover:bg-gray-600
            ext-disabled:opacity-50 ext-disabled:cursor-not-allowed
            ext-transition-colors
          "
        >
          <Trash2 className="ext-w-4 ext-h-4" />
          <span>Clear</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="
            ext-p-4 ext-rounded-lg
            ext-bg-red-800/40 ext-text-red-200
            ext-ring-1 ext-ring-red-500/50
          "
        >
          {error}
        </div>
      )}

      {/* Recorded Actions */}
      {actions.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 text-cyan-200">Recorded Actions:</h3>
          <pre
            className="
              ext-bg-gray-900 ext-p-4 ext-rounded-lg
              ext-overflow-auto ext-max-h-[200px] ext-text-xs
              ext-ring-1 ext-ring-gray-500/50
            "
          >
            {JSON.stringify(actions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
