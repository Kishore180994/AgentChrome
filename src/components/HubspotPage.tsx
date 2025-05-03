import React, { useState, useEffect } from "react";
import {
  Contact2,
  Building2,
  Briefcase,
  Ticket,
  Search,
  Upload,
  FileText,
  Tags,
  RefreshCw,
} from "lucide-react";
import ComponentHeader, {
  commonButtons,
  HeaderButtonOption,
} from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";
import { loadHubSpotConfig } from "../services/hubspot/api";

interface HubspotPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

type HubspotEntityType =
  | "contacts"
  | "companies"
  | "deals"
  | "tickets"
  | "lists";

export function HubspotPage({ theme, accentColor, mode }: HubspotPageProps) {
  const [activeEntity, setActiveEntity] =
    useState<HubspotEntityType>("contacts");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check if HubSpot API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const config = await loadHubSpotConfig();
        setHasApiKey(!!config?.apiKey);
      } catch (error) {
        console.error("Failed to check HubSpot API key:", error);
        setHasApiKey(false);
      }
    };

    checkApiKey();
  }, []);

  // Entity navigation options
  const entityOptions: Array<{
    id: HubspotEntityType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "contacts", label: "Contacts", icon: <Contact2 size={16} /> },
    { id: "companies", label: "Companies", icon: <Building2 size={16} /> },
    { id: "deals", label: "Deals", icon: <Briefcase size={16} /> },
    { id: "tickets", label: "Tickets", icon: <Ticket size={16} /> },
    { id: "lists", label: "Lists", icon: <Tags size={16} /> },
  ];

  // Custom buttons specific to the HubSpot page
  const hubspotButtons: HeaderButtonOption[] = [
    {
      ...commonButtons.search,
      onClick: () => {
        console.log(`Searching ${activeEntity}...`);
        // Search logic would go here
      },
    },
    {
      ...commonButtons.import,
      onClick: () => {
        console.log(`Importing ${activeEntity}...`);
        // Import logic would go here
      },
    },
    {
      ...commonButtons.export,
      onClick: () => {
        console.log(`Exporting ${activeEntity}...`);
        // Export logic would go here
      },
    },
    {
      ...commonButtons.refresh,
      onClick: () => {
        console.log(`Refreshing ${activeEntity}...`);
        setIsLoading(true);

        // Simulate fetching data
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      },
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

  return (
    <div
      className={`d4m-overflow-y-auto d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container}`}
    >
      <ComponentHeader
        title="HubSpot"
        subtitle={`${
          activeEntity.charAt(0).toUpperCase() + activeEntity.slice(1)
        }`}
        activeTab="hubspot"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          // Mode toggle logic would go here
          console.log("Toggle mode in HubSpot page");
        }}
        additionalButtons={hubspotButtons}
      />

      <div className="d4m-p-4">
        {!hasApiKey ? (
          // API Key Missing Notice
          <div className="d4m-text-center d4m-py-10 d4m-max-w-lg d4m-mx-auto">
            <div
              className={`d4m-p-6 d4m-rounded-lg d4m-bg-orange-500/10 d4m-border d4m-border-orange-500/30`}
            >
              <h3 className="d4m-text-orange-500 d4m-text-lg d4m-font-medium d4m-mb-2">
                HubSpot API Key Required
              </h3>
              <p className="d4m-text-gray-500 d4m-mb-4">
                To access your HubSpot data, please add your HubSpot Private App
                Access Token in the Settings page.
              </p>
              <button
                className={`d4m-px-4 d4m-py-2 d4m-bg-orange-500 d4m-text-white d4m-rounded-full d4m-text-sm hover:d4m-bg-orange-600 d4m-transition-colors`}
                onClick={() => {
                  console.log("Navigate to settings");
                  // Navigation logic would go here
                }}
              >
                Go to Settings
              </button>
            </div>
          </div>
        ) : (
          <div className={`d4m-space-y-6 ${textColorClass}`}>
            {/* Entity Navigation */}
            <div className="d4m-flex d4m-border-b d4m-border-gray-700 d4m-overflow-x-auto d4m-pb-1 d4m-no-scrollbar">
              {entityOptions.map((entity) => (
                <button
                  key={entity.id}
                  className={`d4m-px-4 d4m-py-2 d4m-flex d4m-items-center d4m-gap-2 d4m-transition-colors d4m-whitespace-nowrap ${
                    activeEntity === entity.id
                      ? `d4m-text-${accentColor}-500 d4m-border-b-2 d4m-border-${accentColor}-500 -d4m-mb-[1px]`
                      : "d4m-text-gray-500 hover:d4m-text-gray-300"
                  }`}
                  onClick={() => setActiveEntity(entity.id)}
                >
                  {entity.icon}
                  {entity.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              // Loading state
              <div className="d4m-flex d4m-justify-center d4m-py-20">
                <div className="d4m-animate-spin d4m-h-8 d4m-w-8 d4m-border-4 d4m-border-t-orange-500 d4m-rounded-full d4m-border-gray-700"></div>
              </div>
            ) : (
              // Entity content would go here
              <div className="d4m-text-center d4m-py-20">
                <p className="d4m-text-lg d4m-font-medium d4m-mb-2">
                  {activeEntity.charAt(0).toUpperCase() + activeEntity.slice(1)}{" "}
                  Management
                </p>
                <p className="d4m-text-gray-500">
                  This is a placeholder for the {activeEntity} interface.
                </p>
                <p className="d4m-text-gray-500 d4m-mt-2">
                  You can add, edit, and manage your HubSpot {activeEntity}{" "}
                  here.
                </p>
              </div>
            )}

            {/* Actions Footer */}
            <div className="d4m-flex d4m-justify-between d4m-pt-4">
              <button
                className={`d4m-px-4 d4m-py-2 d4m-bg-${accentColor}-500/20 d4m-text-${accentColor}-500 d4m-rounded-full d4m-text-sm d4m-flex d4m-items-center d4m-gap-2 hover:d4m-bg-${accentColor}-500/30 d4m-transition-colors`}
              >
                <FileText size={16} />
                Create New {activeEntity.slice(0, -1)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HubspotPage;
