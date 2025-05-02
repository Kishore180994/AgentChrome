import React from "react";
import { AccentColor } from "../../utils/themes";
import Overlay from "./overlay";
import { FunctionDeclaration } from "@google/generative-ai";
import {
  FileText,
  Building,
  DollarSign,
  Ticket,
  CheckSquare,
  Clipboard,
  Calendar,
  Phone,
  Search,
  List,
  LayoutList,
  Link as LinkIcon,
  Info,
} from "lucide-react";

// Define the tool group type based on the hubspotModularTools export
type HubSpotToolGroup = {
  toolGroupName: string;
  functionDeclarations?: Array<FunctionDeclaration>;
};

interface HubspotModularOptionsProps {
  isVisible: boolean;
  mode: "light" | "dark";
  accentColor: AccentColor;
  selectedCommand: string | null;
  slashActive: boolean;
  slashFilter: string;
  hubspotSlashCommands: Array<{ command: string; description: string }>;
  hubspotModularTools: HubSpotToolGroup[];
}

// Map command names to their respective icons
const commandIconMap: Record<string, React.ReactNode> = {
  contact: <FileText size={18} />,
  company: <Building size={18} />,
  deal: <DollarSign size={18} />,
  ticket: <Ticket size={18} />,
  task: <CheckSquare size={18} />,
  note: <Clipboard size={18} />,
  meeting: <Calendar size={18} />,
  call: <Phone size={18} />,
  search: <Search size={18} />,
  list: <List size={18} />,
  workflow: <LayoutList size={18} />,
  associate: <LinkIcon size={18} />,
};

// Animation constants
const fadeInAnimation = "d4m-animate-fade-in";
const slideInAnimation = "d4m-animate-slide-in-bottom";
const itemAnimation = "d4m-transition-all d4m-duration-200";

const HubspotModularOptions: React.FC<HubspotModularOptionsProps> = ({
  isVisible,
  mode,
  accentColor,
  selectedCommand,
  slashActive,
  slashFilter,
  hubspotSlashCommands,
  hubspotModularTools,
}) => {
  // Format function name helper
  const formatFunctionName = (name: string): string => {
    if (name.startsWith("hubspot_")) {
      name = name.substring(8);
    }
    name = name.replace(/_/g, " ");
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  if (!isVisible) return null;

  // Colors for chips and highlights
  const accentColorHex =
    accentColor === "white" ? "#ea580c" : `var(--${accentColor}-500)`;
  const bgColorClass = mode === "light" ? "d4m-bg-gray-100" : "d4m-bg-gray-700";
  const hoverColorClass =
    mode === "light" ? "hover:d4m-bg-gray-200" : "hover:d4m-bg-gray-600";

  // Display options for a selected command
  if (selectedCommand) {
    const selectedToolGroup = hubspotModularTools.find(
      (tool) => tool.toolGroupName === selectedCommand
    ) as
      | {
          toolGroupName: string;
          functionDeclarations?: {
            name: string;
            description: string;
          }[];
        }
      | undefined;

    const icon = commandIconMap[selectedCommand] || <Info size={18} />;

    if (!selectedToolGroup || !selectedToolGroup.functionDeclarations) {
      return (
        <Overlay
          isVisible={true}
          mode={mode}
          accentColor={accentColor}
          padding="20px 24px"
          borderRadius="12px"
          centerContent={false}
          style={{
            margin: "12px",
            maxWidth: "96%",
            marginLeft: "auto",
            marginRight: "auto",
            pointerEvents: "auto",
          }}
          className={slideInAnimation}
        >
          <div>
            <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-3">
              {icon}
              <span className="d4m-text-base d4m-font-medium">
                No actions available for /{selectedCommand}
              </span>
            </div>
          </div>
        </Overlay>
      );
    }

    return (
      <Overlay
        isVisible={true}
        mode={mode}
        accentColor={accentColor}
        padding="20px 24px"
        borderRadius="12px"
        centerContent={false}
        style={{
          margin: "12px",
          maxWidth: "96%",
          marginLeft: "auto",
          marginRight: "auto",
          pointerEvents: "auto",
        }}
        className={slideInAnimation}
      >
        <div>
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
            {icon}
            <span className="d4m-text-lg d4m-font-medium">
              Available Actions for{" "}
              <span
                className="d4m-inline-flex d4m-items-center d4m-px-2 d4m-py-1 d4m-rounded-md d4m-bg-opacity-10"
                style={{
                  backgroundColor: `${accentColorHex}20`, // 20 is hex for 12% opacity
                  color: accentColorHex,
                }}
              >
                /{selectedCommand}
              </span>
            </span>
          </div>
          <div className="d4m-text-sm d4m-mb-4">
            Here are the /{selectedCommand} actions you can use:
          </div>

          <div className="d4m-flex d4m-flex-col d4m-gap-3">
            {selectedToolGroup.functionDeclarations.map((action, index) => (
              <div
                key={action.name}
                className={`d4m-flex d4m-items-start d4m-gap-3 ${fadeInAnimation}`}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div className={`d4m-p-2 d4m-rounded-full ${bgColorClass}`}>
                  {icon}
                </div>
                <div className="d4m-flex d4m-flex-col">
                  <span className="d4m-font-medium d4m-text-sm">
                    {formatFunctionName(action.name)}
                  </span>
                  <span
                    className={`d4m-text-xs ${
                      mode === "light"
                        ? "d4m-text-gray-600"
                        : "d4m-text-gray-300"
                    }`}
                  >
                    {action.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Overlay>
    );
  }

  // Display a simpler slash command prompt when no command is selected yet but slash is active
  if (slashActive) {
    return (
      <Overlay
        isVisible={true}
        mode={mode}
        accentColor={accentColor}
        padding="20px 24px"
        borderRadius="12px"
        centerContent={false}
        style={{
          margin: "12px",
          maxWidth: "96%",
          marginLeft: "auto",
          marginRight: "auto",
          pointerEvents: "auto",
        }}
        className={slideInAnimation}
      >
        <div className="d4m-flex d4m-flex-col">
          <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-mb-4">
            <Search size={18} className="d4m-opacity-75" />
            <span className="d4m-text-base d4m-font-medium">
              HubSpot Commands
              {slashFilter && (
                <span
                  className="d4m-ml-2 d4m-px-2 d4m-py-0.5 d4m-text-sm d4m-rounded"
                  style={{
                    backgroundColor: `${accentColorHex}20`, // 20 is hex for 12% opacity
                    color: accentColorHex,
                  }}
                >
                  {slashFilter}
                </span>
              )}
            </span>
          </div>

          <div className={`d4m-mb-3 d4m-text-sm ${fadeInAnimation}`}>
            Type <span className="d4m-font-medium">"/contact"</span>,{" "}
            <span className="d4m-font-medium">"/company"</span>,{" "}
            <span className="d4m-font-medium">"/deal"</span>, etc. followed by a
            space to select a command.
          </div>

          <div
            className={`d4m-flex d4m-items-center d4m-gap-2 d4m-p-3 d4m-rounded-md ${bgColorClass} d4m-text-sm ${fadeInAnimation}`}
          >
            <Info size={16} className="d4m-flex-shrink-0" />
            <span>
              Select a command to see relevant actions for managing your HubSpot
              data.
            </span>
          </div>
        </div>
      </Overlay>
    );
  }

  return null;
};

export default HubspotModularOptions;
