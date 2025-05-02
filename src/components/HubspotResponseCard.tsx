import React from "react";
import HubspotCard from "./HubspotCard";
import HubspotErrorCard from "./HubspotErrorCard";

interface HubspotResponseCardProps {
  content: string;
  mode?: "light" | "dark";
  accentColor?: string;
  currentTheme?: any;
}

// Helper function to check if a string contains a Hubspot response
export const isHubspotResponse = (content: string): boolean => {
  // Check if it's a typical Hubspot response format
  if (!content) return false;

  // First, a simple text check for common Hubspot response prefixes
  if (
    content.includes("✅ Contact Created") ||
    content.includes("✅ Company Created") ||
    content.includes("✅ Deal Created") ||
    content.includes("✅ Task Created") ||
    content.includes("✅ Ticket Created") ||
    content.includes("✅ Email Sent") ||
    content.includes("✅ Search Complete") ||
    content.includes("✅ Navigating to HubSpot") ||
    content.includes("✅ HubSpot Operation Complete")
  ) {
    // Additionally look for JSON data
    return content.includes("{") && content.includes("}");
  }

  return false;
};

// Parse the text content to extract the title and data
const parseHubspotResponse = (content: string): { type: string; data: any } => {
  // Default values
  let type = "HubSpot Operation";
  let data = {};

  // Extract the title (first line usually)
  const titleMatch = content.match(/✅\s+([^\n]+)/);
  if (titleMatch && titleMatch[1]) {
    type = titleMatch[1].trim();
  }

  // Extract JSON data
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Error parsing HubSpot response JSON:", e);
      // Use a fallback approach - try to find properties in the data
      const propMatches = content.match(/"properties":\s*\{[\s\S]*?\}/);
      if (propMatches) {
        try {
          const propText = `{${propMatches[0]}}`;
          const parsed = JSON.parse(propText);
          data = { properties: parsed.properties };
        } catch (e) {
          console.error("Error parsing properties JSON:", e);
        }
      }
    }
  }

  return { type, data };
};

const HubspotResponseCard: React.FC<HubspotResponseCardProps> = ({
  content,
  mode = "dark",
  accentColor = "orange",
  currentTheme,
}) => {
  // Check if this is a valid Hubspot response
  if (!isHubspotResponse(content)) {
    // Check if it's an error response first
    if (content.includes("error") || content.includes("Error")) {
      // Try to extract error type and message
      let errorType = "general";
      let errorMessage = "Not a valid Hubspot response format";
      let errorDetails;

      // Look for error type markers in the content
      if (
        content.includes("authentication") ||
        content.includes("auth") ||
        content.includes("token")
      ) {
        errorType = "authentication";
      } else if (content.includes("permission") || content.includes("scope")) {
        errorType = "permissions";
      } else if (
        content.includes("rate limit") ||
        content.includes("too many requests")
      ) {
        errorType = "rate_limit";
      } else if (
        content.includes("network") ||
        content.includes("connection")
      ) {
        errorType = "network";
      } else if (content.includes("not found") || content.includes("404")) {
        errorType = "not_found";
      } else if (
        content.includes("invalid") ||
        content.includes("validation")
      ) {
        errorType = "validation";
      }

      // Try to extract a more specific error message
      const messageMatch = content.match(/error:?\s*([^\n\.]+)/i);
      if (messageMatch && messageMatch[1]) {
        errorMessage = messageMatch[1].trim();
      }

      // Include the full content as details for debugging
      errorDetails = content;

      // Try to extract status code from content (e.g., "409", "404", etc.)
      let errorStatus: number | undefined = undefined;
      const statusMatch = content.match(/(\d{3})/);
      if (statusMatch) {
        errorStatus = parseInt(statusMatch[1], 10);
      }

      return (
        <HubspotErrorCard
          errorType={errorType}
          message={errorMessage}
          details={errorDetails}
          status={errorStatus}
          mode={mode}
          accentColor="red"
        />
      );
    }

    // If not an error response, fall back to simple error message
    return (
      <div className="d4m-text-red-500">
        Error: Not a valid Hubspot response format
      </div>
    );
  }

  // Check if the response contains error information inside a JSON structure
  const { type, data } = parseHubspotResponse(content);

  // If the response has error properties inside the data object
  if (data && data.error) {
    return (
      <HubspotErrorCard
        errorType={data.errorType || "general"}
        message={data.error}
        details={data.details}
        status={data.status}
        mode={mode}
        accentColor="red"
      />
    );
  }

  // Render the HubspotCard with extracted data and pass the theme props
  return (
    <HubspotCard
      type={type}
      data={data}
      mode={mode}
      accentColor={accentColor}
      currentTheme={currentTheme}
    />
  );
};

export default HubspotResponseCard;
