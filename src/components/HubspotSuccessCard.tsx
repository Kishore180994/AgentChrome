// src/components/HubspotSuccessCard.tsx
import React from "react";
import HubspotCard from "./HubspotCard";
import { HubSpotExecutionResult } from "../services/ai/interfaces";
import { AccentColor } from "../utils/themes";
import { Check, ArrowRight } from "lucide-react";

interface HubspotSuccessCardProps {
  result: HubSpotExecutionResult; // Expect the full result object, NOT a string
  mode?: "light" | "dark";
  accentColor?: AccentColor; // Use AccentColor type
  currentTheme?: any; // Or a more specific theme type if available
}

// Helper to format function names like "create_contact" to "Create Contact"
const formatFunctionName = (name: string | undefined): string => {
  if (!name) return "HubSpot Operation"; // Default title

  // First remove 'hubspot_' prefix if it exists
  let formattedName = name.replace(/^hubspot_/, "");

  return formattedName
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize each word
    .trim();
};

// Helper to get a friendly success message based on function name
const getFriendlySuccessMessage = (
  functionName: string | undefined,
  details: any
): string => {
  if (!functionName) return "Operation completed successfully";

  const lowerName = (functionName || "").toLowerCase();

  // Extract entity name or ID for more descriptive messages
  let entityName = "";
  if (details?.properties) {
    entityName =
      details.properties.name ||
      details.properties.firstname ||
      details.properties.dealname ||
      details.properties.subject ||
      "";

    if (entityName && details.properties.lastname) {
      entityName += " " + details.properties.lastname;
    }
  }

  const entityId = details?.id ? ` (ID: ${details.id})` : "";
  const entityDesc = entityName ? ` "${entityName}"${entityId}` : entityId;

  if (lowerName.includes("create")) {
    const entityType = lowerName
      .replace("create", "")
      .replace(/_/g, " ")
      .trim();
    return `Successfully created ${entityType}${entityDesc}`;
  } else if (lowerName.includes("update")) {
    const entityType = lowerName
      .replace("update", "")
      .replace(/_/g, " ")
      .trim();
    return `Successfully updated ${entityType}${entityDesc}`;
  } else if (lowerName.includes("get")) {
    const entityType = lowerName.replace("get", "").replace(/_/g, " ").trim();
    return `Successfully retrieved ${entityType}${entityDesc}`;
  } else if (lowerName.includes("delete")) {
    const entityType = lowerName
      .replace("delete", "")
      .replace(/_/g, " ")
      .trim();
    return `Successfully deleted ${entityType}${entityDesc}`;
  } else if (lowerName.includes("search")) {
    return `Search completed successfully`;
  } else if (lowerName.includes("associate")) {
    return `Records associated successfully`;
  }

  return "Operation completed successfully";
};

const HubspotSuccessCard: React.FC<HubspotSuccessCardProps> = ({
  result,
  mode = "dark",
  accentColor = "orange",
  currentTheme,
}) => {
  // Determine the title for the underlying HubspotCard component
  const cardType =
    formatFunctionName(result.functionName) || "HubSpot Action Complete";

  // Extract the main data payload from the result
  const cardData = result.details || {};

  // Generate a friendly success message
  const friendlySuccessMessage = getFriendlySuccessMessage(
    result.functionName,
    cardData
  );

  // If the theme is HubSpot, use 'orange'. Otherwise, use the D4M accent color.
  const displayAccentColor = accentColor === "white" ? "orange" : accentColor;

  return (
    <div className="d4m-flex d4m-flex-col d4m-gap-2">
      {/* Success banner */}
      <div
        className={`d4m-rounded-lg d4m-flex d4m-items-center d4m-gap-3 d4m-px-4 d4m-py-3 d4m-mb-1
          ${
            accentColor === "white"
              ? "d4m-bg-gradient-to-r d4m-from-green-500/10 d4m-to-emerald-500/10"
              : `d4m-bg-gradient-to-r d4m-from-${displayAccentColor}-500/10 d4m-to-${displayAccentColor}-600/10`
          }
          ${
            mode === "light"
              ? "d4m-border d4m-border-green-200"
              : "d4m-border d4m-border-green-800/30"
          }
        `}
      >
        <div
          className={`d4m-rounded-full d4m-p-1.5 d4m-bg-green-500 d4m-text-white`}
        >
          <Check size={14} />
        </div>
        <p
          className={`d4m-text-sm d4m-font-medium ${
            mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
          }`}
        >
          {friendlySuccessMessage}
        </p>
      </div>

      {/* Render the underlying HubspotCard which knows how to display the properties */}
      <HubspotCard
        type={cardType}
        data={cardData}
        mode={mode}
        accentColor={displayAccentColor}
        currentTheme={currentTheme}
      />

      {/* Add links to view in HubSpot if ID exists */}
      {cardData.id && (
        <div className={`d4m-flex d4m-justify-end d4m-mt-1`}>
          <a
            href={`https://app.hubspot.com/contacts/${cardData.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`d4m-inline-flex d4m-items-center d4m-gap-1 d4m-text-xs 
              ${
                accentColor === "white"
                  ? "d4m-text-orange-500 hover:d4m-text-orange-600"
                  : `d4m-text-${displayAccentColor}-500 hover:d4m-text-${displayAccentColor}-600`
              } 
              d4m-font-medium d4m-transition-colors`}
          >
            <span>View in HubSpot</span>
            <ArrowRight size={12} />
          </a>
        </div>
      )}
    </div>
  );
};

export default HubspotSuccessCard;
