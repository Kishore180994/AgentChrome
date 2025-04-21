import React, { useState, useRef, useEffect } from "react";
import { Settings, X, LogOut, LogIn, User } from "lucide-react";
import { storage } from "../utils/storage";
import { AccentColor, themeStyles } from "../utils/themes";
import { useAuth } from "../contexts/AuthContext";

interface AppSettings {
  geminiKey: string;
  visionKey: string;
  openaiKey: string;
  aiProvider: "gemini" | "openai";
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdate: (settings: Partial<AppSettings>) => void;
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

export function SettingsModal({
  isOpen,
  onClose,
  onSettingsUpdate,
  theme,
  accentColor,
  mode,
}: SettingsModalProps) {
  const { user, loginWithGoogle, logout, isLoading } = useAuth();
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [aiProvider, setAiProvider] =
    useState<AppSettings["aiProvider"]>("gemini");
  const [selectedTheme, setSelectedTheme] =
    useState<AppSettings["theme"]>(theme);
  const [selectedAccentColor, setSelectedAccentColor] =
    useState<AppSettings["accentColor"]>(accentColor);
  const [selectedMode, setSelectedMode] = useState<AppSettings["mode"]>(mode);
  const modalRef = useRef<HTMLDivElement>(null);
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
        ]);
        setGeminiKey(settings.geminiKey || "");
        setOpenaiKey(settings.openaiKey || "");
        setAiProvider(settings.aiProvider || "gemini");
        setSelectedTheme(settings.theme || theme);
        setSelectedAccentColor(settings.accentColor || accentColor);
        setSelectedMode(settings.mode || mode);
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    if (isOpen) loadSettings();
  }, [isOpen, theme, accentColor, mode]);

  const saveSettings = async () => {
    try {
      const newSettings = {
        geminiKey,
        openaiKey,
        aiProvider,
        theme: selectedTheme,
        accentColor: selectedAccentColor,
        mode: selectedMode,
      };
      await storage.set(newSettings);
      onSettingsUpdate(newSettings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  if (!isOpen) return null;

  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <div
      className={`d4m-fixed d4m-inset-0 d4m-z-50 d4m-bg-black/50 d4m-backdrop-blur-sm d4m-flex d4m-items-center d4m-justify-center`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`d4m-relative d4m-rounded-2xl d4m-p-4 d4m-w-full d4m-max-w-md d4m-shadow-xl ${currentTheme.container}`}
      >
        <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-4">
          <h2
            className={`d4m-text-lg d4m-font-semibold d4m-flex d4m-items-center d4m-gap-2 d4m-text-${accentColor}-400`}
          >
            <Settings className="d4m-w-5 d4m-h-5" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className={`${textColor} d4m-hover:text-${accentColor}-400 d4m-transition-colors`}
          >
            <X className="d4m-w-5 d4m-h-5" />
          </button>
        </div>
        <div className="d4m-space-y-3 d4m-text-sm">
          {/* Authentication Section */}
          <div className="d4m-border-b d4m-border-gray-700 d4m-pb-3 d4m-mb-3">
            <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-2">
              <h3
                className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-flex d4m-items-center d4m-gap-1`}
              >
                <User className="d4m-w-4 d4m-h-4" />
                Account
              </h3>
              {user && "isGuest" in user ? (
                <span
                  className={`d4m-text-xs d4m-px-2 d4m-py-1 d4m-rounded-full d4m-bg-gray-700 ${textColor}`}
                >
                  Guest Mode
                </span>
              ) : user ? (
                <span
                  className={`d4m-text-xs d4m-px-2 d4m-py-1 d4m-rounded-full d4m-bg-${accentColor}-900/30 d4m-text-${accentColor}-400`}
                >
                  Signed In
                </span>
              ) : null}
            </div>

            {user && !("isGuest" in user) && (
              <div className="d4m-flex d4m-items-center d4m-gap-3 d4m-mb-3">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="d4m-w-10 d4m-h-10 d4m-rounded-full d4m-border d4m-border-gray-700"
                  />
                )}
                <div className="d4m-flex-1 d4m-min-w-0">
                  <p className={`d4m-font-medium ${textColor} d4m-truncate`}>
                    {user.name}
                  </p>
                  <p className="d4m-text-gray-500 d4m-text-xs d4m-truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            <div className="d4m-flex d4m-justify-end">
              {user && "isGuest" in user ? (
                <button
                  onClick={() => {
                    // First close the modal
                    onClose();
                    // Then logout to return to login page
                    logout();
                  }}
                  disabled={isLoading}
                  className={`d4m-text-white d4m-py-1.5 d4m-px-3 d4m-rounded-full d4m-text-xs d4m-flex d4m-items-center d4m-gap-1.5 ${
                    isLoading ? "d4m-opacity-70 d4m-cursor-not-allowed" : ""
                  } d4m-bg-blue-600 d4m-hover:bg-blue-700 d4m-transition-colors`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="d4m-animate-spin d4m-w-3 d4m-h-3"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="d4m-opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="d4m-opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="d4m-w-3 d4m-h-3" />
                      Sign in with Google
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={logout}
                  className={`d4m-text-white d4m-py-1.5 d4m-px-3 d4m-rounded-full d4m-text-xs d4m-flex d4m-items-center d4m-gap-1.5 d4m-bg-red-600 d4m-hover:bg-red-700 d4m-transition-colors`}
                >
                  <LogOut className="d4m-w-3 d4m-h-3" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
          <div className="d4m-flex d4m-items-center d4m-gap-2">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              AI Provider
            </label>
            <div className={`d4m-flex d4m-gap-3 ${textColor}`}>
              <label className="d4m-flex d4m-items-center d4m-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={aiProvider === "gemini"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as AppSettings["aiProvider"])
                  }
                  className={`d4m-accent-${accentColor}-600`}
                />
                Gemini
              </label>
              <label className="d4m-flex d4m-items-center d4m-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as AppSettings["aiProvider"])
                  }
                  className={`d4m-accent-${accentColor}-600`}
                />
                OpenAI
              </label>
            </div>
          </div>
          <div className="d4m-flex d4m-items-center d4m-gap-2">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              {aiProvider === "gemini" ? "Gemini Key" : "OpenAI Key"}
            </label>
            <input
              type="password"
              value={aiProvider === "gemini" ? geminiKey : openaiKey}
              onChange={(e) =>
                aiProvider === "gemini"
                  ? setGeminiKey(e.target.value)
                  : setOpenaiKey(e.target.value)
              }
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 ${textColor} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${
                currentTheme.textarea
              } d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 ${
                mode === "light"
                  ? "d4m-placeholder-gray-400"
                  : "d4m-placeholder-gray-500"
              } d4m-transition-all`}
              placeholder="API Key"
            />
          </div>
          <div className="d4m-flex d4m-items-center d4m-gap-2">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              Theme
            </label>
            <select
              value={selectedTheme}
              onChange={(e) =>
                setSelectedTheme(e.target.value as AppSettings["theme"])
              }
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColor} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              <option value="neumorphism">Neumorphism</option>
              <option value="glassmorphism">Glassmorphism</option>
              <option value="claymorphism">Claymorphism</option>
            </select>
          </div>
          <div className="d4m-flex d4m-items-center d4m-gap-2">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              Accent Color
            </label>
            <select
              value={selectedAccentColor}
              onChange={(e) =>
                setSelectedAccentColor(
                  e.target.value as AppSettings["accentColor"]
                )
              }
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColor} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              {ACCENT_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}{" "}
                  {/* Optional: Capitalize */}
                </option>
              ))}
            </select>
          </div>
          <div className="d4m-flex d4m-items-center d4m-gap-2">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) =>
                setSelectedMode(e.target.value as AppSettings["mode"])
              }
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColor} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="d4m-pt-3">
            <button
              onClick={saveSettings}
              className={`d4m-w-full d4m-text-white d4m-py-2 d4m-px-4 d4m-rounded-full ${currentTheme.sendButton.replace(
                "amber",
                accentColor
              )} d4m-hover:scale-105 d4m-transition-transform d4m-duration-200`}
            >
              Save Settings
            </button>
          </div>
        </div>
        <div
          className={`d4m-mt-3 d4m-text-xs ${
            mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
          }`}
        >
          <p>Get your API keys from:</p>
          <ul className="d4m-list-disc d4m-list-inside d4m-space-y-1 d4m-mt-1">
            <li>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className={`d4m-text-${accentColor}-400 d4m-hover:text-${accentColor}-300 d4m-underline`}
              >
                Google AI Studio (Gemini)
              </a>
            </li>
            <li>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className={`d4m-text-${accentColor}-400 d4m-hover:text-${accentColor}-300 d4m-underline`}
              >
                Google Cloud Console (Vision)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
