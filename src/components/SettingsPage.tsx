import React, { useState, useEffect } from "react";
import { User, LogOut, LogIn, Key } from "lucide-react";
import ComponentHeader, { commonButtons } from "./common/ComponentHeader";
import { storage } from "../utils/storage";
import { AccentColor, themeStyles } from "../utils/themes";
import { useAuth } from "../contexts/AuthContext";
import { HubSpotConfig, saveHubSpotConfig } from "../services/hubspot/api";

interface AppSettings {
  geminiKey: string;
  visionKey: string;
  openaiKey: string;
  aiProvider: "gemini" | "openai";
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
  hubspotConfig: HubSpotConfig;
}

interface SettingsPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
  onSettingsUpdate: (settings: Partial<AppSettings>) => void;
}

export function SettingsPage({
  theme,
  accentColor,
  mode,
  onSettingsUpdate,
}: SettingsPageProps) {
  const { user, loginWithGoogle, logout, isLoading } = useAuth();
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [aiProvider, setAiProvider] =
    useState<AppSettings["aiProvider"]>("gemini");
  const [selectedTheme, setSelectedTheme] =
    useState<AppSettings["theme"]>(theme);
  const [selectedAccentColor, setSelectedAccentColor] =
    useState<AppSettings["accentColor"]>(accentColor);
  const [selectedMode, setSelectedMode] = useState<AppSettings["mode"]>(mode);
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
          "hubspotConfig",
        ]);
        setGeminiKey(settings.geminiKey || "");
        setOpenaiKey(settings.openaiKey || "");
        setAiProvider(settings.aiProvider || "gemini");
        setSelectedTheme(settings.theme || theme);
        setSelectedAccentColor(settings.accentColor || accentColor);
        setSelectedMode(settings.mode || mode);
        setHubspotApiKey(settings.hubspotConfig?.apiKey || "");
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, [theme, accentColor, mode]);

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

      // Save HubSpot config separately
      await saveHubSpotConfig({ apiKey: hubspotApiKey });

      // Save to both storage APIs to ensure consistent behavior
      await storage.set(newSettings);

      // Also save directly to Chrome storage to ensure the ChatWidget picks up the changes
      await chrome.storage.local.set(newSettings);
      await chrome.storage.sync.set(newSettings);

      console.log("[SettingsPage] Saved settings:", newSettings);

      onSettingsUpdate(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Always use the current theme from our themes.ts file for consistency
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColorClass = currentTheme.container.includes("d4m-text-gray-800")
    ? "d4m-text-gray-800"
    : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <div
      className={`d4m-overflow-y-auto d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container}`}
    >
      <ComponentHeader
        title="Settings"
        activeTab="settings"
        mode={selectedMode}
        accentColor={selectedAccentColor}
        onModeToggle={() => {
          const newMode = selectedMode === "light" ? "dark" : "light";
          setSelectedMode(newMode);
        }}
        additionalButtons={[]}
      />

      <div className="d4m-p-4">
        <div className={`d4m-space-y-6 d4m-text-sm ${textColorClass}`}>
          {/* Authentication Section */}
          <div className={`d4m-border-b ${borderColor} d4m-pb-4 d4m-mb-4`}>
            <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-3">
              <h3
                className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-flex d4m-items-center d4m-gap-1`}
              >
                <User className="d4m-w-4 d4m-h-4" />
                Account
              </h3>
              {user && "isGuest" in user ? (
                <span
                  className={`d4m-text-xs d4m-px-2 d4m-py-1 d4m-rounded-full d4m-bg-gray-700 ${textColorClass}`}
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
                    className={`d4m-w-10 d4m-h-10 d4m-rounded-full d4m-border ${borderColor}`}
                  />
                )}
                <div className="d4m-flex-1 d4m-min-w-0">
                  <p
                    className={`d4m-font-medium ${textColorClass} d4m-truncate`}
                  >
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
                  onClick={loginWithGoogle}
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

          {/* API Keys Section */}
          <div className={`d4m-border-b ${borderColor} d4m-pb-4 d4m-mb-4`}>
            <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-3">
              <h3
                className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-flex d4m-items-center d4m-gap-1`}
              >
                <Key className="d4m-w-4 d4m-h-4" />
                API Keys
              </h3>
            </div>

            {/* HubSpot API Section */}
            <div className="d4m-mb-3">
              <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-2">
                <label
                  className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
                >
                  HubSpot Token
                </label>
                <input
                  type="password"
                  value={hubspotApiKey}
                  onChange={(e) => setHubspotApiKey(e.target.value)}
                  className={`d4m-flex-1 d4m-px-2 d4m-py-1 ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${
                    currentTheme.textarea
                  } d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 ${
                    mode === "light"
                      ? "d4m-placeholder-gray-400"
                      : "d4m-placeholder-gray-500"
                  } d4m-transition-all`}
                  placeholder="Private App Access Token"
                />
              </div>
              <div className="d4m-ml-24 d4m-text-xs d4m-text-amber-500 d4m-mt-1">
                Note: Enter your Private App Access Token. Create a private app
                in HubSpot with CRM scopes (contacts, companies, deals).
                <a
                  href="https://developers.hubspot.com/docs/api/private-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`d4m-ml-1 d4m-text-${accentColor}-400 d4m-hover:text-${accentColor}-300 d4m-underline`}
                >
                  Learn more
                </a>
              </div>
            </div>

            {/* AI Provider Keys */}
            <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-3">
              <label
                className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
              >
                Gemini Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className={`d4m-flex-1 d4m-px-2 d4m-py-1 ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${
                  currentTheme.textarea
                } d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 ${
                  mode === "light"
                    ? "d4m-placeholder-gray-400"
                    : "d4m-placeholder-gray-500"
                } d4m-transition-all`}
                placeholder="Gemini API Key"
              />
            </div>

            <div className="d4m-flex d4m-items-center d4m-gap-2">
              <label
                className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
              >
                OpenAI Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className={`d4m-flex-1 d4m-px-2 d4m-py-1 ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${
                  currentTheme.textarea
                } d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 ${
                  mode === "light"
                    ? "d4m-placeholder-gray-400"
                    : "d4m-placeholder-gray-500"
                } d4m-transition-all`}
                placeholder="OpenAI API Key"
              />
            </div>
          </div>

          {/* AI Provider Selection */}
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
            <label
              className={`d4m-font-medium d4m-text-${accentColor}-400 d4m-w-24`}
            >
              AI Provider
            </label>
            <div className={`d4m-flex d4m-gap-3 ${textColorClass}`}>
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

          {/* Theme */}
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
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
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              <option value="neumorphism">Neumorphism</option>
              <option value="glassmorphism">Glassmorphism</option>
              <option value="claymorphism">Claymorphism</option>
            </select>
          </div>

          {/* Accent Color */}
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
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
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              {ACCENT_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}{" "}
                </option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
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
              className={`d4m-flex-1 d4m-px-2 d4m-py-1 d4m-bg-transparent ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-transition-all`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Save Button */}
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

          {/* API Reference Links */}
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
              <li>
                <a
                  href="https://developers.hubspot.com/docs/api/private-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`d4m-text-${accentColor}-400 d4m-hover:text-${accentColor}-300 d4m-underline`}
                >
                  HubSpot Private Apps
                </a>{" "}
                <span className="d4m-text-gray-400">
                  (Create a private app with CRM scopes)
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
