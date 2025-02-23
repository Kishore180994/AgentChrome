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
    expandedSection: "execution",
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
      <div className="ext-max-w-5xl ext-mx-auto ext-space-y-8 ext-flex-col ext-h-full ext-from-gray-900/90 ext-to-black/90 ext-border-cyan-500/30 ext-shadow-2xl ext-rounded-xl">
        {/* Chat Widget */}
        <div className="ext-flex-1 ext-h-full">
          <ChatWidget />
        </div>
      </div>
    </div>
  );
};

export default App;
