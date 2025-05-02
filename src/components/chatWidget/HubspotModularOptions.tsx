import React from "react";
import { AccentColor } from "../../utils/themes";
import Overlay from "./overlay";
import { hubspotModularTools } from "../../services/ai/hubspotTool";
import { FunctionDeclaration } from "@google/generative-ai";

// Define the tool group type based on the hubspotModularTools export
type HubSpotToolGroup = {
  toolGroupName: string;
  functionDeclarations?: Array<FunctionDeclaration>;
};

interface ThemeStyle {
  container?: string;
  messageBubble?: string;
  suggestion?: string;
  [key: string]: string | undefined;
}

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
        >
          <div>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: 12,
                fontSize: 18,
              }}
            >
              No actions available for /{selectedCommand}
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
      >
        <div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 12,
              fontSize: 18,
            }}
          >
            Available Actions for{" "}
            <span
              style={{
                color:
                  accentColor === "white"
                    ? "#ea580c"
                    : `var(--${accentColor}-500)`,
              }}
            >
              /{selectedCommand}
            </span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {selectedToolGroup.functionDeclarations.map((action) => (
              <li key={action.name} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 16 }}>
                  {formatFunctionName(action.name)}
                </div>
                <div
                  style={{
                    marginLeft: 12,
                    color: mode === "light" ? "#6b7280" : "#9ca3af",
                    fontSize: 14,
                  }}
                >
                  {action.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Overlay>
    );
  }

  // Display slash command options when no command is selected yet but slash is active
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
      >
        <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>
          Command Options for{" "}
          <span style={{ color: "#b91c1c" }}>/ {slashFilter || "..."}</span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {hubspotSlashCommands
            .filter((cmd) => cmd.command.startsWith(slashFilter))
            .map((cmd) => (
              <li key={cmd.command} style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 16 }}>
                  / {cmd.command}
                </span>
                <span
                  style={{
                    marginLeft: 12,
                    color: mode === "light" ? "#666" : "#9ca3af",
                    fontSize: 14,
                  }}
                >
                  {cmd.description}
                </span>
              </li>
            ))}
          {hubspotSlashCommands.filter((cmd) =>
            cmd.command.startsWith(slashFilter)
          ).length === 0 && (
            <li
              style={{
                color: mode === "light" ? "#999" : "#6b7280",
                fontSize: 14,
              }}
            >
              No matching commands
            </li>
          )}
        </ul>
      </Overlay>
    );
  }

  return null;
};

export default HubspotModularOptions;
