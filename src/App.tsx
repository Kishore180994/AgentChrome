import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Eye, Settings, AlertCircle } from "lucide-react";
import { SpeechError, SpeechRecognitionHandler } from "./services/speech";
import { ScreenCapture } from "./services/screen-capture";
import { SettingsModal } from "./components/SettingsModal";
import { ChatWidget } from "./components/ChatWidget";
import { StagehandControls } from "./components/StagehandControls";
import { ContentScriptMessage } from "./types/messages";

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [screenAnalysis, setScreenAnalysis] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const extensionId = chrome.runtime.id;

  // --- SINGLETON INSTANCES ---
  // 1) SpeechRecognitionHandler
  const speechRef = useRef<SpeechRecognitionHandler | null>(null);
  if (!speechRef.current) {
    // Create it once
    speechRef.current = new SpeechRecognitionHandler();
  }
  const speechRecognition = speechRef.current;

  // 2) ScreenCapture
  const screenRef = useRef<ScreenCapture | null>(null);
  if (!screenRef.current) {
    screenRef.current = new ScreenCapture();
  }
  const screenCapture = screenRef.current;

  // Toggle listening
  const toggleListening = async () => {
    if (isListening) {
      // Stop speech recognition
      speechRecognition.stop();
      setIsListening(false);
    } else {
      try {
        await speechRecognition.start((text, err) => {
          if (err) {
            setError(err);
          } else if (text) {
            // The handler is building a combined transcript for us
            setTranscript(text);
          }
        });
        setIsListening(true);
      } catch (err: any) {
        console.error("Error starting speech recognition:", err);
        setError({
          type: "START_ERROR",
          message: err.message || "Failed to start speech recognition.",
          timestamp: Date.now(),
          details: err.stack,
        });
        setIsListening(false);
      }
    }
  };

  // Toggle screen capture
  const toggleWatching = async () => {
    try {
      if (!isWatching) {
        await screenCapture.start((text) => {
          setScreenAnalysis(text);
        });
      } else {
        screenCapture.stop();
      }
    } catch (err) {
      console.error("Error toggling screen capture:", err);
      setIsWatching(false);
      return;
    }
    setIsWatching(!isWatching);
  };

  // Add message listener at component mount
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ContentScriptMessage>) => {
      if (event.data.type === "FROM_CONTENT_SCRIPT") {
        // Type-safe access to properties
        console.log("Received response:", event.data.result);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">AI Assistant</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="API Settings"
          >
            <Settings className="w-6 h-6 text-gray-600" />
          </button>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {/* DOM Elements Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              DOM Elements
            </h2>
            <div className="flex items-center gap-4">
              {/* Show Button */}
              <button
                onClick={() => {
                  window.postMessage(
                    {
                      type: "FROM_REACT_APP",
                      action: "SHOW_PAGE_ELEMENTS",
                    },
                    "*"
                  );
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Show Elements
              </button>

              {/* Hide Button */}
              <button
                onClick={() => {
                  console.log({ extensionId });
                  // Tell the content script to remove highlights
                  chrome.runtime.sendMessage(extensionId, {
                    type: "HIDE_PAGE_ELEMENTS",
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Hide Elements
              </button>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Control Panel
            </h2>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  isListening
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
                <span>
                  {isListening ? "Stop Listening" : "Start Listening"}
                </span>
              </button>

              <button
                onClick={toggleWatching}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  isWatching
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>{isWatching ? "Stop Watching" : "Start Watching"}</span>
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">
                      {error.message}
                    </h3>
                    {error.details && (
                      <p className="mt-2 text-sm text-red-600">
                        {error.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Widget */}
          <div
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 resize-y overflow-auto"
            style={{ height: "300px" }}
          >
            <ChatWidget />
          </div>

          {/* Stagehand Recording Controls */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Action Recording
            </h2>
            <StagehandControls />
          </div>

          {/* Transcript Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Transcript
            </h2>
            <div className="space-y-3 whitespace-pre-wrap">
              {transcript ? (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {transcript}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Start listening to see the transcript...
                </p>
              )}
            </div>
          </div>

          {/* Screen Analysis Panel */}
          {isWatching && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Screen Analysis
              </h2>
              <div className="space-y-4 whitespace-pre-wrap">
                {screenAnalysis ? (
                  <p className="text-gray-600">{screenAnalysis}</p>
                ) : (
                  <p className="text-gray-400 italic">
                    Analyzing screen content...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hotkeys Panel */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Hotkeys
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <kbd className="px-3 py-1 bg-gray-100 rounded text-sm">
                  ⌘ + Shift + L
                </kbd>
                <span className="text-gray-600">Toggle Listening</span>
              </div>

              <div className="flex items-center space-x-2">
                <kbd className="px-3 py-1 bg-gray-100 rounded text-sm">
                  ⌘ + Shift + W
                </kbd>
                <span className="text-gray-600">Toggle Watching</span>
              </div>

              <div className="flex items-center space-x-2">
                <kbd className="px-3 py-1 bg-gray-100 rounded text-sm">
                  ⌘ + Click
                </kbd>
                <span className="text-gray-600">Perform Action</span>
              </div>

              <div className="flex items-center space-x-2">
                <kbd className="px-3 py-1 bg-gray-100 rounded text-sm">
                  ⌘ + Right Click
                </kbd>
                <span className="text-gray-600">Context Menu</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
