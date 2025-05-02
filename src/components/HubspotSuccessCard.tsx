// src/components/HubspotSuccessCard.tsx
import React from "react";
import HubspotCard from "./HubspotCard"; // Assuming this renders the actual data display
import { HubSpotExecutionResult } from "../services/ai/interfaces";
import { AccentColor } from "../utils/themes";

interface HubspotSuccessCardProps {
  result: HubSpotExecutionResult; // Expect the full result object, NOT a string
  mode?: "light" | "dark";
  accentColor?: AccentColor; // Use AccentColor type
  currentTheme?: any; // Or a more specific theme type if available
}

// Helper to format function names like "create_contact" to "Create Contact"
// Handles potential undefined names.
const formatFunctionName = (name: string | undefined): string => {
  if (!name) return "HubSpot Operation"; // Default title
  return name
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
};

const HubspotSuccessCard: React.FC<HubspotSuccessCardProps> = ({
  result,
  mode = "dark",
  // Default to 'orange' for HubSpot context if not provided,
  // but ChatWidget will usually pass the correct color (white or D4M accent).
  accentColor = "orange",
  currentTheme,
}) => {
  // We receive the result object directly. No string parsing needed.

  // Determine the title for the underlying HubspotCard component.
  // Prefer functionName, fallback to action, fallback to result message, fallback to generic title.
  const cardType =
    formatFunctionName(result.functionName) || "HubSpot Action Complete";

  // Extract the main data payload from the result.
  const cardData = result.details || {};

  // Extract any top-level success message from the result.
  const successMessage = result.success;

  // Determine the accent color to pass to the underlying HubspotCard.
  // If the theme is HubSpot (accentColor='white'), use 'orange'. Otherwise, use the D4M accent color.
  const displayAccentColor = accentColor === "white" ? "orange" : accentColor;

  console.log("[HubspotSuccessCard] Rendering with:", {
    cardType,
    cardData,
    successMessage,
    displayAccentColor,
  });

  return (
    <div className="d4m-flex d4m-flex-col d4m-gap-1">
      {/* Render the underlying HubspotCard which knows how to display the properties */}
      <HubspotCard
        type={cardType}
        data={cardData}
        mode={mode}
        accentColor={displayAccentColor} // Pass the determined color
        currentTheme={currentTheme}
      />
      {/* Optionally display the top-level success message below the card if it exists */}
      {successMessage && ( // Avoid repeating title as message
        <p
          className={`d4m-text-xs ${
            mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
          } d4m-mt-1`}
        >
          {successMessage}
        </p>
      )}
    </div>
  );
};

export default HubspotSuccessCard;
