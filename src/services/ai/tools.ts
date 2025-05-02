import { Tool } from "@google/generative-ai";
import { googleWorkspaceTools } from "./googleWorkspaceTool";
import { domTools } from "./domFunctionTool";
import { hubspotModularTools } from "./hubspotTool";

const selectedTool = hubspotModularTools.find(
  (tool) => tool.toolGroupName === "contact"
);
export const googleTools: Tool[] = [...googleWorkspaceTools, ...domTools];
export const HSTools: Tool[] = selectedTool ? [selectedTool] : [];
