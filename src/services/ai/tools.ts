import { Tool } from "@google/generative-ai";
import { googleWorkspaceTools } from "./googleWorkspaceTool";
import { domTools } from "./domFunctionTool";
import { hubspotModularTools } from "./hubspotTool";
import { commonTools } from "./commonTools";

const selectedTool = hubspotModularTools.find(
  (tool) => tool.toolGroupName === "contact"
);

export const googleTools: Tool[] = [
  ...googleWorkspaceTools,
  ...domTools,
  ...commonTools,
];

// Create a copy of the selected tool without the toolGroupName property
// This is necessary because the Gemini API doesn't recognize this custom property
export const HSTools: Tool[] = [];

// Only add the tool to HSTools if it was found and has functionDeclarations
if (selectedTool && "functionDeclarations" in selectedTool) {
  HSTools.push({
    functionDeclarations: selectedTool.functionDeclarations,
  });
  HSTools.push(...commonTools);
}
