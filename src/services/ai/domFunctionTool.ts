import { DOMAction } from "./../../types/actionType";
import { SchemaType, Tool } from "@google/generative-ai";

export const domTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: DOMAction.clickElement.name,
        description: DOMAction.clickElement.description,
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
        name: DOMAction.inputText.name,
        description: DOMAction.inputText.description,
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
        name: DOMAction.selectRadioButton.name,
        description: DOMAction.selectDropdown.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            value: {
              type: SchemaType.STRING,
              description:
                "Value of the radio button to select (optional if index is sufficient)",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the radio group, if applicable",
            },
          },
          required: ["index"],
        },
      },
      {
        name: DOMAction.selectDropdown.name,
        description: DOMAction.selectDropdown.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            value: {
              type: SchemaType.STRING,
              description: "Value to select in the dropdown",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the dropdown, if applicable",
            },
          },
          required: ["index", "value"],
        },
      },
      {
        name: DOMAction.selectMultiDropdown.name,
        description: DOMAction.selectMultiDropdown.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            index: {
              type: SchemaType.NUMBER,
              description:
                "Required element index from the Interactive Elements list",
            },
            values: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Array of values to select in the multi-select dropdown",
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the dropdown, if applicable",
            },
          },
          required: ["index", "values"],
        },
      },
      {
        name: DOMAction.submitForm.name,
        description: DOMAction.submitForm.description,
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
        name: DOMAction.keyPress.name,
        description: DOMAction.keyPress.description,
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
        name: DOMAction.scroll.name,
        description: DOMAction.scroll.description,
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
        name: DOMAction.goToUrl.name,
        description: DOMAction.goToUrl.description,
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
        name: DOMAction.openTab.name,
        description: DOMAction.openTab.description,
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
        name: DOMAction.extractContent.name,
        description: DOMAction.extractContent.description,
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
        name: DOMAction.verify.name,
        description: DOMAction.verify.description,
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
        name: DOMAction.done.name,
        description: DOMAction.done.description,
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
        name: DOMAction.ask.name,
        description: DOMAction.ask.description,
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
        name: DOMAction.reportCurrentState.name,
        description: DOMAction.reportCurrentState.description,
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
