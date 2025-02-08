import React, { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";

import { SpeechError, SpeechRecognitionHandler } from "./services/speech";
import { ScreenCapture } from "./services/screen-capture";
import { ContentScriptMessage } from "./types/messages";
import {
  sendToContentScript,
  handleContentScriptMessages,
} from "./lib/messaging";

import { SettingsModal } from "./components/SettingsModal";
import { ChatWidget } from "./components/ChatWidget";
import { DOMElementsPanel } from "./components/DOMElementsPanel";
import { ControlPanel } from "./components/ControlPanel";
import { ActionRecording } from "./components/ActionRecording";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ScreenAnalysis } from "./components/ScreenAnalysis";
import { HotkeysPanel } from "./components/HotkeysPanel";

/** Top-level App */
const App = () => {
  // State management
  const [state, setState] = useState({
    isListening: false,
    isWatching: false,
    transcript: "",
    screenAnalysis: "",
    isSettingsOpen: false,
    error: null as SpeechError | null,
  });

  // Refs for singleton services
  const speechRecognition = useRef(new SpeechRecognitionHandler()).current;
  const screenCapture = useRef(new ScreenCapture()).current;

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

  // Speech recognition helpers
  const handleSpeechResult = (text: string) => {
    setState((prev) => ({ ...prev, transcript: text }));
  };

  const handleSpeechError = (error: SpeechError) => {
    setState((prev) => ({ ...prev, error }));
  };

  const toggleListening = async () => {
    if (state.isListening) {
      speechRecognition.stop();
    } else {
      try {
        await speechRecognition.start((text, error) => {
          if (error) {
            handleSpeechError(error);
          } else if (text) {
            handleSpeechResult(text);
          }
        });
      } catch (err) {
        handleSpeechError(err as SpeechError);
      }
    }
    setState((prev) => ({ ...prev, isListening: !prev.isListening }));
  };

  const toggleWatching = async () => {
    try {
      if (state.isWatching) {
        screenCapture.stop();
      } else {
        await screenCapture.start((analysis: string) => {
          setState((prev) => ({ ...prev, screenAnalysis: analysis }));
        });
      }
      setState((prev) => ({ ...prev, isWatching: !prev.isWatching }));
    } catch (error) {
      console.error("Screen capture error:", error);
      setState((prev) => ({ ...prev, isWatching: false }));
    }
  };

  return (
    // Changed from `ext-min-h-screen` to `ext-h-screen` and added `ext-overflow-auto`
    <div className="ext-h-screen ext-overflow-auto ext-bg-gradient-to-r ext-from-gray-900 ext-via-black ext-to-gray-900 ext-text-gray-100">
      <div className="ext-max-w-5xl ext-mx-auto ext-py-10 ext-px-6 ext-space-y-8">
        {/* Header */}
        <header className="ext-flex ext-items-center ext-justify-between">
          <h1 className="ext-text-3xl ext-font-bold ext-tracking-wide ext-text-cyan-300 ext-drop-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
            Do4Me
          </h1>
          <button
            onClick={() =>
              setState((prev) => ({ ...prev, isSettingsOpen: true }))
            }
            className="ext-flex ext-items-center ext-gap-1 ext-px-3 ext-py-2 ext-rounded-lg ext-bg-cyan-700/20 ext-text-cyan-200 ext-ring-1 ext-ring-cyan-400 ext-hover:bg-cyan-600/30 ext-transition-colors"
            title="API Settings"
          >
            <Settings className="ext-w-5 ext-h-5" />
            <span className="ext-text-sm ext-font-semibold">Settings</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="ext-space-y-6">
          {/* DOM Elements Panel */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
            <DOMElementsPanel sendToContentScript={sendToContentScript} />
          </section>

          {/* Control Panel */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
            <ControlPanel
              isListening={state.isListening}
              isWatching={state.isWatching}
              error={state.error}
              onToggleListening={toggleListening}
              onToggleWatching={toggleWatching}
            />
          </section>

          {/* Chat Widget */}
          <ChatWidget />

          {/* Action Recording */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
            <ActionRecording />
          </section>

          {/* Transcript Panel */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
            <TranscriptPanel transcript={state.transcript} />
          </section>

          {/* Screen Analysis */}
          {state.isWatching && (
            <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
              <ScreenAnalysis screenAnalysis={state.screenAnalysis} />
            </section>
          )}

          {/* Hotkeys Panel */}
          <section className="ext-relative ext-bg-gray-800/80 ext-p-4 ext-rounded-xl ext-ring-1 ext-ring-inset ext-ring-gray-500/50 ext-shadow-xl ext-backdrop-blur-md">
            <HotkeysPanel />
          </section>
        </main>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={state.isSettingsOpen}
          onClose={() =>
            setState((prev) => ({ ...prev, isSettingsOpen: false }))
          }
        />
      </div>
    </div>
  );
};

export default App;
