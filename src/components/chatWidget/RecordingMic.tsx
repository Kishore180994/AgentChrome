// src/components/RecordingMic.tsx

import React, { useEffect, useState, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { AudioVisualizer } from "./AudioVisualizer";
import {
  DiarizationRequest,
  DiarizationSegment,
} from "../../services/ai/interfaces";
import { themeStyles } from "../../utils/themes";

interface RecordingMicProps {
  accentColor: string;
  textColor: string;
  mode?: "light" | "dark";
  theme?: "neumorphism" | "glassmorphism" | "claymorphism";
  onStop?: () => void;
}

export const RecordingMic: React.FC<RecordingMicProps> = ({
  accentColor,
  textColor,
  mode = "dark",
  theme = "neumorphism",
  onStop,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<
    string | null
  >(null);

  const [selectedTranscriptType, setSelectedTranscriptType] = useState<
    "live" | "diarization"
  >("live");

  const [meetingTimestamp, setMeetingTimestamp] = useState(new Date());
  const defaultMeetingName = `Meeting - ${meetingTimestamp.toLocaleDateString()} ${meetingTimestamp.toLocaleTimeString()}`;
  const [meetingName, setMeetingName] = useState(defaultMeetingName);
  const [isEditingName, setIsEditingName] = useState(false);

  const [diarizationResults, setDiarizationResults] = useState<
    DiarizationSegment[]
  >([]);
  const [diarizationConnected, setDiarizationConnected] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<{
    [key: string]: string;
  }>({});

  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const diarizationTranscriptRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null); // Ref for live transcript text

  const {
    transcript: micTranscript,
    interimTranscript: interimTranscript,
    finalTranscript: finalTranscript,
    listening: micListening,
    resetTranscript: resetMicTranscript,
    browserSupportsContinuousListening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // State to trigger animation
  const [animateTranscript, setAnimateTranscript] = useState(false);

  const browserSupportsLiveMic =
    SpeechRecognition.browserSupportsSpeechRecognition();
  const micTranscriptionEnabled = browserSupportsLiveMic;

  // Effect to trigger animation when final transcript changes
  useEffect(() => {
    if (finalTranscript) {
      setAnimateTranscript(true);
      const timer = setTimeout(() => {
        setAnimateTranscript(false);
      }, 1000); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [finalTranscript]);

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

            console.log("RecordingMic: Current diarization state:", {
              isConnected: diarizationConnected,
              resultsCount: data.segments.length,
            });

            data.segments.forEach((segment, index: number) => {
              console.log(`RecordingMic: Segment ${index}:`, {
                speaker: segment.speaker || "UNDEFINED",
                text: segment.text || "EMPTY",
                start: segment.start,
                end: segment.end,
              });
            });

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

            setDiarizationResults(validSegments);

            validSegments.forEach((segment) => {
              if (!speakerNames[segment.speaker]) {
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

            setDiarizationConnected(true);

            console.log(
              "RecordingMic: Updated with segments, new count:",
              request.segments.length
            );
          } else if (
            diarizationRequest.data.segments &&
            Array.isArray(diarizationRequest.data.segments)
          ) {
            console.log(
              "RecordingMic: Processing legacy format with segments array",
              diarizationRequest.data.segments
            );
            diarizationRequest.data.segments.forEach((segment) => {
              updateDiarizationResults(segment);
            });
            setDiarizationConnected(true);
          } else {
            console.log(
              "RecordingMic: Processing single segment format",
              request
            );
            updateDiarizationResults(diarizationRequest.data.segments);
          }
          break;
        case "RECORDING_STATE_UPDATE":
          setIsRecording(request.isRecording);
          if (request.isRecording) {
            if (!diarizationConnected) {
              setInitializationStatus("Connecting to diarization server...");
            }
          } else {
            if (initializationStatus === null) {
              setInitializationStatus("Ready");
            }
          }
          if (!request.isRecording && micListening) {
            SpeechRecognition.stopListening();
          }
          break;
        case "AUDIO_LEVEL_UPDATE":
          setCurrentAudioLevel(request.level);
          break;
        case "WEBSOCKET_STATUS":
          setDiarizationConnected(request.isConnected);
          break;
        case "RECORDING_ERROR":
          console.error("Recording error from background:", request.error);
          setIsRecording(false);
          setInitializationStatus(`Error: ${request.error}`);
          if (micListening) {
            SpeechRecognition.stopListening();
          }
          break;
        case "STATUS_UPDATE":
          if (!isRecording) {
            setInitializationStatus(request.message);
          }
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      console.log("Side panel message listener removed.");
      if (micListening) {
        SpeechRecognition.stopListening();
      }
      resetMicTranscript();
      setInitializationStatus(null);
    };
  }, [micListening, resetMicTranscript, isRecording, initializationStatus]);

  const updateDiarizationResults = (segment: DiarizationSegment) => {
    setDiarizationResults((prevResults) => {
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
        const speakerNumber = segment.speaker.includes("SPEAKER_")
          ? segment.speaker.replace("SPEAKER_", "")
          : segment.speaker;

        setSpeakerNames((prevNames) => ({
          ...prevNames,
          [segment.speaker]: `Speaker ${speakerNumber}`,
        }));
      } catch (error) {
        console.error("Error formatting speaker name:", error, segment);
        setSpeakerNames((prevNames) => ({
          ...prevNames,
          [segment.speaker]: `Speaker ${segment.speaker}`,
        }));
      }
    }
  };

  useEffect(() => {
    if (
      selectedTranscriptType === "diarization" &&
      diarizationTranscriptRef.current
    ) {
      const element = diarizationTranscriptRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [diarizationResults.length, selectedTranscriptType]);

  const toggleRecording = async () => {
    if (isRecording) {
      console.log("UI: Requesting background to stop recording...");
      chrome.runtime.sendMessage({ type: "STOP_RECORDING" });

      if (micListening) {
        SpeechRecognition.stopListening();
        resetMicTranscript();
      }

      setInitializationStatus(null);

      if (onStop) onStop();
    } else {
      setDiarizationResults([]);
      resetMicTranscript();

      setMeetingTimestamp(new Date());

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
          setInitializationStatus(errorMsg);
          return;
        }
        console.log("UI: Got active tab ID:", targetTabId);

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
              setInitializationStatus(`Error: ${response.error}`);
              setIsRecording(false);
              if (micListening) {
                SpeechRecognition.stopListening();
              }
            } else {
              console.log("UI: Background acknowledged start request.");
            }
          }
        );

        if (micTranscriptionEnabled && !micListening) {
          console.log("UI: Starting microphone-only listener...");
          SpeechRecognition.startListening({
            continuous: true,
            interimResults: true,
          });
        }
      } catch (error: any) {
        console.error("UI: Error getting tab ID or sending message:", error);
        setInitializationStatus(`Error: ${error.message || error}`);
        setIsRecording(false);
        if (micListening) {
          SpeechRecognition.stopListening();
        }
      }
    }
  };

  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setSpeakerNames((prev) => ({
      ...prev,
      [speakerId]: name,
    }));
  };

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

    if (!speakerId) {
      return colors[0];
    }

    const hash = speakerId.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return colors[hash % colors.length];
  }

  const currentStatusText = isRecording
    ? "Recording..."
    : initializationStatus
    ? initializationStatus
    : "Ready";

  const currentTheme = themeStyles[theme][mode];

  return (
    <div
      ref={containerRef}
      className={`d4m-flex d4m-flex-col d4m-w-full d4m-h-full ${currentTheme.container}`}
    >
      {/* Header Section */}
      <div className="d4m-flex d4m-items-center d4m-justify-between d4m-p-4 d4m-border-b d4m-border-gray-700">
        <div className="d4m-flex d4m-items-center d4m-gap-2">
          {isEditingName ? (
            <div className="d4m-flex d4m-gap-2">
              <input
                type="text"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                className="d4m-flex-1 d4m-bg-gray-700 d4m-text-white d4m-px-2 d4m-py-1 d4m-rounded d4m-text-sm d4m-border d4m-border-gray-600 focus:d4m-outline-none focus:d4m-border-blue-500 d4m-shadow-inner"
                autoFocus
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                }}
              />
              <button
                onClick={() => setIsEditingName(false)}
                className={`d4m-bg-${accentColor}-500 d4m-text-white d4m-px-3 d4m-py-1 d4m-rounded d4m-text-xs d4m-font-medium d4m-shadow-sm d4m-transition-colors hover:d4m-bg-${accentColor}-600`}
              >
                Save
              </button>
            </div>
          ) : (
            <h3
              className={`d4m-text-${accentColor}-400 d4m-text-base d4m-font-semibold cursor-pointer`}
              onClick={() => setIsEditingName(true)}
              title="Click to edit meeting name"
            >
              {meetingName}
            </h3>
          )}
        </div>
        <div
          className={`d4m-text-xs d4m-px-3 d4m-py-1.5 d4m-rounded-full d4m-font-medium d4m-shadow-sm ${
            isRecording
              ? "d4m-bg-red-500 d4m-bg-opacity-20 d4m-text-red-400 d4m-border d4m-border-red-500 d4m-border-opacity-20"
              : initializationStatus
              ? initializationStatus.startsWith("Error:")
                ? "d4m-bg-red-500 d4m-bg-opacity-20 d4m-text-red-400 d4m-border d4m-border-red-500 d4m-border-opacity-20"
                : "d4m-bg-yellow-500 d4m-bg-opacity-20 d4m-text-yellow-400 d4m-border d4m-border-yellow-500 d4m-border-opacity-20"
              : "d4m-bg-gray-600 d4m-bg-opacity-30 d4m-text-gray-400 d4m-border d4m-border-gray-600 d4m-border-opacity-20"
          }`}
        >
          {isRecording && (
            <span className="d4m-w-2 d4m-h-2 d4m-rounded-full d4m-bg-red-500 d4m-animate-pulse d4m-mr-1 d4m-inline-block"></span>
          )}
          {currentStatusText}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="d4m-flex-1 d4m-overflow-hidden d4m-flex">
        {/* Left Control Panel */}
        <div
          className={`d4m-w-24 d4m-flex d4m-flex-col d4m-items-center d4m-py-4 d4m-gap-6 ${currentTheme.sidebar}`}
        >
          {/* Recording button */}
          <button
            onClick={toggleRecording}
            className={`d4m-w-16 d4m-h-16 d4m-rounded-full d4m-flex d4m-items-center d4m-justify-center d4m-transition-all d4m-duration-300 d4m-shadow-lg ${
              isRecording
                ? `d4m-bg-red-500 d4m-text-white d4m-animate-pulse`
                : `d4m-bg-${accentColor}-500 d4m-text-white`
            }`}
            disabled={initializationStatus !== null && !isRecording}
          >
            {isRecording ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
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

          {/* Audio Visualizer */}
          <div className="d4m-w-full d4m-px-2">
            <AudioVisualizer
              audioLevel={currentAudioLevel}
              isActive={isRecording || initializationStatus !== null}
            />
          </div>

          {/* Transcription type tabs */}
          <div className="d4m-flex d4m-flex-col d4m-gap-3 d4m-mt-auto">
            {browserSupportsLiveMic && (
              <button
                onClick={() => setSelectedTranscriptType("live")}
                className={`d4m-px-3 d4m-py-1.5 d4m-text-xs d4m-rounded-md d4m-transition-colors ${
                  selectedTranscriptType === "live"
                    ? `d4m-bg-${accentColor}-500 d4m-text-white`
                    : `d4m-bg-gray-700 d4m-text-gray-300`
                }`}
              >
                Live
              </button>
            )}
            <button
              onClick={() => setSelectedTranscriptType("diarization")}
              className={`d4m-px-3 d4m-py-1.5 d4m-text-xs d4m-rounded-md d4m-transition-colors ${
                selectedTranscriptType === "diarization"
                  ? `d4m-bg-${accentColor}-500 d4m-text-white`
                  : `d4m-bg-gray-700 d4m-text-gray-300`
              }`}
            >
              Diarization
            </button>
          </div>
        </div>

        {/* Right Transcription Area */}
        <div
          className={`d4m-flex-1 d4m-overflow-hidden ${currentTheme.executionGroup}`}
        >
          {/* Microphone-only Live Transcript View */}
          {selectedTranscriptType === "live" && browserSupportsLiveMic ? (
            <div
              className={`d4m-h-full d4m-overflow-y-auto d4m-p-4 ${currentTheme.textarea} ${textColor}`}
            >
              <h3
                className={`d4m-text-${accentColor}-400 d4m-text-sm d4m-font-medium d4m-mb-3`}
              >
                Live Transcript (Microphone)
              </h3>
              <div className="d4m-text-sm">
                {micTranscript ? (
                  <span
                    ref={transcriptRef}
                    className={`live-transcript-text ${textColor} ${
                      animateTranscript ? "animate-fish-eye" : ""
                    }`}
                  >
                    {micTranscript}
                  </span>
                ) : (
                  <span className="d4m-text-gray-500 d4m-italic">
                    {micListening
                      ? "Listening to microphone..."
                      : initializationStatus
                      ? initializationStatus.startsWith("Error:")
                        ? "Microphone transcription stopped due to error."
                        : "Waiting for recording to start..."
                      : "Press the microphone button to start recording"}
                  </span>
                )}
              </div>
            </div>
          ) : selectedTranscriptType === "live" && !browserSupportsLiveMic ? (
            <div
              className={`d4m-h-full d4m-flex d4m-items-center d4m-justify-center d4m-p-4 ${currentTheme.textarea} ${textColor} d4m-italic text-center`}
            >
              Browser does not support Live Microphone Transcription. Please use
              the Diarization view.
            </div>
          ) : null}

          {/* Add the style block for the animation */}
          <style>
            {`
              @keyframes fishEyeBounce {
                0% {
                  transform: scale(1);
                  color: white;
                }
                50% {
                  transform: scale(1.05);
                  color: blue;
                }
                100% {
                  transform: scale(1);
                  color: white;
                }
              }

              .live-transcript-text.animate-fish-eye {
                animation: fishEyeBounce 1s ease-in-out;
              }
            `}
          </style>

          {/* Diarization (Combined Audio) Transcript View */}
          {selectedTranscriptType === "diarization" && (
            <div
              ref={diarizationTranscriptRef}
              className={`d4m-h-full d4m-overflow-y-auto d4m-p-4 ${currentTheme.textarea} ${textColor}`}
            >
              <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-3">
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

              {isRecording && !diarizationConnected && (
                <div className="d4m-mb-4 d4m-bg-yellow-500 d4m-bg-opacity-10 d4m-border d4m-border-yellow-500 d4m-border-opacity-20 d4m-rounded-md d4m-p-3 d4m-text-yellow-400 d4m-flex d4m-items-center d4m-gap-2">
                  <div className="d4m-w-3 d4m-h-3 d4m-rounded-full d4m-bg-yellow-400 d4m-animate-pulse"></div>
                  <span className="d4m-text-sm d4m-font-medium">
                    Establishing connection to transcription server... Please
                    wait.
                  </span>
                </div>
              )}

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

              {!isRecording &&
                initializationStatus &&
                initializationStatus.includes("final") && (
                  <div className="d4m-mb-4 d4m-bg-blue-500 d4m-bg-opacity-10 d4m-border d4m-border-blue-500 d4m-border-opacity-20 d4m-rounded-md d4m-p-3 d4m-text-blue-400 d4m-flex d4m-items-center d4m-gap-2">
                    <div className="d4m-w-3 d4m-h-3 d4m-rounded-full d4m-bg-blue-400 d4m-animate-pulse"></div>
                    <span className="d4m-text-sm d4m-font-medium">
                      Finalizing transcription... Please wait while we process
                      the last segments.
                    </span>
                  </div>
                )}

              {diarizationResults.length > 0 ? (
                <div className="d4m-space-y-4 d4m-mt-2">
                  {(() => {
                    const combinedResults: DiarizationSegment[] = [];
                    let currentSpeaker: string | null = null;
                    let currentSegment: DiarizationSegment | null = null;

                    diarizationResults.forEach((segment, idx) => {
                      if (
                        currentSpeaker === null ||
                        segment.speaker !== currentSpeaker
                      ) {
                        if (currentSegment !== null) {
                          combinedResults.push(currentSegment);
                        }

                        currentSpeaker = segment.speaker;
                        currentSegment = { ...segment };
                      } else if (currentSegment) {
                        currentSegment.text += " " + segment.text;
                        if (segment.end !== undefined) {
                          currentSegment.end = segment.end;
                        }
                      }

                      if (
                        idx === diarizationResults.length - 1 &&
                        currentSegment
                      ) {
                        combinedResults.push(currentSegment);
                      }
                    });

                    return combinedResults;
                  })().map((segment, index) => {
                    const speakerName = speakerNames[segment.speaker]
                      ? speakerNames[segment.speaker]
                      : segment.speaker && segment.speaker.includes("SPEAKER_")
                      ? `Speaker ${segment.speaker.replace("SPEAKER_", "")}`
                      : `Speaker ${segment.speaker || "Unknown"}`;

                    const speakerColor = getSpeakerColor(
                      segment.speaker || "unknown",
                      accentColor
                    );
                    return (
                      <div
                        key={segment.segmentIndex ?? index}
                        className="d4m-flex d4m-flex-col d4m-gap-2 d4m-border-b d4m-border-gray-700/30 d4m-pb-4 d4m-pt-1 d4m-last:border-0 d4m-rounded d4m-hover:bg-gray-800/30 d4m-transition-colors"
                      >
                        <div className="d4m-flex d4m-items-center d4m-justify-between">
                          <div className="d4m-flex d4m-items-center d4m-gap-2">
                            <div
                              className={`d4m-flex d4m-items-center d4m-gap-2 d4m-px-3 d4m-py-1.5 d4m-rounded-full d4m-text-xs d4m-font-medium ${speakerColor} d4m-shadow-sm`}
                            >
                              <span>{speakerName}</span>
                              <button
                                onClick={() => {
                                  if (!segment.speaker) {
                                    alert(
                                      "Cannot edit name for undefined speaker"
                                    );
                                    return;
                                  }
                                  const newName = prompt(
                                    `Enter name for ${speakerName}:`,
                                    speakerNames[segment.speaker] ||
                                      `Speaker ${segment.speaker || "Unknown"}`
                                  );
                                  if (
                                    newName !== null &&
                                    newName.trim() !== ""
                                  ) {
                                    handleSpeakerNameChange(
                                      segment.speaker,
                                      newName.trim()
                                    );
                                  }
                                }}
                                className="d4m-ml-1 d4m-opacity-60 hover:d4m-opacity-100 d4m-transition-opacity"
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

                          {segment.start !== undefined && (
                            <div className="d4m-text-xs d4m-text-gray-500 d4m-px-2 d4m-py-0.5 d4m-bg-gray-800 d4m-bg-opacity-50 d4m-rounded-full">
                              {Math.floor(segment.start / 60)}:
                              {(segment.start % 60).toFixed(0).padStart(2, "0")}
                            </div>
                          )}
                        </div>

                        <div className="d4m-text-sm d4m-pl-4">
                          {segment.text}
                        </div>
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
                    <div
                      className={`d4m-flex d4m-flex-col d4m-items-center d4m-gap-4 d4m-p-6 ${currentTheme.messageBubble} d4m-rounded-lg`}
                    >
                      <div
                        className={`d4m-text-${accentColor}-400 d4m-p-3 d4m-rounded-full d4m-bg-gray-800`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="22"></line>
                        </svg>
                      </div>
                      <div className="d4m-text-center">
                        <h4
                          className={`d4m-text-${accentColor}-400 d4m-font-semibold d4m-mb-2`}
                        >
                          Ready to Record
                        </h4>
                        <p className="d4m-text-gray-400 d4m-mb-1">
                          Start recording to see diarization results
                        </p>
                        <p className="d4m-text-gray-500 d4m-text-sm">
                          Click the microphone button on the left to begin
                        </p>
                      </div>
                      <div className="d4m-flex d4m-flex-col d4m-gap-2 d4m-mt-2 d4m-w-full d4m-max-w-sm">
                        <div
                          className={`d4m-flex d4m-items-center d4m-gap-2 d4m-text-xs ${currentTheme.suggestion} d4m-px-3 d4m-py-2`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          <span>
                            Automatically identifies different speakers
                          </span>
                        </div>
                        <div
                          className={`d4m-flex d4m-items-center d4m-gap-2 d4m-text-xs ${currentTheme.suggestion} d4m-px-3 d4m-py-2`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <span>
                            Transcribes audio in real-time with timestamps
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
