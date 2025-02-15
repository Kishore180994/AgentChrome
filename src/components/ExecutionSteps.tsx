import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// Define Step Data Structure
interface Step {
  step: string;
  status: "pending" | "success" | "failed";
  retries: number;
  message?: string;
}

export const ExecutionSteps: React.FC = () => {
  const [history, setHistory] = useState<Step[]>([]);

  // Listen for Execution Updates from background.ts
  useEffect(() => {
    if (!chrome?.runtime?.onMessage) {
      console.error(
        "[ExecutionSteps] Chrome runtime API is not available. Are you running inside a Chrome extension?"
      );
      return;
    }
    const handleExecutionUpdate = (message: any) => {
      if (message.type === "EXECUTION_UPDATE") {
        console.log(
          "[ExecutionSteps] Received execution update:",
          message.history
        );
        setHistory(message.history);
      }
    };

    chrome.runtime.onMessage.addListener(handleExecutionUpdate);
    return () => {
      chrome.runtime.onMessage.removeListener(handleExecutionUpdate);
    };
  }, []);

  return (
    <div className="ext-bg-gray-900/80 ext-rounded-xl ext-p-4 ext-shadow-lg ext-ring-1 ext-ring-gray-600/50">
      <h2 className="ext-text-lg ext-font-bold ext-text-cyan-300">
        Execution Steps
      </h2>

      <div className="ext-mt-4">
        {history.length === 0 ? (
          <p className="ext-text-gray-400">No actions performed yet.</p>
        ) : (
          history.map((step, index) => (
            <div
              key={index}
              className="ext-flex ext-items-center ext-gap-2 ext-mb-2"
            >
              {step.status === "pending" && (
                <Loader2 className="ext-animate-spin ext-text-yellow-300" />
              )}
              {step.status === "success" && (
                <CheckCircle className="ext-text-green-400" />
              )}
              {step.status === "failed" && (
                <XCircle className="ext-text-red-400" />
              )}
              <span className="ext-text-sm ext-text-gray-200">
                {step.step} {step.retries > 0 ? `(Retry ${step.retries})` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
