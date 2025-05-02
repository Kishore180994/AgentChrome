import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  MessageSquare,
  Mic,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  Settings,
  LogIn,
} from "lucide-react";
import { SettingsPage } from "./SettingsPage";
import { ChatWidget } from "./chatWidget/ChatWidget";
import { RecordingMic } from "./chatWidget/RecordingMic";
import { storage } from "../utils/storage";
import { AccentColor, themeStyles } from "../utils/themes";

type PanelType =
  | "chat"
  | "recording"
  | "previousChats"
  | "previousRecordings"
  | "settings";

interface AppSettings {
  geminiKey: string;
  visionKey: string;
  openaiKey: string;
  aiProvider: "gemini" | "openai";
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
  hubspotConfig?: {
    apiKey: string;
  };
}

// Dummy data
const dummyPreviousChats = [
  { id: 1, title: "Project Discussion", date: "Apr 24, 2025" },
  { id: 2, title: "Weekly Meeting", date: "Apr 22, 2025" },
  { id: 3, title: "Client Presentation", date: "Apr 20, 2025" },
  { id: 4, title: "Team Brainstorming", date: "Apr 18, 2025" },
  { id: 5, title: "Product Review", date: "Apr 15, 2025" },
];

const dummyPreviousRecordings = [
  { id: 1, title: "Team Standup", duration: "15:32", date: "Apr 23, 2025" },
  { id: 2, title: "Client Call", duration: "45:12", date: "Apr 21, 2025" },
  { id: 3, title: "Product Demo", duration: "28:45", date: "Apr 19, 2025" },
  { id: 4, title: "Strategy Meeting", duration: "52:18", date: "Apr 17, 2025" },
  { id: 5, title: "Feedback Session", duration: "33:27", date: "Apr 14, 2025" },
];

