import React from "react";
import { MessageSquare, Search, RefreshCw } from "lucide-react";
import ComponentHeader from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";

interface PreviousChatsPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

// Dummy data for previous chats
const dummyPreviousChats = [
  { id: 1, title: "Project Discussion", date: "Apr 24, 2025" },
  { id: 2, title: "Weekly Meeting", date: "Apr 22, 2025" },
  { id: 3, title: "Client Presentation", date: "Apr 20, 2025" },
  { id: 4, title: "Team Brainstorming", date: "Apr 18, 2025" },
  { id: 5, title: "Product Review", date: "Apr 15, 2025" },
];

export function PreviousChatsPage({
  theme,
  accentColor,
  mode,
}: PreviousChatsPageProps) {
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
        title="Previous Chats"
        activeTab="custom"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          // Toggle mode functionality would go here
          console.log("Toggle mode in Previous Chats page");
        }}
        additionalButtons={[
          {
            id: "search",
            icon: <Search size={18} />,
            label: "Search Chats",
            onClick: () => console.log("Search chats"),
            showForTabs: ["custom"],
          },
          {
            id: "refresh",
            icon: <RefreshCw size={18} />,
            label: "Refresh",
            onClick: () => console.log("Refresh chats"),
            showForTabs: ["custom"],
          },
        ]}
      />
      <div className="d4m-p-4">
        <div className="d4m-space-y-3">
          {dummyPreviousChats.map((chat) => (
            <div
              key={chat.id}
              className={`${currentTheme.messageBubble} d4m-p-3 d4m-cursor-pointer d4m-hover:bg-opacity-90 d4m-transition-colors`}
            >
              <div className="d4m-flex d4m-items-center d4m-gap-3">
                <div
                  className={`d4m-p-2 d4m-rounded-full d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400 ${currentTheme.avatar}`}
                >
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className={`d4m-font-medium ${textColor}`}>
                    {chat.title}
                  </h3>
                  <p className="d4m-text-xs d4m-text-gray-400">{chat.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PreviousChatsPage;
