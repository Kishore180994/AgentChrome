import React from "react";
import {
  AlertTriangle,
  XOctagon,
  Wifi,
  Lock,
  Clock,
  Slash,
} from "lucide-react";

interface HubspotErrorCardProps {
  errorType: string;
  message?: string;
  details?: string;
  status?: number;
  mode?: "light" | "dark";
  accentColor?: string;
}

// Map of error types to icons and default messages
const errorConfig: Record<
  string,
  { icon: React.ElementType; title: string; defaultMessage: string }
> = {
  authentication: {
    icon: Lock,
    title: "Authentication Error",
    defaultMessage:
      "Unable to authenticate with HubSpot. Please check your API key or access token in Settings.",
  },
  permissions: {
    icon: Slash,
    title: "Permissions Error",
    defaultMessage:
      "Your HubSpot Private App is missing required scopes. Please update the app's permissions.",
  },
  rate_limit: {
    icon: Clock,
    title: "Rate Limit Exceeded",
    defaultMessage: "HubSpot API rate limit exceeded. Please try again later.",
  },
  network: {
    icon: Wifi,
    title: "Network Error",
    defaultMessage:
      "Unable to connect to HubSpot. Please check your internet connection.",
  },
  not_found: {
    icon: AlertTriangle,
    title: "Resource Not Found",
    defaultMessage: "The requested HubSpot resource was not found.",
  },
  validation: {
    icon: XOctagon,
    title: "Validation Error",
    defaultMessage:
      "Your request contains invalid data. Please check and try again.",
  },
  general: {
    icon: AlertTriangle,
    title: "HubSpot Error",
    defaultMessage: "An error occurred while processing your HubSpot request.",
  },
};

const HubspotErrorCard: React.FC<HubspotErrorCardProps> = ({
  errorType,
  message,
  details,
  status,
  mode = "dark",
  accentColor = "red",
}) => {
  // Get configuration for this error type (or use general if not found)
  const config = errorConfig[errorType] || errorConfig.general;
  const Icon = config.icon;
  const errorMessage = message || config.defaultMessage;

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
            ? "d4m-bg-red-500"
            : `d4m-bg-${accentColor}-500`
        }`}
      >
        <div className="d4m-rounded-full d4m-bg-white d4m-w-8 d4m-h-8 d4m-flex d4m-items-center d4m-justify-center d4m-mr-3">
          <Icon
            className={`d4m-w-5 d4m-h-5 ${
              accentColor === "white"
                ? "d4m-text-red-500"
                : `d4m-text-${accentColor}-500`
            }`}
          />
        </div>
        <div>
          <h3 className="d4m-text-white d4m-font-semibold d4m-text-lg">
            {config.title}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div
        className={`d4m-px-4 d4m-py-3 ${
          mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
        }`}
      >
        <div className="d4m-mb-2">
          <p className="d4m-text-base">{errorMessage}</p>
          {details && (
            <details className="d4m-mt-2">
              <summary className="d4m-text-xs d4m-text-gray-400 d4m-cursor-pointer">
                View technical details
              </summary>
              <pre
                className={`d4m-mt-1 d4m-px-2 d4m-py-1 d4m-rounded d4m-text-xs d4m-overflow-auto ${
                  mode === "light"
                    ? "d4m-bg-gray-100 d4m-text-gray-700"
                    : "d4m-bg-gray-700 d4m-text-gray-300"
                }`}
                style={{ maxHeight: "100px" }}
              >
                {details}
              </pre>
            </details>
          )}
        </div>

        {/* Help text */}
        <div className="d4m-mt-3 d4m-pt-2 d4m-border-t d4m-text-xs d4m-opacity-70">
          <span
            className={`${
              mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
            }`}
          >
            {errorType === "authentication"
              ? "This can be resolved by checking your HubSpot API key in Settings."
              : errorType === "permissions"
              ? "Your HubSpot Private App may need updated scopes to perform this action."
              : errorType === "rate_limit"
              ? "HubSpot limits the number of API requests. Please wait a moment before trying again."
              : errorType === "network"
              ? "Check your internet connection and try again."
              : "If this issue persists, please contact support."}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HubspotErrorCard;
