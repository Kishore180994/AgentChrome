import { Tool } from "@google/generative-ai";
import { googleWorkspaceTools } from "./googleWorkspaceTool";
import { domTools } from "./domFunctionTool";
import { hubspotModularTools } from "./hubspotTool";

export const googleTools: Tool[] = [...googleWorkspaceTools, ...domTools];
// Initialize HSTools with all hubspot tools by default
// This will be conditionally filtered in providers.ts based on selected command
export const HSTools: Tool[] = [...hubspotModularTools];
export { hubspotModularTools };
