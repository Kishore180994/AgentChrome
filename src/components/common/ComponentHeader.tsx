import React, { ReactNode } from "react";
import {
  Plus,
  Settings,
  ChevronLeft,
  Download,
  Upload,
  RefreshCw,
  Search,
  Moon,
  Sun,
} from "lucide-react";

// Types for tabs and button options
export type TabOption =
  | "default"
  | "chatWidget"
  | "settings"
  | "hubspot"
  | "tasks"
  | "analytics"
  | "custom";

export interface HeaderButtonOption {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  showForTabs: TabOption[];
}

interface ComponentHeaderProps {
  title?: string;
  subtitle?: string;
  activeTab: TabOption;
  mode: "light" | "dark";
  onModeToggle: () => void;
  accentColor: string;
  additionalButtons?: HeaderButtonOption[];
  showBackButton?: boolean;
  onBackClick?: () => void;
  hubspotMode?: boolean;
  toggleHubspotMode?: () => void;
  toggleD4MMode?: () => void;
  d4mAccentColor?: string;
  customHeaderElement?: ReactNode;
}

/**
 * A reusable header component for all sections of the application
 * Supports dynamic buttons based on the active tab
 */
export const ComponentHeader: React.FC<ComponentHeaderProps> = ({
  title,
  subtitle,
  activeTab,
  mode,
  onModeToggle,
  accentColor,
  additionalButtons = [],
  showBackButton = false,
  onBackClick,
  hubspotMode = false,
  toggleHubspotMode,
  toggleD4MMode,
  d4mAccentColor = "rose",
  customHeaderElement,
}) => {
  // Filter buttons to show only those applicable to the current active tab
  const visibleButtons = additionalButtons.filter(
    (button) =>
      button.showForTabs.includes(activeTab) ||
      button.showForTabs.includes("default")
  );

  return (
    <div
      className={`d4m-flex d4m-justify-between d4m-items-center d4m-px-3 d4m-py-2 d4m-gap-3 d4m-relative d4m-z-30 d4m-flex-shrink-0 d4m-border-b ${
        mode === "light" ? "d4m-border-black/10" : "d4m-border-white/10"
      }`}
    >
      {/* Left Section with Title and Back Button */}
      <div className="d4m-flex d4m-items-center d4m-gap-2">
        {showBackButton && (
          <button
            onClick={onBackClick}
            className={`d4m-p-1.5 d4m-rounded-full ${
              mode === "light"
                ? "d4m-text-gray-600 hover:d4m-bg-black/5"
                : "d4m-text-gray-300 hover:d4m-bg-white/10"
            } d4m-transition-colors`}
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Light/Dark Mode Toggle Button */}
        <button
          onClick={onModeToggle}
          className={`d4m-p-1.5 d4m-rounded-full ${
            mode === "light"
              ? "d4m-text-gray-600 hover:d4m-bg-black/5"
              : "d4m-text-gray-300 hover:d4m-bg-white/10"
          } d4m-transition-colors`}
          title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        >
          {mode === "light" ? (
            // Moon icon for light mode (switch to dark)
            <Moon size={18} />
          ) : (
            // Sun icon for dark mode (switch to light)
            <Sun size={18} />
          )}
        </button>

        {/* Title display if provided */}
        {title && (
          <div className="d4m-flex d4m-flex-col">
            <h2
              className={`d4m-font-medium ${
                mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={`d4m-text-xs ${
                  mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custom element slot (takes precedence over other elements if provided) */}
      {customHeaderElement && (
        <div className="d4m-flex-1 d4m-mx-2">{customHeaderElement}</div>
      )}

      {/* Right-side controls group */}
      <div className="d4m-flex d4m-items-center d4m-gap-3">
        {/* Additional Dynamic Buttons based on active tab */}
        {visibleButtons.map((button) => (
          <button
            key={button.id}
            onClick={button.onClick}
            className={`d4m-p-1.5 d4m-rounded-full ${
              mode === "light"
                ? "d4m-text-gray-600 hover:d4m-bg-black/5"
                : "d4m-text-gray-300 hover:d4m-bg-white/10"
            } d4m-transition-colors`}
            title={button.label}
            aria-label={button.label}
          >
            {button.icon}
          </button>
        ))}

        {/* Mode Selector Capsule (Only shown if toggleHubspotMode and toggleD4MMode are provided) */}
        {toggleHubspotMode && toggleD4MMode && (
          <div
            className={`d4m-relative d4m-flex d4m-items-center d4m-rounded-full d4m-p-0.5 d4m-overflow-hidden d4m-border ${
              mode === "light"
                ? "d4m-bg-gray-200 d4m-border-gray-300"
                : "d4m-bg-gray-700 d4m-border-gray-600"
            }`}
          >
            {/* Animated background pill */}
            <div
              className={`d4m-absolute d4m-top-0.5 d4m-bottom-0.5 d4m-rounded-full d4m-transition-all d4m-duration-300 d4m-ease-in-out ${
                hubspotMode
                  ? "d4m-bg-white dark:d4m-bg-gray-900" // Selected pill background
                  : accentColor === "white"
                  ? "d4m-bg-orange-500"
                  : `d4m-bg-${accentColor}-500` // Use orange if D4M is white, else accent
              }`}
              style={{
                left: !hubspotMode ? "2px" : "calc(50%)", // Adjusted for cleaner look
                width: "calc(50% - 2px)", // Adjusted for cleaner look
                height: "calc(100% - 4px)", // Take up full height minus padding
              }}
              aria-hidden="true"
            ></div>

            {/* D4M Mode Button */}
            <button
              onClick={toggleD4MMode}
              className={`d4m-relative d4m-z-10 d4m-flex d4m-items-center d4m-justify-center d4m-px-3 d4m-py-0.5 d4m-rounded-full d4m-transition-colors d4m-duration-300 d4m-w-1/2 ${
                !hubspotMode
                  ? mode === "light"
                    ? "d4m-text-white"
                    : "d4m-text-white"
                  : mode === "light"
                  ? "d4m-text-gray-500"
                  : "d4m-text-gray-400"
              }`}
              title="D4M Mode"
              aria-pressed={!hubspotMode}
            >
              <img
                src="/icons/icon48.png"
                alt="D4M"
                className="d4m-w-5 d4m-h-5"
              />
            </button>

            {/* HubSpot Mode Button */}
            <button
              onClick={toggleHubspotMode}
              className={`d4m-relative d4m-z-10 d4m-flex d4m-items-center d4m-justify-center d4m-px-3 d4m-py-0.5 d4m-rounded-full d4m-transition-colors d4m-duration-300 d4m-w-1/2 ${
                hubspotMode
                  ? mode === "light"
                    ? "d4m-text-orange-600"
                    : "d4m-text-orange-400" // Text color when selected (Orange)
                  : mode === "light"
                  ? "d4m-text-gray-500"
                  : "d4m-text-gray-400" // Text color when not selected
              }`}
              title="Hubspot Mode"
              aria-pressed={hubspotMode}
            >
              <img
                src="/icons/hubspot/hubspot48.png"
                alt="Hubspot"
                className="d4m-w-5 d4m-h-5"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Predefined button configurations that can be imported and used
export const commonButtons: Record<string, HeaderButtonOption> = {
  newChat: {
    id: "newChat",
    icon: <Plus size={18} />,
    label: "New Chat",
    onClick: () => console.log("New Chat clicked - override this"),
    showForTabs: ["chatWidget"],
  },
  settings: {
    id: "settings",
    icon: <Settings size={18} />,
    label: "Settings",
    onClick: () => console.log("Settings clicked - override this"),
    showForTabs: ["default", "chatWidget", "hubspot", "settings"],
  },
  refresh: {
    id: "refresh",
    icon: <RefreshCw size={18} />,
    label: "Refresh",
    onClick: () => console.log("Refresh clicked - override this"),
    showForTabs: ["hubspot", "analytics", "tasks"],
  },
  search: {
    id: "search",
    icon: <Search size={18} />,
    label: "Search",
    onClick: () => console.log("Search clicked - override this"),
    showForTabs: ["chatWidget", "hubspot", "tasks"],
  },
  export: {
    id: "export",
    icon: <Download size={18} />,
    label: "Export",
    onClick: () => console.log("Export clicked - override this"),
    showForTabs: ["analytics", "hubspot"],
  },
  import: {
    id: "import",
    icon: <Upload size={18} />,
    label: "Import",
    onClick: () => console.log("Import clicked - override this"),
    showForTabs: ["hubspot", "settings"],
  },
};

export default ComponentHeader;
