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
      // Clear any previous errors
      setError(null);

      // Start listening for actions
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
      // Remove event listeners
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
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            isRecording
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-green-100 text-green-600 hover:bg-green-200"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Start Recording</span>
            </>
          )}
        </button>

        <button
          onClick={clearActions}
          disabled={actions.length === 0}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {actions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recorded Actions:
          </h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[200px] text-sm">
            {JSON.stringify(actions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