export const MaterialSidebar: React.FC = () => {
  const { user, logout, loginWithGoogle, isLoading: authLoading } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelType>("chat");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Settings state
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [aiProvider, setAiProvider] =
    useState<AppSettings["aiProvider"]>("gemini");
  const [theme, setTheme] = useState<AppSettings["theme"]>("neumorphism");
  const [accentColor, setAccentColor] = useState<AccentColor>("rose");
  const [mode, setMode] = useState<AppSettings["mode"]>("dark");

  const ACCENT_COLORS: AccentColor[] = [
    "rose",
    "cyan",
    "fuchsia",
    "green",
    "sky",
    "amber",
    "violet",
    "emerald",
    "red",
    "blue",
    "black",
    "white",
  ];

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await storage.get([
          "geminiKey",
          "openaiKey",
          "aiProvider",
          "theme",
          "accentColor",
          "mode",
          "hubspotConfig",
        ]);
        setGeminiKey(settings.geminiKey || "");
        setOpenaiKey(settings.openaiKey || "");
        setAiProvider(settings.aiProvider || "gemini");
        setTheme(settings.theme || "neumorphism");
        setAccentColor(settings.accentColor || "rose");
        setMode(settings.mode || "dark");
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Save settings
  const saveSettings = async () => {
    try {
      const newSettings = {
        geminiKey,
        openaiKey,
        aiProvider,
        theme,
        accentColor,
        mode,
      };
      await storage.set(newSettings);
      setActivePanel("chat");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Handle panel selection
  const handlePanelSelect = (panel: PanelType) => {
    setActivePanel(panel);
    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  // User info
  const userName = user && !("isGuest" in user) ? user.name : "Guest Mode";
  const userAvatar = user && !("isGuest" in user) ? user.picture : null;

  // Theme styles
  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  // Panel content
  const renderPanelContent = () => {
    switch (activePanel) {
      case "chat":
        return <ChatWidget />;
      case "recording":
        return (
          <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-h-full d4m-p-4">
            <RecordingMic
              accentColor={accentColor}
              textColor={textColor}
              mode={mode}
              theme={theme}
            />
          </div>
        );
      case "previousChats":
        return (
          <div className={`d4m-p-4 ${currentTheme.container}`}>
            <h2
              className={`d4m-text-xl d4m-font-semibold d4m-mb-4 d4m-text-${accentColor}-400 d4m-flex d4m-items-center d4m-gap-2`}
            >
              <MessageSquare className="d4m-w-5 d4m-h-5" />
              Previous Chats
            </h2>
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
                      <p className="d4m-text-xs d4m-text-gray-400">
                        {chat.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "previousRecordings":
        return (
          <div className={`d4m-p-4 ${currentTheme.container}`}>
            <h2
              className={`d4m-text-xl d4m-font-semibold d4m-mb-4 d4m-text-${accentColor}-400 d4m-flex d4m-items-center d4m-gap-2`}
            >
              <Mic className="d4m-w-5 d4m-h-5" />
              Previous Recordings
            </h2>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "settings":
        return (
          <SettingsPage
            theme={theme}
            accentColor={accentColor}
            mode={mode}
            onSettingsUpdate={(settings) => {
              if (settings.theme) setTheme(settings.theme);
              if (settings.accentColor) setAccentColor(settings.accentColor);
              if (settings.mode) setMode(settings.mode);
              if (settings.aiProvider) setAiProvider(settings.aiProvider);
              if (settings.geminiKey) setGeminiKey(settings.geminiKey);
              if (settings.openaiKey) setOpenaiKey(settings.openaiKey);

              // Switch back to chat panel after saving
              setActivePanel("chat");
            }}
          />
        );
      default:
        return <div>Select a panel</div>;
    }
  };

  return (
    <div className="d4m-flex d4m-h-full d4m-bg-gray-900 d4m-text-gray-100">
      {/* Mobile menu button - only visible when sidebar is closed */}
      {!mobileMenuOpen && (
        <button
          className="d4m-md:hidden d4m-fixed d4m-top-2 d4m-left-4 d4m-z-50 d4m-p-1 d4m-rounded-full d4m-bg-rose-500 d4m-text-white d4m-shadow-lg"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={16} />
        </button>
      )}

      {/* Overlay to detect clicks outside the sidebar */}
      {mobileMenuOpen && (
        <div
          className="d4m-fixed d4m-inset-0 d4m-bg-black d4m-bg-opacity-50 d4m-z-30 d4m-md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          d4m-flex d4m-flex-col d4m-bg-gray-800 d4m-shadow-xl d4m-transition-all d4m-duration-300 d4m-ease-in-out
          ${collapsed ? "d4m-w-16" : "d4m-w-64"} 
          d4m-fixed d4m-md:relative d4m-h-full d4m-z-40
          ${
            mobileMenuOpen
              ? "d4m-translate-x-0"
              : "d4m-translate-x-[-100%] d4m-md:translate-x-0"
          }
        `}
      >
        {/* Sidebar header with close button for mobile */}
        <div className="d4m-flex d4m-flex-col d4m-items-center d4m-p-4 d4m-border-b d4m-border-gray-700 d4m-relative">
          {/* Close button - only visible on mobile when sidebar is open */}
          {mobileMenuOpen && (
            <button
              className="d4m-md:hidden d4m-absolute d4m-top-4 d4m-right-4 d4m-p-1 d4m-rounded-full d4m-bg-gray-700 d4m-text-gray-400 d4m-hover:text-white d4m-transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          {collapsed ? (
            <div className="d4m-flex d4m-justify-center d4m-w-full">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className={`d4m-w-8 d4m-h-8 d4m-rounded-full d4m-border-2 d4m-border-${accentColor}-500`}
                />
              ) : (
                <div
                  className={`d4m-w-8 d4m-h-8 d4m-rounded-full d4m-bg-${accentColor}-500/20 d4m-flex d4m-items-center d4m-justify-center d4m-text-${accentColor}-400`}
                >
                  <User size={16} />
                </div>
              )}
            </div>
          ) : (
            <div className="d4m-flex d4m-items-center d4m-w-full d4m-mb-2">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className={`d4m-w-10 d4m-h-10 d4m-rounded-full d4m-border-2 d4m-border-${accentColor}-500 d4m-mr-3`}
                />
              ) : (
                <div
                  className={`d4m-w-10 d4m-h-10 d4m-rounded-full d4m-bg-${accentColor}-500/20 d4m-flex d4m-items-center d4m-justify-center d4m-text-${accentColor}-400 d4m-mr-3`}
                >
                  <User size={20} />
                </div>
              )}
              <div className="d4m-flex-1 d4m-truncate">
                <h3 className="d4m-font-medium d4m-text-gray-200 d4m-truncate">
                  {userName}
                </h3>
                {user && !("isGuest" in user) && (
                  <p className="d4m-text-xs d4m-text-gray-400 d4m-truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar navigation */}
        <div className="d4m-flex-1 d4m-overflow-y-auto d4m-py-4">
          <nav className="d4m-space-y-1 d4m-px-2">
            <button
              onClick={() => handlePanelSelect("chat")}
              className={`d4m-flex d4m-items-center d4m-w-full d4m-p-3 d4m-rounded-lg d4m-transition-colors ${
                activePanel === "chat"
                  ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400`
                  : "d4m-text-gray-400 d4m-hover:bg-gray-700 d4m-hover:text-gray-200"
              }`}
            >
              <MessageSquare size={collapsed ? 20 : 18} />
              {!collapsed && <span className="d4m-ml-3">D4M Agent</span>}
            </button>

            <button
              onClick={() => handlePanelSelect("recording")}
              className={`d4m-flex d4m-items-center d4m-w-full d4m-p-3 d4m-rounded-lg d4m-transition-colors ${
                activePanel === "recording"
                  ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400`
                  : "d4m-text-gray-400 d4m-hover:bg-gray-700 d4m-hover:text-gray-200"
              }`}
            >
              <Mic size={collapsed ? 20 : 18} />
              {!collapsed && <span className="d4m-ml-3">Record Meeting</span>}
            </button>

            <button
              onClick={() => handlePanelSelect("previousChats")}
              className={`d4m-flex d4m-items-center d4m-w-full d4m-p-3 d4m-rounded-lg d4m-transition-colors ${
                activePanel === "previousChats"
                  ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400`
                  : "d4m-text-gray-400 d4m-hover:bg-gray-700 d4m-hover:text-gray-200"
              }`}
            >
              <History size={collapsed ? 20 : 18} />
              {!collapsed && <span className="d4m-ml-3">Previous Chats</span>}
            </button>

            <button
              onClick={() => handlePanelSelect("previousRecordings")}
              className={`d4m-flex d4m-items-center d4m-w-full d4m-p-3 d4m-rounded-lg d4m-transition-colors ${
                activePanel === "previousRecordings"
                  ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400`
                  : "d4m-text-gray-400 d4m-hover:bg-gray-700 d4m-hover:text-gray-200"
              }`}
            >
              <History size={collapsed ? 20 : 18} />
              {!collapsed && (
                <span className="d4m-ml-3">Previous Recordings</span>
              )}
            </button>

            <button
              onClick={() => handlePanelSelect("settings")}
              className={`d4m-flex d4m-items-center d4m-w-full d4m-p-3 d4m-rounded-lg d4m-transition-colors ${
                activePanel === "settings"
                  ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-400`
                  : "d4m-text-gray-400 d4m-hover:bg-gray-700 d4m-hover:text-gray-200"
              }`}
            >
              <Settings size={collapsed ? 20 : 18} />
              {!collapsed && <span className="d4m-ml-3">Settings</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className="d4m-p-4 d4m-border-t d4m-border-gray-700">
          <div className="d4m-flex d4m-items-center d4m-justify-between">
            <button
              onClick={logout}
              className="d4m-flex d4m-items-center d4m-text-gray-400 d4m-hover:text-rose-400 d4m-transition-colors"
            >
              <LogOut size={collapsed ? 20 : 18} />
              {!collapsed && <span className="d4m-ml-3">Log out</span>}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="d4m-p-1 d4m-rounded-full d4m-bg-gray-700 d4m-text-gray-400 d4m-hover:text-gray-200 d4m-transition-colors d4m-hidden d4m-md:block"
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="d4m-flex-1 d4m-h-full d4m-overflow-hidden d4m-flex d4m-flex-col">
        {renderPanelContent()}
      </div>
    </div>
  );
};
