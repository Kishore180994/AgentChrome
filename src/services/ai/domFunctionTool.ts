import { SchemaType, Tool } from "@google/generative-ai";

export const domTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "clickElement",
        description: "Clicks an interactive element on the page",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            childId: {
              type: SchemaType.NUMBER,
              description: "Optional child element ID, if applicable",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
            },
          },
          required: ["index"],
        },
      },
      {
        name: "inputText",
        description: "Enters text into an input element on the page",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            text: {
              type: SchemaType.STRING,
              description: "Required text to input",
            },
            childId: {
              type: SchemaType.NUMBER,
              description: "Optional child element ID, if applicable",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
            },
          },
          required: ["index", "text"],
        },
      },
      {
        name: "submitForm",
        description: "Submits a form by clicking the submit button/element",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            childId: {
              type: SchemaType.NUMBER,
              description: "Optional child element ID, if applicable",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
            },
          },
          required: ["index"],
        },
      },
      {
        name: "keyPress",
        description: "Simulates a key press on an element",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            key: {
              type: SchemaType.STRING,
              description: "Required key to press",
            },
            childId: {
              type: SchemaType.NUMBER,
              description: "Optional child element ID, if applicable",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
            },
          },
          required: ["index", "key"],
        },
      },
      {
        name: "scroll",
        description: "Scrolls the page up or down",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            direction: {
              type: SchemaType.STRING,
              enum: ["up", "down"],
              description: "Required scroll direction",
            },
            offset: {
              type: SchemaType.NUMBER,
              description: "Required scroll offset",
            },
          },
          required: ["direction", "offset"],
        },
      },
      {
        name: "goToUrl",
        description: "Navigates to a new URL",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            url: {
              type: SchemaType.STRING,
              description: "Required URL to navigate to",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "openTab",
        description: "Opens a new tab with the specified URL",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            url: {
              type: SchemaType.STRING,
              description: "Required URL for the new tab",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "extractContent",
        description: "Extracts content from an element",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            childId: {
              type: SchemaType.NUMBER,
              description: "Optional child element ID, if applicable",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
            },
          },
          required: ["index"],
        },
      },
      {
        name: "verify",
        description: "Verifies the current URL",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            url: {
              type: SchemaType.STRING,
              description: "Required URL to verify",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "done",
        description: "Indicates task completion",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            message: {
              type: SchemaType.STRING,
              description: "Required message indicating completion status",
            },
            output: {
              type: SchemaType.STRING,
              description: "Optional output, e.g., game move or task result",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "ask",
        description:
          "Asks the user a question for clarification or confirmation",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            question: {
              type: SchemaType.STRING,
              description: "Required question to ask the user",
            },
          },
          required: ["question"],
        },
      },
      {
        name: "reportCurrentState",
        description:
          "Reports the current state of the task, mandatory for every response",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            current_state: {
              type: SchemaType.OBJECT,
              description:
                "Current state of the task, reflecting the context of other function calls in the response",
              properties: {
                page_summary: {
                  type: SchemaType.STRING,
                  description:
                    "Summary of the current page, reflecting actions taken or expected",
                },
                evaluation_previous_goal: {
                  type: SchemaType.STRING,
                  description:
                    "Evaluation of the previous goal based on prior actions",
                },
                memory: {
                  type: SchemaType.OBJECT,
                  description: "Memory context tracking task steps",
                  properties: {
                    steps: {
                      type: SchemaType.ARRAY,
                      description: "List of task steps with their status",
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          step_number: {
                            type: SchemaType.STRING,
                            description: "Step identifier, e.g., 'Step 1'",
                          },
                          description: {
                            type: SchemaType.STRING,
                            description: "Description of the step",
                          },
                          status: {
                            type: SchemaType.STRING,
                            enum: ["PENDING", "IN_PROGRESS", "PASS", "FAIL"],
                            description: "Status of the step",
                          },
                        },
                        required: ["step_number", "description", "status"],
                      },
                    },
                  },
                  required: ["steps"],
                },
                current_goal: {
                  type: SchemaType.STRING,
                  description:
                    "Current goal of the task, aligned with other function calls",
                },
              },
              required: [
                "page_summary",
                "evaluation_previous_goal",
                "memory",
                "current_goal",
              ],
            },
          },
          required: ["current_state"],
        },
      },
    ],
  },
];
