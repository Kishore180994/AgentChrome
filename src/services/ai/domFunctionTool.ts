import { DOMAction } from "../../types/actionType";
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
        name: DOMAction.goToExistingTab.name,
        description: DOMAction.goToExistingTab.description,
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
    ],
  },
];
