import React from "react";
import { AccentColor } from "../../utils/themes";

interface WelcomeScreenProps {
  hubspotMode: boolean;
  hasHubspotApiKey: boolean;
  mode: "light" | "dark";
  accentColor: AccentColor;
  textColor: string;
  currentTheme: any; // We receive the computed theme directly from ChatWidget
  handleSuggestionClick: (suggestion: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  hubspotMode,
  hasHubspotApiKey,
  mode,
  accentColor,
  textColor,
  currentTheme,
  handleSuggestionClick,
}) => {
  const welcomeSuggestions = hubspotMode
    ? [
        "Create contact 'Jane Doe'",
        "Find company 'example.com'",
        "List my open deals",
        "Add note to contact 'jane@...",
      ]
    : [
        "Summarize this page",
        "Search Google for 'AI news'",
        "Open twitter.com",
        "Extract main points",
      ];

  return (
    <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-text-center d4m-p-6 d4m-animate-fade-in d4m-h-full d4m-text-gray-500 dark:d4m-text-gray-400">
      {/* Logo Display */}
      <div className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-mb-6 d4m-mt-2">
        {hubspotMode ? (
          <div className="d4m-relative d4m-flex d4m-items-center">
            <div className="d4m-relative d4m-z-20 d4m-transition-all d4m-duration-300 d4m-transform hover:d4m-scale-110">
              <img
                src="/icons/icon128.png"
                alt="D4M"
                className="d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-drop-shadow-lg"
              />
            </div>
            <div
              className={`d4m-relative d4m-z-10 d4m-rounded-full d4m-bg-gradient-to-br d4m-from-orange-400 d4m-to-orange-600 d4m-flex d4m-items-center d4m-justify-center d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-shadow-lg d4m-ml-[-30px] md:d4m-ml-[-35px] d4m-transform hover:d4m-scale-110 d4m-transition-transform d4m-duration-300 hover:d4m-rotate-3`}
              style={{
                animation: "pulseAndShine 3s infinite alternate ease-in-out",
              }}
            >
              <img
                src="/icons/hubspot/hubspot128.png"
                alt="Hubspot"
                className="d4m-w-12 h-12 md:d4m-w-16 md:d4m-h-16 d4m-opacity-95 hover:d4m-opacity-100 d4m-transition-opacity d4m-duration-300"
              />
            </div>
          </div>
        ) : (
          <img
            src="/icons/icon128.png"
            alt="Agent Logo"
            className="d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-mb-4 d4m-opacity-80"
          />
        )}
      </div>
      {/* Welcome Text */}
      <h2 className={`d4m-text-lg d4m-font-semibold ${textColor} d4m-mb-2`}>
        Welcome!
      </h2>
      {/* HubSpot API Key Warning */}
      {hubspotMode && !hasHubspotApiKey && (
        <div className="d4m-flex d4m-flex-col d4m-items-center d4m-text-center d4m-my-4 d4m-max-w-xs">
          <div className="d4m-p-4 d4m-bg-red-500/10 dark:d4m-bg-red-500/20 d4m-border d4m-border-red-500/30 dark:d4m-border-red-500/50 d4m-rounded-lg">
            <p className="d4m-text-red-600 dark:d4m-text-red-400 d4m-font-medium d4m-mb-2">
              HubSpot API Key Required
            </p>
            <p className="d4m-text-sm d4m-text-gray-600 dark:d4m-text-gray-300">
              Please add your HubSpot Private App token in Settings to use
              HubSpot features.
            </p>
          </div>
        </div>
      )}
      {!(hubspotMode && !hasHubspotApiKey) && (
        <>
          <p
            className={`d4m-text-sm ${
              mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
            } d4m-mb-5`}
          >
            How can I assist you today?
          </p>
          <p
            className={`d4m-text-xs d4m-font-medium ${
              mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
            } d4m-mb-3`}
          >
            Try an example:
          </p>
          <div className="d4m-flex d4m-flex-wrap d4m-gap-2 d4m-justify-center d4m-max-w-md">
            {welcomeSuggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`d4m-text-xs ${
                  currentTheme?.suggestion ||
                  "d4m-bg-gray-200 d4m-text-gray-700"
                } d4m-px-3 d4m-py-1 hover:d4m-opacity-80 d4m-transition-opacity d4m-rounded-full ${
                  mode === "light"
                    ? "d4m-bg-gray-100 d4m-text-gray-700"
                    : "d4m-bg-gray-700 d4m-text-gray-200"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WelcomeScreen;
