import React from "react";
import {
  AlertTriangle,
  XOctagon,
  Wifi,
  Lock,
  Clock,
  Slash,
  HelpCircle,
  AlarmClock,
  XCircle,
  FileSearch,
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
  {
    icon: React.ElementType;
    title: string;
    defaultMessage: string;
    helpText: string;
    bgColor: string;
  }
> = {
  authentication: {
    icon: Lock,
    title: "Authentication Error",
    defaultMessage:
      "Unable to authenticate with HubSpot. Please check your API key or access token in Settings.",
    helpText:
      "This can be resolved by checking your HubSpot API key in Settings.",
    bgColor: "red",
  },
  permissions: {
    icon: Slash,
    title: "Permissions Error",
    defaultMessage:
      "Your HubSpot Private App is missing required scopes. Please update the app's permissions.",
    helpText:
      "Your HubSpot Private App may need updated scopes to perform this action.",
    bgColor: "amber",
  },
  rate_limit: {
    icon: AlarmClock,
    title: "Rate Limit Exceeded",
    defaultMessage: "HubSpot API rate limit exceeded. Please try again later.",
    helpText:
      "HubSpot limits the number of API requests. Please wait a moment before trying again.",
    bgColor: "amber",
  },
  network: {
    icon: Wifi,
    title: "Network Error",
    defaultMessage:
      "Unable to connect to HubSpot. Please check your internet connection.",
    helpText: "Check your internet connection and try again.",
    bgColor: "red",
  },
  not_found: {
    icon: FileSearch,
    title: "Resource Not Found",
    defaultMessage: "The requested HubSpot resource was not found.",
    helpText: "The item you're looking for doesn't exist or has been deleted.",
    bgColor: "amber",
  },
  validation: {
    icon: XCircle,
    title: "Validation Error",
    defaultMessage:
      "Your request contains invalid data. Please check and try again.",
    helpText:
      "Please review your input and correct any errors before trying again.",
    bgColor: "red",
  },
  general: {
    icon: AlertTriangle,
    title: "HubSpot Error",
    defaultMessage: "An error occurred while processing your HubSpot request.",
    helpText: "If this issue persists, please contact support.",
    bgColor: "red",
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
  const statusText = status ? ` (Status: ${status})` : "";

  // Error banner color
  const bannerColor = config.bgColor || "red";

  return (
    <div className="d4m-flex d4m-flex-col d4m-gap-2">
      {/* Error banner */}
      <div
        className={`d4m-rounded-lg d4m-flex d4m-items-center d4m-gap-3 d4m-px-4 d4m-py-3 d4m-mb-1
          d4m-bg-${bannerColor}-500/10
          ${
            mode === "light"
              ? `d4m-border d4m-border-${bannerColor}-200`
              : `d4m-border d4m-border-${bannerColor}-900/30`
          }
        `}
      >
        <div
          className={`d4m-rounded-full d4m-p-1.5 d4m-bg-${bannerColor}-500 d4m-text-white`}
        >
          <AlertTriangle size={14} />
        </div>
        <p
          className={`d4m-text-sm d4m-font-medium ${
            mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
          }`}
        >
          {config.title}
          {statusText}
        </p>
      </div>

      {/* Main card */}
      <div
        className={`d4m-rounded-xl d4m-overflow-hidden d4m-shadow-lg d4m-border ${
          mode === "light"
            ? "d4m-border-gray-200 d4m-bg-white d4m-shadow-gray-200/60"
            : "d4m-border-gray-700 d4m-bg-gray-800 d4m-shadow-black/20"
        } d4m-mb-2 d4m-transition-all d4m-duration-300`}
      >
        {/* Header */}
        <div
          className={`d4m-flex d4m-items-center d4m-px-5 d4m-py-4 d4m-border-b ${
            mode === "light" ? "d4m-border-gray-200" : "d4m-border-gray-700"
          } ${`d4m-bg-gradient-to-r d4m-from-${bannerColor}-600 d4m-to-${bannerColor}-500`}`}
        >
          <div className="d4m-rounded-full d4m-bg-white/95 d4m-w-10 d4m-h-10 d4m-flex d4m-items-center d4m-justify-center d4m-mr-4 d4m-shadow-md">
            <Icon className={`d4m-w-5 d4m-h-5 d4m-text-${bannerColor}-500`} />
          </div>
          <div>
            <h3 className="d4m-text-white d4m-font-bold d4m-text-lg d4m-drop-shadow-sm">
              {config.title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div
          className={`d4m-px-5 d4m-py-4 ${
            mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200"
          }`}
        >
          <div className="d4m-mb-3">
            <p className="d4m-text-base d4m-font-medium">{errorMessage}</p>

            {details && (
              <details className="d4m-mt-4 d4m-group">
                <summary
                  className={`d4m-flex d4m-items-center d4m-gap-2 d4m-text-xs ${
                    mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
                  } d4m-cursor-pointer d4m-select-none hover:d4m-text-${bannerColor}-500 d4m-transition-colors`}
                >
                  <span className="d4m-flex d4m-items-center d4m-gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="d4m-transition-transform d4m-group-open:d4m-rotate-90"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    Technical details
                  </span>
                </summary>
                <div className="d4m-mt-2 d4m-pl-5">
                  <pre
                    className={`d4m-mt-1 d4m-px-3 d4m-py-2 d4m-rounded-md d4m-text-xs d4m-overflow-auto ${
                      mode === "light"
                        ? "d4m-bg-gray-100 d4m-text-gray-700"
                        : "d4m-bg-gray-700 d4m-text-gray-300"
                    }`}
                    style={{ maxHeight: "200px" }}
                  >
                    {details}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Help text */}
          <div
            className={`d4m-mt-3 d4m-pt-4 d4m-border-t ${
              mode === "light" ? "d4m-border-gray-200" : "d4m-border-gray-700"
            } d4m-flex d4m-items-start d4m-gap-2`}
          >
            <HelpCircle
              className={`d4m-w-5 d4m-h-5 d4m-flex-shrink-0 d4m-mt-0.5 ${
                mode === "light"
                  ? `d4m-text-${bannerColor}-600`
                  : `d4m-text-${bannerColor}-400`
              }`}
            />

            <span
              className={`d4m-text-sm ${
                mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"
              }`}
            >
              {config.helpText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HubspotErrorCard;
