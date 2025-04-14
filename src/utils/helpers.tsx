import React from "react";

interface StarfallCascadeAnimationProps {
  accentColor: string;
  textColor: string;
}

const StarfallCascadeAnimation: React.FC<StarfallCascadeAnimationProps> = ({
  accentColor,
  textColor,
}) => {
  return (
    <div className="d4m-relative d4m-w-full d4m-h-[48px] d4m-overflow-hidden d4m-flex d4m-items-center d4m-justify-center">
      <div className="d4m-w-full d4m-h-full d4m-relative">
        <div
          className={`d4m-absolute d4m-left-[25%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-1 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
        <div
          className={`d4m-absolute d4m-left-[50%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-2 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
        <div
          className={`d4m-absolute d4m-right-[25%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-3 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
      </div>
      <span
        className={`d4m-absolute d4m-top-1/2 d4m-left-1/2 d4m-transform d4m--translate-x-1/2 d4m--translate-y-1/2 ${textColor} d4m-text-sm d4m-font-medium`}
      >
        Processing...
      </span>
    </div>
  );
};

export default StarfallCascadeAnimation;

export const geminiFunctionDeclarations = [
  // Function to create a new Google Doc
  {
    name: "createNewGoogleDoc",
    description:
      "Creates a new Google Document in the user's Drive, optionally inserting initial text content. Use this when the user asks to create or draft something in a new Google Doc and is not currently viewing a specific Doc.",
    parameters: {
      type: "OBJECT",
      properties: {
        fileName: {
          type: "STRING",
          description:
            "The desired file name for the new Google Doc. Generate a descriptive name if not specified by the user (e.g., 'Draft Email to Dad').",
        },
        initialText: {
          type: "STRING",
          description:
            "Optional. The initial text content (e.g., drafted email, notes) to insert into the newly created document.",
        },
      },
      required: ["fileName"], // Filename is essential
    },
  },
  // Function to interact with an existing Doc/Sheet or perform other Apps Script actions
  {
    name: "callWorkspaceAppsScript",
    description:
      "Executes a specific function via a secure Google Apps Script backend to interact with Google Workspace files (Docs, Sheets, etc.) identified by their fileId. Use this for reading, writing, modifying content, or performing other actions within a specific Google Doc or Sheet.",
    parameters: {
      type: "OBJECT",
      properties: {
        scriptFunction: {
          type: "STRING",
          description:
            "The exact name of the function to execute within the deployed Google Apps Script (e.g., 'updateSheetCell', 'insertDocText', 'readSheetRange', 'appendSheetRow', 'getDocContent', 'getFileName').",
        },
        fileId: {
          type: "STRING",
          description:
            "The unique ID of the target Google Doc or Sheet file. This MUST be obtained from the user's current context (e.g., extracted from the active tab URL if they are viewing a Doc/Sheet) or from the result of creating a new document.",
        },
        functionArgs: {
          type: "OBJECT",
          description:
            "An object containing the specific named arguments required by the target 'scriptFunction' in Apps Script. Structure depends on the function being called (e.g., for 'updateSheetCell', required args are sheetName, cellNotation, value; for 'insertDocText', required args are text, insertionPoint).",
        },
      },
      required: ["scriptFunction", "fileId", "functionArgs"],
    },
  },
  // TODO: You might later add a function declaration for your ActionExecutor
  // if you want Gemini to explicitly request simple DOM actions too, e.g.:
  // { "name": "executeSimpleDomAction", "description": "Performs simple DOM actions...", "parameters": {...}}
];

// You'll also need to define the 'Tool' structure Gemini expects
export const geminiTools = [
  { functionDeclarations: geminiFunctionDeclarations },
];
