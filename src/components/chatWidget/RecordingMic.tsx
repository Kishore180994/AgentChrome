// src/components/RecordingMic.tsx

import React, { useEffect, useState, useRef } from "react";
// Import both the hook and the default export SpeechRecognition
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { AudioVisualizer } from "./AudioVisualizer";
import {
  DiarizationRequest,
  DiarizationSegment,
} from "../../services/ai/interfaces";

interface RecordingMicProps {
  accentColor: string;
  textColor: string;
  // onStop prop might still be useful for parent component cleanup/state update
  onStop?: () => void; // Changed signature as final transcript comes from backend now
}

export const RecordingMic: React.FC<RecordingMicProps> = ({
  accentColor,
  textColor,
  onStop,
}) => {
  // --- State for UI and Display ---
  // isRecording state mirrors the background script's status (truly recording)
  const [isRecording, setIsRecording] = useState(false);
  // New state to track detailed initialization status messages
  const [initializationStatus, setInitializationStatus] = useState<
    string | null
  >(null); // null, or message like "Getting streams...", "Connecting..."

  const [selectedTranscriptType, setSelectedTranscriptType] = useState<
    "live" | "diarization"
  >("live"); // 'live' will be microphone-only from useSpeechRecognition

  // Meeting information
  const defaultMeetingName = `Meeting - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  const [meetingName, setMeetingName] = useState(defaultMeetingName);
  const [isEditingName, setIsEditingName] = useState(false);

  // Diarization results received from the background script
  const [diarizationResults, setDiarizationResults] = useState<
    DiarizationSegment[]
  >([]);
  const [diarizationConnected, setDiarizationConnected] = useState(false); // Status from backend via background
  const [speakerNames, setSpeakerNames] = useState<{
    [key: string]: string;
  }>({}); // Speaker names state

  // Audio visualization (levels ideally come from background script)
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [equalizerBars, setEqualizerBars] = useState<number[]>(
    Array(30).fill(0)
  );

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const diarizationTranscriptRef = useRef<HTMLDivElement>(null); // Ref to scroll diarization view

  // --- Microphone-only Live Transcription (using react-speech-recognition) ---
  const {
    transcript: micTranscript, // The latest result (often includes interim)
    interimTranscript: micInterimTranscript, // Only the current interim part
    finalTranscript: micFinalTranscript, // Only the accumulated final parts
    listening: micListening, // Renamed to avoid conflict
    resetTranscript: resetMicTranscript,
    browserSupportsContinuousListening, // Also returned by the hook
    isMicrophoneAvailable, // Also returned by the hook
  } = useSpeechRecognition();

  // Check if the browser supports the API for the mic transcript display
  const browserSupportsLiveMic =
    SpeechRecognition.browserSupportsSpeechRecognition();
  const micTranscriptionEnabled = browserSupportsLiveMic; // Use this consistently

  // --- Effects ---

  // Effect to update audio visualizer bars based on level received from background
  // Runs when isRecording or currentAudioLevel changes
  useEffect(() => {
    // Reset bars when not recording or during initialization delay (isRecording is false but status is set)
    if (!isRecording && initializationStatus === null) {
      setEqualizerBars(Array(equalizerBars.length).fill(0));
      return;
    }

    const interval = setInterval(() => {
      const centerIndex = Math.floor(equalizerBars.length / 2);
      const newBars = Array(equalizerBars.length)
        .fill(0)
        .map((_, index) => {
          const distanceFromCenter = Math.abs(index - centerIndex);
          // Use the currentAudioLevel received from background
          const baseLevel = Math.max(0.05, currentAudioLevel * 2); // Adjust multiplier

          const falloff = Math.exp(
            -(distanceFromCenter * distanceFromCenter) /
              (2 * (equalizerBars.length / 4) * (equalizerBars.length / 4))
          );

          const randomFactor = 0.1 + Math.random() * 0.1; // Less randomness maybe
          return baseLevel * falloff * (1 + randomFactor);
        });

      setEqualizerBars(newBars);
    }, 50);

    return () => clearInterval(interval);
    // Dependencies: Trigger recalculation when recording status changes, or audio level changes
  }, [
    isRecording,
    initializationStatus,
    currentAudioLevel,
    equalizerBars.length,
  ]);

  // Effect to set up message listener from background script
  useEffect(() => {
    const handleMessage = (
      request: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      switch (request.type) {
        case "UPDATE_TRANSCRIPTION":
          console.log("RecordingMic: Received UPDATE_TRANSCRIPTION", request);
          const diarizationRequest = request as DiarizationRequest;
          // Check if this is a speaker_transcription_update message format
          if (
            diarizationRequest.type === "speaker_transcription_update" &&
            diarizationRequest.data &&
            diarizationRequest.data.segments &&
            Array.isArray(diarizationRequest.data.segments)
          ) {
            console.log(
              "RecordingMic: Processing speaker_transcription_update with segments array",
              JSON.stringify(diarizationRequest.data.segments, null, 2)
            );

            const data = diarizationRequest.data;

            // Important debug info
            console.log("RecordingMic: Current diarization state:", {
              isConnected: diarizationConnected,
              resultsCount: data.segments.length,
            });

            // Log each segment separately to verify structure
            data.segments.forEach((segment, index: number) => {
              console.log(`RecordingMic: Segment ${index}:`, {
                speaker: segment.speaker || "UNDEFINED",
                text: segment.text || "EMPTY",
                start: segment.start,
                end: segment.end,
              });
            });

            // Filter out any segments with undefined speaker or text before adding them
            const validSegments = data.segments.filter(
              (segment) =>
                segment &&
                typeof segment === "object" &&
                segment.text &&
                segment.speaker
            );

            console.log(
              "RecordingMic: Filtered down to valid segments:",
              validSegments.length
            );

            if (validSegments.length === 0) {
              console.warn(
                "RecordingMic: No valid segments found in update. Skipping update."
              );
              return;
            }

            // Clear previous results and replace with the valid complete transcript
            // This ensures we have the complete state from the server
            setDiarizationResults(validSegments);

            // Add speaker names for any new speakers
            validSegments.forEach((segment) => {
              // We've already validated these have speaker values
              if (!speakerNames[segment.speaker]) {
                // Extract the speaker number safely with proper error handling
                try {
                  const speakerNumber = segment.speaker.includes("SPEAKER_")
                    ? segment.speaker.replace("SPEAKER_", "")
                    : segment.speaker;

                  setSpeakerNames((prevNames) => ({
                    ...prevNames,
                    [segment.speaker]: `Speaker ${speakerNumber}`,
                  }));
                } catch (error) {
                  console.error(
                    "Error processing speaker name:",
                    error,
                    segment
                  );
                }
              }
            });

            // Mark diarization as connected since we're receiving data
            setDiarizationConnected(true);

            console.log(
              "RecordingMic: Updated with segments, new count:",
              request.segments.length
            );
          }
          // Fallback for legacy format - single segment or other format
          else if (
            diarizationRequest.data.segments &&
            Array.isArray(diarizationRequest.data.segments)
          ) {
            // Handle server response with segments array (legacy format)
            console.log(
              "RecordingMic: Processing legacy format with segments array",
              diarizationRequest.data.segments
            );
            diarizationRequest.data.segments.forEach((segment) => {
              updateDiarizationResults(segment);
            });
            // Also mark diarization as connected
            setDiarizationConnected(true);
          } else {
            // Handle single segment format
            console.log(
              "RecordingMic: Processing single segment format",
              request
            );
            updateDiarizationResults(diarizationRequest.data.segments);
          }
          break;
        case "RECORDING_STATE_UPDATE":
          // Update local recording state based on background's actual recording status
          setIsRecording(request.isRecording);
          // If recording is now TRUE, show connecting message if we're not connected yet
          if (request.isRecording) {
            if (!diarizationConnected) {
              setInitializationStatus("Connecting to diarization server...");
            }
          } else {
            // If recording is now FALSE, maybe set a default status if no error is coming
            if (initializationStatus === null) {
              setInitializationStatus("Ready");
            }
          }
          // If recording stopped in background, stop mic listening here too
          if (!request.isRecording && micListening) {
            SpeechRecognition.stopListening();
          }
          break;
        case "AUDIO_LEVEL_UPDATE":
          setCurrentAudioLevel(request.level);
          break;
        case "WEBSOCKET_STATUS":
          setDiarizationConnected(request.isConnected);
          // You could also update initializationStatus here if connection is part of init
          // if (!request.isConnected && isRecording) { // If disconnected while recording
          // setInitializationStatus("WebSocket disconnected!");
          // }
          break;
        case "RECORDING_ERROR":
          // Handle errors reported by the background script
          console.error("Recording error from background:", request.error);
          setIsRecording(false); // Ensure local state reflects stop
          setInitializationStatus(`Error: ${request.error}`); // Set the error message as status
          // The background script should also stop mic listening in this case
          if (micListening) {
            SpeechRecognition.stopListening();
          }
          break;
        case "STATUS_UPDATE": // NEW: Handle granular status updates
          if (!isRecording) {
            // Only show initialization statuses before recording starts
            setInitializationStatus(request.message);
          }
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      console.log("Side panel message listener removed.");
      // Ensure microphone listening is stopped and transcript is reset on unmount
      if (micListening) {
        // Only stop if it was listening
        SpeechRecognition.stopListening();
      }
      resetMicTranscript();
      setInitializationStatus(null); // Clear status on unmount
    };
  }, [micListening, resetMicTranscript, isRecording, initializationStatus]); // Dependencies updated

  // Function to update diarization results state with improved error handling
  const updateDiarizationResults = (segment: DiarizationSegment) => {
    setDiarizationResults((prevResults) => {
      // Find and update logic...
      const existingIndex =
        segment.segmentIndex !== undefined
          ? prevResults.findIndex(
              (s) => s.segmentIndex === segment.segmentIndex
            )
          : -1;

      if (existingIndex > -1) {
        const newResults = [...prevResults];
        newResults[existingIndex] = {
          ...newResults[existingIndex],
          ...segment,
        };
        return newResults;
      } else {
        return [...prevResults, segment];
      }
    });

    if (segment.speaker && !speakerNames[segment.speaker]) {
      try {
        // Extract the speaker number safely
        const speakerNumber = segment.speaker.includes("SPEAKER_")
          ? segment.speaker.replace("SPEAKER_", "")
          : segment.speaker;

        setSpeakerNames((prevNames) => ({
          ...prevNames,
          [segment.speaker]: `Speaker ${speakerNumber}`,
        }));
      } catch (error) {
        console.error("Error formatting speaker name:", error, segment);
        // Fallback to basic format
        setSpeakerNames((prevNames) => ({
          ...prevNames,
          [segment.speaker]: `Speaker ${segment.speaker}`,
        }));
      }
    }
  };

  // Effect to scroll diarization results to the bottom (remains the same)
  useEffect(() => {
    if (
      selectedTranscriptType === "diarization" &&
      diarizationTranscriptRef.current
    ) {
      const element = diarizationTranscriptRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [diarizationResults.length, selectedTranscriptType]);

  // --- Handlers ---

  const toggleRecording = async () => {
    if (isRecording) {
      console.log("UI: Requesting background to stop recording...");
      chrome.runtime.sendMessage({ type: "STOP_RECORDING" });

      // Stopping the mic hook here gives immediate feedback,
      // but the background script also sends update to stop it.
      if (micListening) {
        SpeechRecognition.stopListening();
        // Don't reset mic transcript until background confirms stop?
        // Or reset here for quicker UI clear. Depends on UX preference.
        resetMicTranscript(); // Reset mic transcript when user clicks stop
      }

      // Clear initialization status when user clicks stop
      setInitializationStatus(null);

      if (onStop) onStop();
    } else {
      // --- Starting Recording ---
      // Clear previous results and status messages
      setDiarizationResults([]);
      setSpeakerNames({});
      resetMicTranscript(); // Clear mic transcript from previous session

      // Set initial status message optimistically
      setInitializationStatus("Starting initialization...");

      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const targetTabId = tabs[0]?.id;

        if (!targetTabId) {
          const errorMsg = "UI: Could not get the active tab ID.";
          console.error(errorMsg);
          setInitializationStatus(errorMsg); // Show error in status
          return;
        }
        console.log("UI: Got active tab ID:", targetTabId);

        // Request background script to START recording
        console.log("UI: Requesting background to start recording...");
        chrome.runtime.sendMessage(
          {
            type: "START_RECORDING",
            tabId: targetTabId,
            meetingName: meetingName,
          },
          (response) => {
            if (response && !response.success) {
              console.error(
                "UI: Background failed to start recording:",
                response.error
              );
              setInitializationStatus(`Error: ${response.error}`); // Show error in status
              setIsRecording(false); // Ensure UI state is correct on background failure
              if (micListening) {
                // If mic hook was optimistically started
                SpeechRecognition.stopListening();
              }
            } else {
              console.log("UI: Background acknowledged start request.");
              // Background will send STATUS_UPDATE and then RECORDING_STATE_UPDATE: true
              // The UI state will be updated by the message listener.
            }
          }
        );

        // Start microphone-only listening immediately (optional, for separate display)
        // This starts the browser prompt for mic if not already granted
        if (micTranscriptionEnabled && !micListening) {
          console.log("UI: Starting microphone-only listener...");
          SpeechRecognition.startListening({
            continuous: true,
            interimResults: true,
          });
        }

        // Note: isRecording state will be set to true by the message listener
        // when the background confirms the recording has truly started.
      } catch (error: any) {
        console.error("UI: Error getting tab ID or sending message:", error);
        setInitializationStatus(`Error: ${error.message || error}`); // Show error in status
        setIsRecording(false); // Ensure recording state is false on UI error
        if (micListening) {
          SpeechRecognition.stopListening();
        }
      }
    }
  };

  // Handle speaker name changes (remains the same)
  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setSpeakerNames((prev) => ({
      ...prev,
      [speakerId]: name,
    }));
  };

  // Helper function to get a color for a speaker
  function getSpeakerColor(
    speakerId: string | undefined,
    accentColor: string
  ): string {
    const colors: string[] = [
      `d4m-bg-${accentColor}-500 d4m-text-white`,
      "d4m-bg-blue-500 d4m-text-white",
      "d4m-bg-green-500 d4m-text-white",
      "d4m-bg-yellow-500 d4m-text-black",
      "d4m-bg-purple-500 d4m-text-white",
      "d4m-bg-pink-500 d4m-text-white",
    ];

    // Handle undefined or empty speakerId
    if (!speakerId) {
      return colors[0]; // Default to first color if no speaker ID
    }

    // Simple hash function to consistently map speaker IDs to colors
    const hash = speakerId.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return colors[hash % colors.length];
  }

  // Determine the status text to display at the bottom
  const currentStatusText = isRecording
    ? "Recording..." // When isRecording is true (confirmed by background)
    : initializationStatus // When not recording, display initialization/error status if set
    ? initializationStatus
    : "Ready"; // Default state

  return (
    <div
      ref={containerRef}
      className={`d4m-flex d4m-flex-col d4m-w-full d4m-h-full d4m-p-4 d4m-rounded-lg d4m-bg-gray-800 d4m-bg-opacity-50 d4m-backdrop-blur-sm d4m-border d4m-border-gray-700`}
    >
      {/* Header with title (remains the same) */}
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-4">
        <h2
          className={`d4m-text-${accentColor}-400 d4m-text-lg d4m-font-semibold`}
        >
          Voice Recording
        </h2>
        <div className="d4m-flex d4m-gap-2">
          {browserSupportsLiveMic && (
            <button
              onClick={() => setSelectedTranscriptType("live")}
              className={`d4m-px-3 d4m-py-1 d4m-text-xs d4m-rounded-full d4m-transition-colors ${
                selectedTranscriptType === "live"
                  ? `d4m-bg-${accentColor}-500 d4m-text-white`
                  : `d4m-bg-gray-700 d4m-text-gray-300`
              }`}
            >
              Live (Mic)
            </button>
          )}
          <button
            onClick={() => setSelectedTranscriptType("diarization")}
            className={`d4m-px-3 d4m-py-1 d4m-text-xs d4m-rounded-full d4m-transition-colors ${
              selectedTranscriptType === "diarization"
                ? `d4m-bg-${accentColor}-500 d4m-text-white`
                : `d4m-bg-gray-700 d4m-text-gray-300`
            }`}
          >
            Diarization (Combined)
          </button>
        </div>
      </div>

      <div className="d4m-mb-6">
        <AudioVisualizer
          audioLevel={currentAudioLevel}
          isActive={isRecording || initializationStatus !== null}
        />
      </div>

      {/* Recording controls with meeting info (remains the same) */}
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-6 d4m-gap-4">
        {/* Recording button (remains the same) */}
        <div className="d4m-flex-shrink-0">
          <button
            onClick={toggleRecording}
            className={`d4m-w-16 d4m-h-16 d4m-rounded-full d4m-flex d4m-items-center d4m-justify-center d4m-transition-all d4m-duration-300 ${
              isRecording
                ? `d4m-bg-red-500 d4m-text-white d4m-animate-pulse`
                : `d4m-bg-${accentColor}-500 d4m-text-white`
            }`}
            // Optional: Disable button during initialization to prevent multiple clicks
            disabled={initializationStatus !== null && !isRecording}
          >
            {isRecording ? (
              /* Stop Icon */ <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
              </svg>
            ) : (
              /* Mic Icon */ <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            )}
          </button>
        </div>

        {/* Meeting info card (remains largely the same, status text updated) */}
        <div className="d4m-flex-1 d4m-bg-gray-800 d4m-bg-opacity-50 d4m-rounded-lg d4m-p-3 d4m-border d4m-border-gray-700">
          {isEditingName /* Edit mode */ ? (
            <div className="d4m-flex d4m-gap-2">
              <input
                type="text"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                className="d4m-flex-1 d4m-bg-gray-700 d4m-text-white d4m-px-2 d4m-py-1 d4m-rounded d4m-text-sm d4m-border d4m-border-gray-600 d4m-focus:outline-none d4m-focus:border-blue-500"
                autoFocus
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                }}
              />
              <button
                onClick={() => setIsEditingName(false)}
                className="d4m-bg-blue-500 d4m-text-white d4m-px-2 d4m-py-1 d4m-rounded d4m-text-xs"
              >
                Save
              </button>
            </div>
          ) : (
            /* Display mode */
            <div className="d4m-flex d4m-justify-between d4m-items-start">
              <div>
                <div className="d4m-flex d4m-items-center d4m-gap-2">
                  <h3
                    className={`d4m-text-${accentColor}-400 d4m-text-sm d4m-font-medium`}
                  >
                    New Meeting
                  </h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="d4m-opacity-50 hover:d4m-opacity-100 d4m-transition-opacity"
                    title="Edit meeting name"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
                <p className="d4m-text-xs d4m-text-gray-400">
                  {new Date().toLocaleDateString()} •{" "}
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              {/* Recording Status Text (updated logic) */}
              <div
                className={`d4m-text-xs d4m-px-2 d4m-py-0.5 d4m-rounded-full ${
                  isRecording
                    ? "d4m-bg-red-500 d4m-bg-opacity-20 d4m-text-red-400"
                    : initializationStatus // If not recording, check initialization status
                    ? initializationStatus.startsWith("Error:")
                      ? "d4m-bg-red-500 d4m-bg-opacity-20 d4m-text-red-400"
                      : "d4m-bg-yellow-500 d4m-bg-opacity-20 d4m-text-yellow-400" // Show yellow for initializing, red for error
                    : "d4m-bg-gray-600 d4m-bg-opacity-30 d4m-text-gray-400" // Default Ready state
                }`}
              >
                {currentStatusText} {/* Display the calculated status text */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript windows */}
      <div className="d4m-flex-1 d4m-overflow-hidden d4m-rounded-lg d4m-border d4m-border-gray-700">
        {/* Microphone-only Live Transcript View */}
        {selectedTranscriptType === "live" && browserSupportsLiveMic ? (
          <div
            className={`d4m-h-full d4m-overflow-y-auto d4m-p-3 d4m-bg-gray-900 d4m-bg-opacity-50 ${textColor}`}
          >
            <h3
              className={`d4m-text-${accentColor}-400 d4m-text-sm d4m-font-medium d4m-mb-2`}
            >
              Live Transcript (Microphone)
            </h3>
            <div className="d4m-text-sm">
              {micTranscript || (
                <span className="d4m-text-gray-500 d4m-italic">
                  {
                    micListening // Check micListening from the hook
                      ? "Listening to microphone..."
                      : initializationStatus // Check initialization status if mic not listening
                      ? initializationStatus.startsWith("Error:")
                        ? "Microphone transcription stopped due to error."
                        : "Waiting for recording to start..."
                      : "Press the microphone button to start recording" // Default message
                  }
                </span>
              )}
            </div>
          </div>
        ) : selectedTranscriptType === "live" && !browserSupportsLiveMic ? (
          <div
            className={`d4m-h-full d4m-flex d4m-items-center d4m-justify-center d4m-p-3 d4m-bg-gray-900 d4m-bg-opacity-50 ${textColor} d4m-text-gray-500 d4m-italic text-center`}
          >
            Browser does not support Live Microphone Transcription. Please use
            the Diarization view.
          </div>
        ) : null}

        {/* Diarization (Combined Audio) Transcript View */}
        {selectedTranscriptType === "diarization" && (
          <div
            ref={diarizationTranscriptRef}
            className={`d4m-h-full d4m-overflow-y-auto d4m-p-3 d4m-bg-gray-900 d4m-bg-opacity-50 ${textColor}`}
          >
            <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-2">
              <h3
                className={`d4m-text-${accentColor}-400 d4m-text-sm d4m-font-medium`}
              >
                Diarization (Combined Audio)
              </h3>
              <span
                className={`d4m-text-xs d4m-px-2 d4m-py-0.5 d4m-rounded-full ${
                  diarizationConnected
                    ? "d4m-bg-green-500 d4m-bg-opacity-20 d4m-text-green-400"
                    : "d4m-bg-red-500 d4m-bg-opacity-20 d4m-text-red-400"
                }`}
              >
                {diarizationConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Connection Status Banner - show when connecting or waiting */}
            {isRecording && !diarizationConnected && (
              <div className="d4m-mb-4 d4m-bg-yellow-500 d4m-bg-opacity-10 d4m-border d4m-border-yellow-500 d4m-border-opacity-20 d4m-rounded-md d4m-p-3 d4m-text-yellow-400 d4m-flex d4m-items-center d4m-gap-2">
                <div className="d4m-w-3 d4m-h-3 d4m-rounded-full d4m-bg-yellow-400 d4m-animate-pulse"></div>
                <span className="d4m-text-sm d4m-font-medium">
                  Establishing connection to transcription server... Please
                  wait.
                </span>
              </div>
            )}

            {/* Disconnection Warning - show when connection is unexpectedly lost */}
            {isRecording &&
              diarizationConnected === false &&
              diarizationResults.length > 0 && (
                <div className="d4m-mb-4 d4m-bg-red-500 d4m-bg-opacity-10 d4m-border d4m-border-red-500 d4m-border-opacity-20 d4m-rounded-md d4m-p-3 d4m-text-red-400 d4m-flex d4m-items-center d4m-gap-2">
                  <div className="d4m-w-3 d4m-h-3 d4m-rounded-full d4m-bg-red-400 d4m-animate-pulse"></div>
                  <span className="d4m-text-sm d4m-font-medium">
                    Connection to transcription server interrupted. Attempting
                    to reconnect...
                  </span>
                </div>
              )}

            {/* Shutdown Message - show when waiting for final transcript */}
            {!isRecording &&
              initializationStatus &&
              initializationStatus.includes("final") && (
                <div className="d4m-mb-4 d4m-bg-blue-500 d4m-bg-opacity-10 d4m-border d4m-border-blue-500 d4m-border-opacity-20 d4m-rounded-md d4m-p-3 d4m-text-blue-400 d4m-flex d4m-items-center d4m-gap-2">
                  <div className="d4m-w-3 d4m-h-3 d4m-rounded-full d4m-bg-blue-400 d4m-animate-pulse"></div>
                  <span className="d4m-text-sm d4m-font-medium">
                    Finalizing transcription... Please wait while we process the
                    last segments.
                  </span>
                </div>
              )}

            {diarizationResults.length > 0 ? (
              <div className="d4m-space-y-4">
                {diarizationResults.map((segment, index) => {
                  // Speaker and text are validated during filtering above
                  // Safely extract speaker name
                  const speakerName = speakerNames[segment.speaker]
                    ? speakerNames[segment.speaker] // Use existing speaker name if available
                    : segment.speaker && segment.speaker.includes("SPEAKER_")
                    ? `Speaker ${segment.speaker.replace("SPEAKER_", "")}` // Convert SPEAKER_XX to Speaker XX
                    : `Speaker ${segment.speaker || "Unknown"}`; // Fallback display

                  const speakerColor = getSpeakerColor(
                    segment.speaker || "unknown",
                    accentColor
                  );
                  return (
                    <div
                      key={segment.segmentIndex ?? index}
                      className="d4m-flex d4m-flex-col d4m-gap-1 d4m-border-b d4m-border-gray-700/30 d4m-pb-3 d4m-last:border-0"
                    >
                      <div className="d4m-flex d4m-items-center d4m-gap-2">
                        <div
                          className={`d4m-self-start d4m-px-3 d4m-py-1 d4m-rounded-full d4m-text-xs d4m-font-medium ${speakerColor} d4m-flex d4m-items-center d4m-gap-1`}
                        >
                          {speakerName}
                          <button
                            onClick={() => {
                              if (!segment.speaker) {
                                alert("Cannot edit name for undefined speaker");
                                return;
                              }
                              const newName = prompt(
                                `Enter name for ${speakerName}:`,
                                speakerNames[segment.speaker] ||
                                  `Speaker ${segment.speaker || "Unknown"}`
                              );
                              if (newName !== null && newName.trim() !== "") {
                                handleSpeakerNameChange(
                                  segment.speaker,
                                  newName.trim()
                                );
                              }
                            }}
                            className="d4m-ml-1 d4m-opacity-50 hover:d4m-opacity-100 d4m-transition-opacity"
                            title="Edit speaker name"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="d4m-text-sm d4m-pl-4">{segment.text}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="d4m-text-center d4m-py-8">
                {isRecording && !diarizationConnected ? (
                  <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-3">
                    <div className="d4m-w-10 d4m-h-10 d4m-border-t-4 d4m-border-r-4 d4m-border-yellow-500 d4m-rounded-full d4m-animate-spin"></div>
                    <p className="d4m-text-yellow-400 d4m-font-medium">
                      Connecting to transcription service...
                    </p>
                    <p className="d4m-text-gray-500 d4m-text-sm">
                      This may take a few moments
                    </p>
                  </div>
                ) : isRecording ? (
                  <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-3">
                    <div className="d4m-w-10 d4m-h-10 d4m-border-t-4 d4m-border-r-4 d4m-border-blue-500 d4m-rounded-full d4m-animate-spin"></div>
                    <p className="d4m-text-blue-400 d4m-font-medium">
                      Processing audio...
                    </p>
                    <p className="d4m-text-gray-500 d4m-text-sm">
                      Waiting for the first transcription segments
                    </p>
                  </div>
                ) : initializationStatus &&
                  !initializationStatus.startsWith("Error:") ? (
                  <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-2">
                    <p className="d4m-text-yellow-400 d4m-font-medium">
                      {initializationStatus}
                    </p>
                  </div>
                ) : initializationStatus ? (
                  <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-2">
                    <p className="d4m-text-red-400 d4m-font-medium">
                      {initializationStatus}
                    </p>
                  </div>
                ) : (
                  <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-2">
                    <p className="d4m-text-gray-500 d4m-font-medium">
                      Start recording to see diarization results
                    </p>
                    <p className="d4m-text-gray-600 d4m-text-sm">
                      Click the microphone button to begin
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator at the bottom */}
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mt-3 d4m-text-xs d4m-text-gray-400">
        <div>
          {/* Display the calculated status text */}
          <span
            className={`d4m-flex d4m-items-center d4m-gap-1 ${
              isRecording
                ? "d4m-text-red-500" // Red when recording
                : initializationStatus &&
                  initializationStatus.startsWith("Error:")
                ? "d4m-text-red-500" // Red for errors
                : initializationStatus
                ? "d4m-text-yellow-500" // Yellow for initializing
                : "" // Default color
            }`}
          >
            {/* Optional: Add pulse animation for recording state */}
            {isRecording && (
              <span className="d4m-w-2 d4m-h-2 d4m-rounded-full d4m-bg-red-500 d4m-animate-pulse mr-1"></span>
            )}
            {currentStatusText}
          </span>
        </div>
        <div>
          {selectedTranscriptType === "diarization" && (
            <span>{diarizationResults.length} segments</span>
          )}
          {selectedTranscriptType === "live" && browserSupportsLiveMic && (
            <span>Microphone: {micListening ? "Listening" : "Idle"}</span>
          )}
        </div>
      </div>
    </div>
  );
};
