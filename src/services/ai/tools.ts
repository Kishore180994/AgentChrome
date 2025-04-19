import { Tool } from "@google/generative-ai";
import { googleWorkspaceTools } from "./googleWorkspaceTool";
import { domTools } from "./domFunctionTool";

export const geminiTools: Tool[] = [...googleWorkspaceTools, ...domTools];
