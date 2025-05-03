import React, { useState } from "react";
import { Home, Bell, User, Settings, Zap } from "lucide-react";
import ComponentHeader, {
  commonButtons,
  HeaderButtonOption,
} from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";

interface HomePageExampleProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

export function HomePageExample({
  theme,
  accentColor,
  mode,
}: HomePageExampleProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Custom search component to demonstrate custom header element
  const searchComponent = (
    <div className={`d4m-relative d4m-w-full d4m-max-w-xl`}>
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`d4m-w-full d4m-px-4 d4m-py-2 d4m-pl-10 d4m-rounded-full d4m-bg-opacity-50 ${
          mode === "light"
            ? "d4m-bg-gray-100 d4m-text-gray-800 d4m-placeholder-gray-500"
            : "d4m-bg-gray-800 d4m-text-gray-200 d4m-placeholder-gray-400"
        } d4m-border d4m-border-gray-700 d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-${accentColor}-500`}
      />
      <div className="d4m-absolute d4m-left-3 d4m-top-1/2 d4m-transform -d4m-translate-y-1/2 d4m-text-gray-500">
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
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
    </div>
  );

  // Additional buttons for the home page
  const homeButtons: HeaderButtonOption[] = [
    {
      id: "notifications",
      icon: <Bell size={18} />,
      label: "Notifications",
      onClick: () => console.log("Notifications clicked"),
      showForTabs: ["default", "custom"],
    },
    {
      id: "profile",
      icon: <User size={18} />,
      label: "Profile",
      onClick: () => console.log("Profile clicked"),
      showForTabs: ["default", "custom"],
    },
    {
      ...commonButtons.settings,
      onClick: () => console.log("Settings clicked"),
    },
  ];

  // Always use the current theme from our themes.ts file for consistency
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColorClass = currentTheme.container.includes("d4m-text-gray-800")
    ? "d4m-text-gray-800"
    : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  // Define some mock links for the navigation
  const navLinks = [
    { icon: <Home size={16} />, label: "Dashboard", active: true },
    { icon: <Zap size={16} />, label: "Quick Actions", active: false },
    { icon: <Bell size={16} />, label: "Notifications", active: false },
    { icon: <User size={16} />, label: "Profile", active: false },
    { icon: <Settings size={16} />, label: "Settings", active: false },
  ];

  return (
    <div
      className={`d4m-overflow-y-auto d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container}`}
    >
      {/* Header with custom search component in the middle */}
      <ComponentHeader
        activeTab="custom"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          console.log("Toggle mode in Home page");
        }}
        additionalButtons={homeButtons}
        customHeaderElement={searchComponent}
      />

      <div className="d4m-p-4">
        <div className={`d4m-space-y-6 ${textColorClass}`}>
          {/* Welcome Section */}
          <div className="d4m-mb-6">
            <h1
              className={`d4m-text-2xl d4m-font-bold d4m-mb-2 d4m-text-${accentColor}-500`}
            >
              Welcome to ComponentHeader Demo
            </h1>
            <p className="d4m-text-gray-500">
              This example demonstrates how to use the ComponentHeader with a
              custom element in the middle.
            </p>
          </div>

          {/* Navigation Links */}
          <div
            className={`d4m-border ${borderColor} d4m-rounded-lg d4m-overflow-hidden`}
          >
            <div className="d4m-p-4">
              <h2
                className={`d4m-text-lg d4m-font-medium d4m-mb-4 d4m-text-${accentColor}-500`}
              >
                Navigation
              </h2>
              <div className="d4m-space-y-1">
                {navLinks.map((link, index) => (
                  <a
                    key={index}
                    href="#"
                    className={`d4m-flex d4m-items-center d4m-gap-3 d4m-p-2 d4m-rounded-md d4m-transition-colors ${
                      link.active
                        ? `d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-500`
                        : `d4m-text-gray-500 hover:d4m-bg-${accentColor}-500/10 hover:d4m-text-${accentColor}-400`
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Example Content */}
          <div
            className={`d4m-border ${borderColor} d4m-rounded-lg d4m-overflow-hidden d4m-mb-6`}
          >
            <div className="d4m-p-4">
              <h2
                className={`d4m-text-lg d4m-font-medium d4m-mb-4 d4m-text-${accentColor}-500`}
              >
                ComponentHeader Features
              </h2>
              <ul className="d4m-list-disc d4m-list-inside d4m-space-y-2 d4m-text-gray-500">
                <li>Dynamic buttons based on the active tab</li>
                <li>Light/dark mode toggle built-in</li>
                <li>Custom header elements via customHeaderElement prop</li>
                <li>HubSpot/D4M mode toggle support</li>
                <li>Back button support for navigation</li>
                <li>Responsive design with a clean, consistent look</li>
              </ul>
            </div>
          </div>

          {/* Search Results Section */}
          {searchQuery && (
            <div
              className={`d4m-border ${borderColor} d4m-rounded-lg d4m-overflow-hidden d4m-mb-6`}
            >
              <div className="d4m-p-4">
                <h2
                  className={`d4m-text-lg d4m-font-medium d4m-mb-4 d4m-text-${accentColor}-500`}
                >
                  Search Results for "{searchQuery}"
                </h2>
                <div className="d4m-text-gray-500 d4m-text-center d4m-py-10">
                  <p>This is a placeholder for search results.</p>
                  <p>
                    In a real application, results would be displayed here based
                    on the search query.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePageExample;
