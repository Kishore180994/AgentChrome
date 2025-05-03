import React from "react";
import { Mic, Search, RefreshCw, Download } from "lucide-react";
import ComponentHeader from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";

interface PreviousRecordingsPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

// Dummy data for previous recordings
const dummyPreviousRecordings = [
  { id: 1, title: "Team Standup", duration: "15:32", date: "Apr 23, 2025" },
  { id: 2, title: "Client Call", duration: "45:12", date: "Apr 21, 2025" },
  { id: 3, title: "Product Demo", duration: "28:45", date: "Apr 19, 2025" },
  { id: 4, title: "Strategy Meeting", duration: "52:18", date: "Apr 17, 2025" },
  { id: 5, title: "Feedback Session", duration: "33:27", date: "Apr 14, 2025" },
];

export function PreviousRecordingsPage({
  theme,
  accentColor,
  mode,
}: PreviousRecordingsPageProps) {
  // Always use the current theme from our themes.ts file for consistency
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <div
      className={`d4m-flex d4m-flex-col d4m-h-full ${currentTheme.container}`}
    >
      <ComponentHeader
        title="Previous Recordings"
        activeTab="custom"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          // Toggle mode functionality would go here
          console.log("Toggle mode in Previous Recordings page");
        }}
        additionalButtons={[
          {
            id: "search",
            icon: <Search size={18} />,
            label: "Search Recordings",
            onClick: () => console.log("Search recordings"),
            showForTabs: ["custom"],
          },
          {
            id: "refresh",
            icon: <RefreshCw size={18} />,
            label: "Refresh",
            onClick: () => console.log("Refresh recordings"),
            showForTabs: ["custom"],
          },
          {
            id: "download",
            icon: <Download size={18} />,
            label: "Export All",
            onClick: () => console.log("Export all recordings"),
            showForTabs: ["custom"],
          },
        ]}
      />
      <div className="d4m-p-4">
        <div className="d4m-space-y-3">
          {dummyPreviousRecordings.map((recording) => (
            <div
              key={recording.id}
              className={`${currentTheme.messageBubble} d4m-p-3 d4m-cursor-pointer d4m-hover:bg-opacity-90 d4m-transition-colors`}
            >
              <div className="d4m-flex d4m-items-center d4m-gap-3">
                <div
                  className={`d4m-p-2 d4m-rounded-full d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400 ${currentTheme.avatar}`}
                >
                  <Mic size={16} />
                </div>
                <div className="d4m-flex-1">
                  <h3 className={`d4m-font-medium ${textColor}`}>
                    {recording.title}
                  </h3>
                  <div className="d4m-flex d4m-justify-between d4m-text-xs d4m-text-gray-400">
                    <span>{recording.date}</span>
                    <span>{recording.duration}</span>
                  </div>
                </div>
                <button
                  className={`d4m-p-2 d4m-rounded-full d4m-bg-${accentColor}-500/10 d4m-text-${accentColor}-500 hover:d4m-bg-${accentColor}-500/20 d4m-transition-colors`}
                  title="Download Recording"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`Download recording: ${recording.title}`);
                  }}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PreviousRecordingsPage;
