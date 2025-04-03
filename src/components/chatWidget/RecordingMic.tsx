import React, { useState } from "react";
import { Mic, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { TranscriptLine } from "../../hooks/useDeepgramLive";

interface RecordingMicProps {
  accentColor: string;
  textColor: string;
  onStop: () => void;
  transcript?: TranscriptLine[];
  tasks?: string[];
}

export const RecordingMic: React.FC<RecordingMicProps> = ({
  accentColor,
  textColor,
  onStop,
  transcript = [],
  tasks = [],
}) => {
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const toggleTranscript = () => setShowTranscript(!showTranscript);
  const toggleTasks = () => setShowTasks(!showTasks);

  return (
    <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-6 d4m-w-full d4m-h-full d4m-p-4 d4m-overflow-y-auto">
      {/* MIC BUTTON */}
      <div className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-h-40">
        <button
          type="button"
          onClick={onStop}
          className={`d4m-relative d4m-w-20 d4m-h-20 d4m-rounded-full d4m-bg-${accentColor}-500 d4m-text-white d4m-flex d4m-items-center d4m-justify-center d4m-shadow-lg d4m-transition-all d4m-duration-300 d4m-transform hover:d4m-scale-105 d4m-cursor-pointer focus:d4m-outline-none`}
        >
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-400 d4m-opacity-50 d4m-animate-mic-ripple`}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-300 d4m-opacity-40 d4m-animate-mic-ripple d4m-delay-200`}
          ></span>
          <span
            className={`d4m-absolute d4m-inset-0 d4m-rounded-full d4m-bg-${accentColor}-200 d4m-opacity-30 d4m-animate-mic-ripple d4m-delay-400`}
          ></span>
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
            Transcript
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
          <div className="d4m-max-h-48 d4m-overflow-y-auto d4m-bg-black/10 d4m-rounded-md d4m-p-3 d4m-text-sm d4m-space-y-1">
            {transcript.length ? (
              transcript.map((line, idx) => (
                <p key={idx} className={`${textColor}`}>
                  <strong className="d4m-text-xs d4m-text-gray-400 mr-1">
                    Speaker {line.speaker}:
                  </strong>
                  {line.text}
                </p>
              ))
            ) : (
              <p className="d4m-text-gray-400">Listening for speech...</p>
            )}
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
