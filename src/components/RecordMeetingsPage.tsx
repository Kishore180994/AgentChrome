import React from "react";
import { Download } from "lucide-react";
import ComponentHeader from "./common/ComponentHeader";
import { RecordingMic } from "./chatWidget/RecordingMic";
import { AccentColor, themeStyles } from "../utils/themes";

interface RecordMeetingsPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

export function RecordMeetingsPage({
  theme,
  accentColor,
  mode,
}: RecordMeetingsPageProps) {
  // Get theme styles
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";

  return (
    <div className="d4m-flex d4m-flex-col d4m-h-full">
      <ComponentHeader
        title="Record Meeting"
        subtitle="Capture audio and transcribe"
        activeTab="custom"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          console.log("Toggle mode in Record Meetings page");
        }}
        additionalButtons={[
          {
            id: "downloadRecording",
            icon: <Download size={18} />,
            label: "Download Recording",
            onClick: () => console.log("Download recording"),
            showForTabs: ["custom"],
          },
        ]}
      />
      <div className="d4m-flex-1 d4m-overflow-hidden">
        <RecordingMic
          accentColor={accentColor}
          textColor={textColor}
          mode={mode}
          theme={theme}
        />
      </div>
    </div>
  );
}

export default RecordMeetingsPage;
