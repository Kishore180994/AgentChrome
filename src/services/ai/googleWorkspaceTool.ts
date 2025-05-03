import { SchemaType, Tool } from "@google/generative-ai";

export const googleWorkspaceTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "google_workspace_createNewGoogleDoc",
        description:
          "Creates a new Google Document with optional structured content.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileName: {
              type: SchemaType.STRING,
              description: "Name of the new document.",
            },
            content: {
              type: SchemaType.ARRAY,
              description: "Optional structured content for the new document.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  type: {
                    type: SchemaType.STRING,
                    enum: [
                      "heading",
                      "paragraph",
                      "bullet",
                      "numbered_list",
                      "todo",
                    ],
                    description: "Type of content block.",
                  },
                  text: {
                    type: SchemaType.STRING,
                    description: "Content text.",
                  },
                  style: {
                    type: SchemaType.STRING,
                    enum: [
                      "HEADING_1",
                      "HEADING_2",
                      "HEADING_3",
                      "HEADING_4",
                      "HEADING_5",
                      "HEADING_6",
                    ],
                    description: "Heading style if type is heading.",
                  },
                  checked: {
                    type: SchemaType.BOOLEAN,
                    description: "Checked status if type is todo.",
                  },
                },
                required: ["type", "text"],
              },
            },
          },
          required: ["fileName"],
        },
      },
      {
        name: "google_workspace_insertStructuredDocContent",
        description:
          "Inserts structured content into an existing Google Document.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
            content: {
              type: SchemaType.ARRAY,
              description: "Structured content blocks to insert.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  type: {
                    type: SchemaType.STRING,
                    enum: [
                      "heading",
                      "paragraph",
                      "bullet",
                      "numbered_list",
                      "todo",
                    ],
                    description: "Type of content block.",
                  },
                  text: {
                    type: SchemaType.STRING,
                    description: "Content text.",
                  },
                  style: {
                    type: SchemaType.STRING,
                    enum: [
                      "HEADING_1",
                      "HEADING_2",
                      "HEADING_3",
                      "HEADING_4",
                      "HEADING_5",
                      "HEADING_6",
                    ],
                    description: "Heading style if type is heading.",
                  },
                  checked: {
                    type: SchemaType.BOOLEAN,
                    description: "Checked status if type is todo.",
                  },
                },
                required: ["type", "text"],
              },
            },
          },
          required: ["fileId", "content"],
        },
      },
      {
        name: "google_workspace_updateDocText",
        description: "Updates specific text in a Google Document.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
            searchText: {
              type: SchemaType.STRING,
              description: "Text to find.",
            },
            replaceText: {
              type: SchemaType.STRING,
              description: "Replacement text.",
            },
          },
          required: ["fileId", "searchText", "replaceText"],
        },
      },
      {
        name: "google_workspace_appendDocText",
        description: "Appends plain text at the end of a Google Document.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
            text: {
              type: SchemaType.STRING,
              description: "Text to append.",
            },
          },
          required: ["fileId", "text"],
        },
      },
      {
        name: "google_workspace_deleteDocText",
        description:
          "Deletes occurrences of specified text from a Google Document.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
            text: {
              type: SchemaType.STRING,
              description: "Exact text to delete.",
            },
          },
          required: ["fileId", "text"],
        },
      },
      {
        name: "google_workspace_getDocContent",
        description: "Retrieves the text content of a Google Document.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
          },
          required: ["fileId"],
        },
      },
      {
        name: "google_workspace_getDocFileName",
        description: "Gets the name of a Google Document file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "ID of the Google Document.",
            },
          },
          required: ["fileId"],
        },
      },
      {
        name: "google_workspace_createNewGoogleSheet",
        description: "Creates a new Google Sheet with optional initial sheets.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileName: {
              type: SchemaType.STRING,
              description: "Name of the Google Sheet.",
            },
            sheetNames: {
              type: SchemaType.ARRAY,
              description: "Names of initial sheets.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["fileName"],
        },
      },
      {
        name: "google_workspace_appendSheetRow",
        description: "Appends a row of data to a specified sheet.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "Google Sheet ID.",
            },
            sheetName: {
              type: SchemaType.STRING,
              description: "Sheet name.",
            },
            values: {
              type: SchemaType.ARRAY,
              description: "Row values.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["fileId", "sheetName", "values"],
        },
      },
      {
        name: "google_workspace_updateSheetCell",
        description: "Updates the value of a specific cell in a Google Sheet.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "Google Sheet ID.",
            },
            sheetName: {
              type: SchemaType.STRING,
              description: "Sheet name.",
            },
            cell: {
              type: SchemaType.STRING,
              description: "Cell (e.g., A1).",
            },
            value: {
              type: SchemaType.STRING,
              description: "Cell value.",
            },
          },
          required: ["fileId", "sheetName", "cell", "value"],
        },
      },
      {
        name: "google_workspace_getSheetData",
        description: "Retrieves data from a specified range in a Google Sheet.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "Google Sheet ID.",
            },
            sheetName: {
              type: SchemaType.STRING,
              description: "Sheet name.",
            },
            range: {
              type: SchemaType.STRING,
              description: "Range (e.g., A1:C10).",
            },
          },
          required: ["fileId", "sheetName", "range"],
        },
      },
      {
        name: "google_workspace_deleteSheetRow",
        description: "Deletes a specific row from a Google Sheet.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "Google Sheet ID.",
            },
            sheetName: {
              type: SchemaType.STRING,
              description: "Sheet name.",
            },
            rowNumber: {
              type: SchemaType.INTEGER,
              description: "Row number to delete.",
            },
          },
          required: ["fileId", "sheetName", "rowNumber"],
        },
      },
    ],
  },
];
