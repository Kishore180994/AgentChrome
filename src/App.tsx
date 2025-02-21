import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { ContentScriptMessage } from "./types/messages";
import {
  // sendToContentScript,
  handleContentScriptMessages,
} from "./lib/messaging";

import { SettingsModal } from "./components/SettingsModal";
import { ChatWidget } from "./components/ChatWidget";
import { ExecutionSteps } from "./components/ExecutionSteps";

/** Top-level App */
const App = () => {
  // State management
  const [state, setState] = useState({
    isWatching: false,
    isSettingsOpen: false,
    error: null,
  });

  // Listen for messages from the content script
  useEffect(() => {
    const cleanup = handleContentScriptMessages(
      (message: ContentScriptMessage) => {
        console.log("Received from content script:", message.result);
        // Add specific message handling here if needed
      }
    );
    return cleanup;
  }, []);

  return (
    <div className="ext-h-screen ext-overflow-auto ext-from-gray-900 ext-via-black ext-to-gray-900 ext-text-gray-100">
      <div className="ext-max-w-5xl ext-mx-auto ext-py-10 ext-px-6 ext-space-y-8 ext-flex-col ext-h-full ext-from-gray-900/90 ext-to-black/90 ext-border-cyan-500/30 ext-shadow-2xl ext-rounded-xl">
        {/* Header and Main Content (Top 50%) */}
        <main className="ext-w-full ext-space-y-6 ext-h-1/2 ext-p-4">
          {/* Header */}
          <header className="ext-flex ext-items-center ext-justify-between">
            <h1 className="ext-text-3xl ext-font-bold ext-tracking-wide ext-text-cyan-400 ext-text-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
              Do4Me.AI
            </h1>
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, isSettingsOpen: true }))
              }
              className="ext-flex ext-items-center ext-gap-1 ext-px-3 ext-py-2 ext-rounded-lg ext-bg-cyan-700/20 ext-text-cyan-200 ext-ring-1 ext-ring-cyan-400 ext-hover:bg-cyan-600/30 ext-transition-colors ext-duration-200"
              title="API Settings"
            >
              <Settings className="ext-w-5 ext-h-5" />
              <span className="ext-text-sm ext-font-semibold">Settings</span>
            </button>
          </header>

          {/* Execution Steps */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-cyan-500/50 ext-shadow-xl ext-backdrop-blur-md ext-h-full">
            <ExecutionSteps />
          </section>

          {/* Settings Modal */}
          <SettingsModal
            isOpen={state.isSettingsOpen}
            onClose={() =>
              setState((prev) => ({ ...prev, isSettingsOpen: false }))
            }
          />
        </main>

        {/* Chat Widget (Bottom 50%) - Already styled above */}
        <ChatWidget />
      </div>
    </div>
  );
};

export default App;
