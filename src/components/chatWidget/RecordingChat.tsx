import React, { useState } from "react";
import { Send } from "lucide-react";
import { AccentColor, themeStyles } from "../../utils/themes";

interface Recording {
  id: number;
  title: string;
  duration: string;
  date: string;
}

interface RecordingChatProps {
  recording: Recording;
  onClose: () => void;
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

const RecordingChat: React.FC<RecordingChatProps> = ({
  recording,
  onClose,
  theme,
  accentColor,
  mode,
}) => {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "ai" }[]
  >([]);
  const [input, setInput] = useState("");

  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: "user" }]);
      // Placeholder for AI response
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: `AI response for recording ${recording.title}: You said "${input}"`,
            sender: "ai",
          },
        ]);
      }, 500);
      setInput("");
    }
  };

  return (
    <div
      className={`d4m-flex d4m-flex-col d4m-h-full ${currentTheme.container} d4m-rounded-lg d4m-shadow-md`}
    >
      <div
        className={`d4m-flex d4m-justify-between d4m-items-center d4m-p-2 ${currentTheme.messageBubble} d4m-rounded-t-lg`}
      >
        <div>
          <h5 className={`d4m-text-sm d4m-font-semibold ${textColor}`}>
            {recording.title}
          </h5>
          <p className="d4m-text-xs d4m-text-gray-500">
            {recording.date} - {recording.duration}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`d4m-text-gray-600 hover:d4m-text-gray-800 ${textColor}`}
        >
          &times;
        </button>
      </div>
      <div className="d4m-flex-1 d4m-p-2 d4m-overflow-y-auto d4m-space-y-2">
        <div className={`d4m-text-center d4m-italic d4m-mb-4 ${textColor}`}>
          Now you can chat with this meeting.
        </div>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`d4m-p-2 d4m-rounded-lg ${
              message.sender === "user"
                ? `d4m-bg-${accentColor}-500 d4m-text-white d4m-self-end`
                : `${currentTheme.messageBubble} ${textColor} d4m-self-start`
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className={`d4m-p-2 ${borderColor} d4m-border-t d4m-flex`}>
        <input
          type="text"
          className={`d4m-flex-1 d4m-p-2 d4m-rounded-l-lg ${borderColor} d4m-border focus:d4m-outline-none ${currentTheme.textarea}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSendMessage}
          className={`d4m-p-2 d4m-bg-${accentColor}-500 d4m-text-white d4m-rounded-r-lg hover:d4m-bg-${accentColor}-600`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default RecordingChat;
