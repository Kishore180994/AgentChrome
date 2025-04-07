import { useEffect, useRef, useState } from "react";

export interface TranscriptLine {
  text: string;
  speaker?: string | number;
}

interface UseDeepgramLiveOptions {
  apiKey: string;
  onTranscript: (line: TranscriptLine) => void;
}

export const useDeepgramLive = ({
  apiKey,
  onTranscript,
}: UseDeepgramLiveOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const connectWebSocket = () => {
    const url = `wss://api.deepgram.com/v1/listen?punctuate=true&language=en&diarize=true`;
    const socket = new WebSocket(`${url}&access_token=${apiKey}`);

    socket.onopen = () => {
      setIsConnected(true);
      console.log("🧠 Deepgram WebSocket connected");
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error("❌ Failed to parse Deepgram message:", event.data);
        return;
      }

      const transcript = data.channel?.alternatives?.[0];
      if (!transcript?.words?.length) return;

      const speaker = transcript.words[0]?.speaker;
      const text = transcript.transcript;

      if (text.trim().length > 0) {
        onTranscript({ speaker, text });
      }
    };

    socket.onerror = (err) => {
      console.error("🛑 WebSocket error:", err);
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log("🔌 Deepgram WebSocket closed");
    };

    wsRef.current = socket;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      connectWebSocket();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(250); // send chunks every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error("🎙️ Microphone access error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());

    wsRef.current?.close();
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return {
    isConnected,
    isRecording,
    startRecording,
    stopRecording,
  };
};
