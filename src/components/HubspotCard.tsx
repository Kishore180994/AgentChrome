import React from "react";
import {
  Check,
  User,
  Building,
  ShoppingBag,
  Ticket,
  CheckSquare,
} from "lucide-react";

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

// Entity icons mapping
const entityIcons = {
  contact: User,
  company: Building,
  deal: ShoppingBag,
  ticket: Ticket,
  task: CheckSquare,
  default: Check,
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

// Helper function to format dates
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
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

  // Get the appropriate icon
  const EntityIcon =
    entityIcons[entityType as keyof typeof entityIcons] || entityIcons.default;

  // Get ID from data
  const id = data?.id || "";

  return (
    <div
      className={`d4m-rounded-xl d4m-overflow-hidden d4m-shadow-lg d4m-border ${
        mode === "light"
          ? "d4m-border-gray-200 d4m-bg-white d4m-shadow-gray-200/60"
          : "d4m-border-gray-700 d4m-bg-gray-800 d4m-shadow-black/20"
      } d4m-mb-4 d4m-transition-all d4m-duration-300 hover:d4m-shadow-xl`}
    >
      {/* Header */}
      <div
        className={`d4m-flex d4m-items-center d4m-px-5 d4m-py-4 d4m-border-b ${
          mode === "light" ? "d4m-border-gray-200" : "d4m-border-gray-700"
        } ${
          accentColor === "white"
            ? "d4m-bg-gradient-to-r d4m-from-orange-500 d4m-to-orange-400"
            : `d4m-bg-gradient-to-r d4m-from-${accentColor}-600 d4m-to-${accentColor}-500`
        }`}
      >
        <div className="d4m-rounded-full d4m-bg-white/95 d4m-w-10 d4m-h-10 d4m-flex d4m-items-center d4m-justify-center d4m-mr-4 d4m-shadow-md">
          <EntityIcon
            className={`d4m-w-5 d4m-h-5 ${
              accentColor === "white"
                ? "d4m-text-orange-500"
                : `d4m-text-${accentColor}-500`
            }`}
          />
        </div>
        <div>
          <h3 className="d4m-text-white d4m-font-bold d4m-text-lg d4m-drop-shadow-sm">
            {type}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div
        className={`d4m-px-5 d4m-py-4 d4m-grid d4m-grid-cols-1 d4m-gap-3 ${
          mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
        }`}
      >
        {relevantProps.map((prop) => {
          if (!properties[prop]) return null;

          // Format values based on property type
          let displayValue = properties[prop];
          if (prop === "amount" && !isNaN(Number(properties[prop]))) {
            displayValue = `$${Number(properties[prop]).toLocaleString()}`;
          } else if (prop.includes("date") || prop.includes("_date_")) {
            displayValue = formatDate(properties[prop]);
          }

          return (
            <div key={prop} className="d4m-mb-1 d4m-flex d4m-flex-col">
              <div
                className={`d4m-text-xs d4m-font-semibold d4m-uppercase d4m-tracking-wide ${
                  mode === "light"
                    ? `d4m-text-${
                        accentColor === "white" ? "orange" : accentColor
                      }-600`
                    : `d4m-text-${
                        accentColor === "white" ? "orange" : accentColor
                      }-400`
                }`}
              >
                {formatLabel(prop)}
              </div>
              <div
                className={`d4m-font-medium d4m-mt-0.5 ${
                  mode === "light" ? "d4m-text-gray-900" : "d4m-text-gray-100"
                }`}
              >
                {displayValue}
              </div>
            </div>
          );
        })}

        {/* Always show ID if available */}
        {id && (
          <div className="d4m-mt-3 d4m-pt-3 d4m-border-t d4m-text-xs d4m-opacity-80">
            <span
              className={`d4m-flex d4m-items-center d4m-gap-1 ${
                mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="d4m-w-3 d4m-h-3 d4m-opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span className="d4m-ml-1">{id}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubspotCard;
