import React, { useState, useEffect, useRef } from "react";
import { Mic, ChevronDown, ChevronUp, ListTodo } from "lucide-react";

// --- Web Speech API Setup ---
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
}
// --- End Web Speech API Setup ---

interface RecordingMicProps {
  accentColor: string;
  textColor: string;
  onStop: (finalTranscript: string) => void;
  tasks?: string[];
}

export const RecordingMic: React.FC<RecordingMicProps> = ({
  accentColor,
  textColor,
  onStop,
  tasks = [],
}) => {
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  // const [finalTranscript, setFinalTranscript] = useState(""); // Replaced by lines
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lines, setLines] = useState<string[]>([]); // State for transcript lines
  const [audioLevel, setAudioLevel] = useState(0); // State for audio level (0-1)

  const MAX_TRANSCRIPT_LINES = 10; // Keep more lines in state for smoother scroll history
  const transcriptContainerRef = useRef<HTMLDivElement>(null); // Ref for scrolling
  const recognitionRef = useRef(recognition);
  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const currentRecognition = recognitionRef.current;
    let localStream: MediaStream | null = null; // Keep track of the stream locally for cleanup

    // --- Web Speech API Logic ---
    const setupSpeechRecognition = () => {
      if (!currentRecognition) {
        console.error("Speech Recognition API not supported.");
        return;
      }
      currentRecognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim); // Update interim transcript
        if (final && final.trim()) {
          // Add the new final segment as a new line
          setLines((prevLines) => {
            const newLines = [...prevLines, final.trim()];
            // Keep the last MAX_TRANSCRIPT_LINES
            return newLines.slice(
              Math.max(newLines.length - MAX_TRANSCRIPT_LINES, 0)
            );
          });
          // We clear interim here because a final result just arrived
          setInterimTranscript("");
        }
      };
      currentRecognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };
      currentRecognition.onend = () => {
        console.log("Speech recognition ended.");
        // Don't automatically stop audio analysis here, wait for explicit stop button
      };
      try {
        currentRecognition.start();
        console.log("Speech recognition started.");
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    };
    // --- End Web Speech API Logic ---

    // --- Web Audio API Logic for Visualization ---
    const setupAudioAnalysis = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = localStream; // Store stream in ref for cleanup

        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Smaller FFT size for faster response
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(localStream);
        sourceRef.current = source;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Simple average calculation for volume level
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // Normalize the level (0-1), you might need to adjust the divisor (255)
          const normalizedLevel = Math.min(average / 128, 1); // Adjust divisor for sensitivity
          setAudioLevel(normalizedLevel);

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel(); // Start the animation loop
        console.log("Audio analysis started.");
      } catch (err) {
        console.error("Error setting up audio analysis:", err);
        // Handle microphone permission errors specifically if needed
      }
    };
    // --- End Web Audio API Logic ---

    // Start both APIs
    setupSpeechRecognition();
    setupAudioAnalysis();

    // --- Cleanup Function ---
    return () => {
      console.log("Cleaning up RecordingMic...");
      // Stop Speech Recognition
      if (currentRecognition) {
        try {
          currentRecognition.stop();
          console.log("Speech recognition stopped on cleanup.");
          currentRecognition.onresult = null;
          currentRecognition.onerror = null;
          currentRecognition.onend = null;
        } catch (e) {
          console.error("Error stopping speech recognition on cleanup:", e);
        }
      }

      // Stop Audio Analysis Animation Loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log("Audio analysis animation stopped.");
      }

      // Disconnect Web Audio Nodes
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
        console.log("Audio source disconnected.");
      }
      analyserRef.current = null; // No need to disconnect analyser explicitly

      // Close Audio Context
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current
          .close()
          .then(() => {
            console.log("Audio context closed.");
            audioContextRef.current = null;
          })
          .catch((e) => console.error("Error closing audio context:", e));
      } else {
        audioContextRef.current = null;
      }

      // Stop Media Stream Tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log(`Media stream track stopped: ${track.kind}`);
        });
        streamRef.current = null;
      } else if (localStream) {
        // Fallback if streamRef wasn't set but localStream was acquired
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Media stream track stopped (fallback): ${track.kind}`);
        });
      }
    };
    // Run effect only once on mount
    // Run effect only once on mount
  }, []);

  // Reintroduce smooth scrolling effect
  useEffect(() => {
    if (transcriptContainerRef.current) {
      // Scroll smoothly to the bottom
      transcriptContainerRef.current.scrollTo({
        top: transcriptContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [lines, interimTranscript]); // Scroll when lines or interim changes

  const handleStop = () => {
    // The cleanup function in useEffect handles stopping everything
    const fullTranscript = lines.join(" ") + " " + interimTranscript; // Combine lines for final output
    onStop(fullTranscript.trim()); // Call the parent's onStop
    // Note: The component will unmount after this, triggering the cleanup
  };

  const toggleTranscript = () => setShowTranscript(!showTranscript);
  const toggleTasks = () => setShowTasks(!showTasks);

  // Calculate dynamic styles based on audioLevel
  const baseScale = 1;
  const maxScaleAddition = 0.4; // Max scale increase (e.g., 1.0 + 0.4 = 1.4)
  const baseOpacity = 0.3;
  const maxOpacityAddition = 0.4; // Max opacity increase (e.g., 0.3 + 0.4 = 0.7)

  const rippleStyle1 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition * 0.6})`, // Less sensitive ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition * 0.6,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out", // Smooth transitions
  };
  const rippleStyle2 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition * 0.8})`, // Medium ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition * 0.8,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
  };
  const rippleStyle3 = {
    transform: `scale(${baseScale + audioLevel * maxScaleAddition})`, // Most sensitive ripple
    opacity: baseOpacity + audioLevel * maxOpacityAddition,
    transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
  };

  return (
    <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-6 d4m-w-full d4m-h-full d4m-p-4 d4m-overflow-y-auto">
      {/* MIC BUTTON */}
      <div className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-h-40">
        <button
          type="button"
          onClick={handleStop}
          className={`d4m-relative d4m-w-20 d4m-h-20 d4m-rounded-full d4m-bg-${accentColor}-500 d4m-text-white d4m-flex d4m-items-center d4m-justify-center d4m-shadow-lg d4m-transition-all d4m-duration-300 d4m-transform hover:d4m-scale-105 d4m-cursor-pointer focus:d4m-outline-none`}
        >
          {/* Ripple/Glow Animations - Removed d4m-animate-mic-ripple, added inline styles */}
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-400`}
            style={rippleStyle1}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-300`}
            style={rippleStyle2}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-200`}
            style={rippleStyle3}
          ></span>
          {/* Keep the glow separate */}
          <div
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-border-4 d4m-border-${accentColor}-300 d4m-opacity-70 d4m-animate-mic-glow`}
          ></div>
          <Mic className="d4m-w-8 d4m-h-8 d4m-relative d4m-z-10 d4m-animate-mic-bounce" />
        </button>
      </div>

      {/* TRANSCRIPT SECTION */}
      <div className="d4m-w-full">
        <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-2">
          <h2 className={`d4m-text-md d4m-font-bold ${textColor}`}>
            Live Transcript
          </h2>
          <button onClick={toggleTranscript}>
            {showTranscript ? (
              <ChevronUp className="d4m-w-4 d4m-h-4" />
            ) : (
              <ChevronDown className="d4m-w-4 d4m-h-4" />
            )}
          </button>
        </div>
        {showTranscript && (
          <div
            ref={transcriptContainerRef}
            className="
              d4m-h-28 /* Height 7rem */
              d4m-overflow-hidden d4m-relative /* Removed flex alignment */
              d4m-rounded-md d4m-p-2 /* Base padding */
              d4m-bg-gradient-to-b d4m-from-gray-700/70 d4m-via-gray-800/80 d4m-to-gray-900/90
              d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/20
            "
            style={
              {
                // Mask: Gentle fades top and bottom, wide clear center
                "--mask-gradient":
                  "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                maskImage: "var(--mask-gradient)",
                WebkitMaskImage: "var(--mask-gradient)",
                // Removed explicit paddingTop/paddingBottom for centering
              } as React.CSSProperties
            }
          >
            {/* Inner div for the actual content */}
            <div className="d4m-w-full d4m-space-y-1">
              {/* Placeholder */}
              {lines.length === 0 && !interimTranscript && (
                <p className="d4m-text-sm d4m-text-gray-500 d4m-italic d4m-text-center">
                  Listening...
                </p>
              )}

              {/* Finalized Lines */}
              {lines.map((line, index) => {
                const isLastFinalized = index === lines.length - 1;
                // Opacity based on position relative to the end (newest)
                const lineDistanceFromEnd = lines.length - 1 - index;
                // Make the last line fully visible, fade others quickly
                const opacity = isLastFinalized
                  ? 1
                  : Math.max(0, 1 - lineDistanceFromEnd * 0.4);

                return (
                  <p
                    key={index}
                    className={`
                      d4m-text-sm d4m-text-center d4m-transition-opacity d4m-duration-300 ease-in-out /* Consistent text-sm */
                      ${
                        isLastFinalized
                          ? "d4m-text-blue-300 d4m-font-medium" // Last final line is blue and medium weight
                          : "d4m-text-gray-300" // Older lines are gray
                      }
                    `}
                    style={{ opacity: opacity }}
                  >
                    {line}
                  </p>
                );
              })}

              {/* Interim Transcript (appears below the last finalized line) */}
              {interimTranscript && (
                <p className="d4m-text-sm d4m-text-blue-200/70 d4m-text-center">
                  {" "}
                  {/* Consistent text-sm */}
                  {interimTranscript}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TASKS SECTION */}
      <div className="d4m-w-full">
        <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-2">
          <h2 className={`d4m-text-md d4m-font-bold ${textColor}`}>
            Action Items
          </h2>
          <button onClick={toggleTasks}>
            {showTasks ? (
              <ChevronUp className="d4m-w-4 d4m-h-4" />
            ) : (
              <ChevronDown className="d4m-w-4 d4m-h-4" />
            )}
          </button>
        </div>
        {showTasks && (
          <ul className="d4m-list-disc d4m-pl-5 d4m-space-y-1 d4m-text-sm">
            {tasks.length ? (
              tasks.map((task, idx) => (
                <li key={idx} className={`${textColor}`}>
                  {task}
                </li>
              ))
            ) : (
              <li className="d4m-text-gray-400">No tasks identified yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
