import React from "react";
import { Check } from "lucide-react";

// Types for HubSpot card props
interface HubspotCardProps {
  type: string; // The type of operation (e.g., "Contact Created")
  data: any; // The HubSpot API response data
  mode?: "light" | "dark"; // Light or dark mode
  accentColor?: string; // Optional accent color
  currentTheme?: any; // Optional theme object
}

// Define which properties we want to display for each entity type
const displayProperties = {
  contact: ["firstname", "lastname", "email", "phone", "company", "jobtitle"],
  company: ["name", "domain", "industry", "phone", "city", "country"],
  deal: ["dealname", "amount", "pipeline", "dealstage", "closedate"],
  ticket: ["subject", "content", "priority"],
  task: [
    "hs_task_subject",
    "hs_task_body",
    "hs_task_due_date",
    "hs_task_priority",
  ],
};

// Helper function to format property labels
const formatLabel = (propName: string): string => {
  return propName
    .replace(/([A-Z])/g, " $1") // Insert a space before capital letters
    .replace(/(^|_)([a-z])/g, (_, g1, g2) => g1 + g2.toUpperCase()) // Capitalize first letter and after underscore
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^hs /, "") // Remove 'hs ' prefix
    .trim();
};

const HubspotCard: React.FC<HubspotCardProps> = ({
  type,
  data,
  mode = "dark",
  accentColor = "orange",
  currentTheme,
}) => {
  // Default to empty object if data or properties are undefined
  const properties = data?.properties || {};

  // Determine entity type from the operation type
  let entityType = "contact"; // Default to contact
  if (type.toLowerCase().includes("company")) entityType = "company";
  if (type.toLowerCase().includes("deal")) entityType = "deal";
  if (type.toLowerCase().includes("ticket")) entityType = "ticket";
  if (type.toLowerCase().includes("task")) entityType = "task";

  // Get relevant properties for this entity type
  const relevantProps =
    displayProperties[entityType as keyof typeof displayProperties];

  // Get ID from data
  const id = data?.id || "";

  return (
    <div
      className={`d4m-rounded-lg d4m-overflow-hidden d4m-shadow-md d4m-border ${
        mode === "light"
          ? "d4m-border-gray-200 d4m-bg-white"
          : "d4m-border-gray-700 d4m-bg-gray-800"
      } d4m-mb-4`}
    >
      {/* Header */}
      <div
        className={`d4m-flex d4m-items-center d4m-px-4 d4m-py-3 ${
          accentColor === "white"
            ? "d4m-bg-orange-500"
            : `d4m-bg-${accentColor}-500`
        }`}
      >
        <div className="d4m-rounded-full d4m-bg-white d4m-w-8 d4m-h-8 d4m-flex d4m-items-center d4m-justify-center d4m-mr-3">
          <Check
            className={`d4m-w-5 d4m-h-5 ${
              accentColor === "white"
                ? "d4m-text-orange-500"
                : `d4m-text-${accentColor}-500`
            }`}
          />
        </div>
        <div>
          <h3 className="d4m-text-white d4m-font-semibold d4m-text-lg">
            {type}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div
        className={`d4m-px-4 d4m-py-3 ${
          mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
        }`}
      >
        {relevantProps.map((prop) => {
          if (!properties[prop]) return null;
          return (
            <div key={prop} className="d4m-mb-2">
              <div
                className={`d4m-text-xs ${
                  mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
                }`}
              >
                {formatLabel(prop)}
              </div>
              <div className="d4m-font-medium">
                {prop === "amount" && !isNaN(Number(properties[prop]))
                  ? `$${Number(properties[prop]).toLocaleString()}`
                  : properties[prop]}
              </div>
            </div>
          );
        })}

        {/* Always show ID if available */}
        {id && (
          <div className="d4m-mt-3 d4m-pt-2 d4m-border-t d4m-text-xs d4m-opacity-70">
            <span
              className={`${
                mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
              }`}
            >
              ID: {id}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubspotCard;
