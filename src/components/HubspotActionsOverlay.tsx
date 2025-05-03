// src/components/HubspotActionsOverlay.tsx
import React from "react";
import { hubspotModularTools } from "../services/ai/hubspotTool";
import { AccentColor } from "../utils/themes";

interface HubspotActionsOverlayProps {
  selectedCommand: string | null;
  mode: "light" | "dark";
  accentColor: AccentColor;
}

const HubspotActionsOverlay: React.FC<HubspotActionsOverlayProps> = ({
  selectedCommand,
  mode,
  accentColor,
}) => {
  if (!selectedCommand) {
    return null;
  }

  const selectedToolGroup = hubspotModularTools.find(
    (tool) => tool.toolGroupName === selectedCommand
  ) as
    | {
        toolGroupName: string;
        functionDeclarations?: { name: string; description: string }[];
      }
    | undefined;

  if (!selectedToolGroup || !selectedToolGroup.functionDeclarations) {
    return (
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "12px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
          margin: "12px",
          maxWidth: "96%",
          marginLeft: "auto",
          marginRight: "auto",
          pointerEvents: "auto",
          backgroundColor:
            mode === "light"
              ? "rgba(255,255,255,0.97)"
              : "rgba(31, 41, 55, 0.97)",
          color: mode === "light" ? "#374151" : "#f9fafb",
        }}
        className="d4m-animate-fade-in"
      >
        <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>
          No actions available for /{selectedCommand}
        </div>
      </div>
    );
  }

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

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "20px 24px",
        borderRadius: "12px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        margin: "12px",
        maxWidth: "96%",
        marginLeft: "auto",
        marginRight: "auto",
        pointerEvents: "auto",
        backgroundColor:
          mode === "light"
            ? "rgba(255,255,255,0.97)"
            : "rgba(31, 41, 55, 0.97)",
        color: mode === "light" ? "#374151" : "#f9fafb",
      }}
      className="d4m-animate-fade-in"
    >
      <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>
        Available Actions for{" "}
        <span
          style={{
            color:
              accentColor === "white" ? "#ea580c" : `var(--${accentColor}-500)`,
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
  );
};

export default HubspotActionsOverlay;
