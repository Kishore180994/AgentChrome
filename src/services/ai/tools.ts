import { Tool } from "@google/generative-ai";
import { googleWorkspaceTools } from "./googleWorkspaceTool";
import { domTools } from "./domFunctionTool";
import { hubspotTools } from "./hubspotTool";

export const googleTools: Tool[] = [...googleWorkspaceTools, ...domTools];
export const HSTools: Tool[] = [...hubspotTools];
