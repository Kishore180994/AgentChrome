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
    <div className="d4m-space-y-4 d4m-text-sm d4m-text-gray-200">
      {/* Recording Controls */}
      <div className="d4m-flex d4m-items-center d4m-space-x-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`d4m-flex d4m-items-center d4m-space-x-2 d4m-px-4 d4m-py-2 d4m-rounded-lg d4m-transition-colors d4m-ring-1 ${
            isRecording
              ? "d4m-bg-red-700 d4m-text-red-100 d4m-ring-red-500/50 d4m-hover:bg-red-600"
              : "d4m-bg-green-700 d4m-text-green-100 d4m-ring-green-500/50 d4m-hover:bg-green-600"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="d4m-w-4 d4m-h-4" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Play className="d4m-w-4 d4m-h-4" />
              <span>Start Recording</span>
            </>
          )}
        </button>

        {/* Clear Actions */}
        <button
          onClick={clearActions}
          disabled={actions.length === 0}
          className="
            d4m-flex d4m-items-center d4m-space-x-2
            d4m-px-4 d4m-py-2 d4m-rounded-lg
            d4m-ring-1 d4m-ring-gray-500/50
            d4m-bg-gray-700 d4m-text-gray-200
            d4m-hover:bg-gray-600
            d4m-disabled:opacity-50 d4m-disabled:cursor-not-allowed
            d4m-transition-colors
          "
        >
          <Trash2 className="d4m-w-4 d4m-h-4" />
          <span>Clear</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="
            d4m-p-4 d4m-rounded-lg
            d4m-bg-red-800/40 d4m-text-red-200
            d4m-ring-1 d4m-ring-red-500/50
          "
        >
          {error}
        </div>
      )}

      {/* Recorded Actions */}
      {actions.length > 0 && (
        <div>
          <h3 className="d4m-font-medium d4m-mb-2 d4m-text-cyan-200">
            Recorded Actions:
          </h3>
          <pre
            className="
              d4m-bg-gray-900 d4m-p-4 d4m-rounded-lg
              d4m-overflow-auto d4m-max-h-[200px] d4m-text-xs
              d4m-ring-1 d4m-ring-gray-500/50
            "
          >
            {JSON.stringify(actions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
