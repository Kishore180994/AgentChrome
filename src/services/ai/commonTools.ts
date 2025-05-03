import { DOMAction } from "./../../types/actionType";
import { SchemaType, Tool } from "@google/generative-ai";

export const commonTools: Tool[] = [
  {
    functionDeclarations: [
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
              nullable: true,
            },
            selector: {
              type: SchemaType.STRING,
              description:
                "Optional CSS selector for the element, if applicable",
              nullable: true,
            },
          },
          required: ["index"],
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
              nullable: true,
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
                    "Evaluation of the previous goal based on prior actions (e.g., PASS, FAIL, IN_PROGRESS, PENDING)",
                },
                // --- Updated Memory Structure ---
                memory: {
                  type: SchemaType.OBJECT,
                  description:
                    "Hierarchical memory context tracking task progress",
                  properties: {
                    overall_goal: {
                      type: SchemaType.STRING,
                      description: "The user's main objective for this task.",
                    },
                    phases: {
                      type: SchemaType.ARRAY,
                      description: "Logical stages or phases of the task.",
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          id: {
                            type: SchemaType.STRING,
                            description:
                              "Unique identifier for the phase (e.g., 'login', 'search').",
                          },
                          name: {
                            type: SchemaType.STRING,
                            description:
                              "User-friendly name for the phase (e.g., 'Logging In').",
                          },
                          status: {
                            type: SchemaType.STRING,
                            description: "Current status of this phase.",
                            enum: ["PENDING", "IN_PROGRESS", "PASS", "FAIL"],
                          },
                          steps: {
                            type: SchemaType.ARRAY,
                            description:
                              "Individual action steps within this phase.",
                            items: {
                              type: SchemaType.OBJECT,
                              properties: {
                                step_number: {
                                  type: SchemaType.STRING,
                                  description:
                                    "Sequential identifier within the phase (e.g., '1.1', '1.2').",
                                },
                                type: {
                                  type: SchemaType.STRING,
                                  description:
                                    "Type of step, typically 'action'.",
                                  nullable: true, // Optional field
                                },
                                description: {
                                  type: SchemaType.STRING,
                                  description:
                                    "Description of the action performed or planned.",
                                },
                                status: {
                                  type: SchemaType.STRING,
                                  description:
                                    "Current status of this specific step.",
                                  enum: [
                                    "PENDING",
                                    "IN_PROGRESS",
                                    "PASS",
                                    "FAIL",
                                  ],
                                },
                                rationale: {
                                  type: SchemaType.STRING,
                                  description: "Reasoning behind this step.",
                                  nullable: true, // Optional field
                                },
                                expected_outcome: {
                                  type: SchemaType.STRING,
                                  description:
                                    "What is expected after this step completes.",
                                  nullable: true, // Optional field
                                },
                                action_details: {
                                  type: SchemaType.OBJECT,
                                  description:
                                    "Specific parameters used in the action function call.",
                                  nullable: true, // Optional field
                                  // Note: Defining specific properties for action_details might be overly complex; OBJECT allows flexibility.
                                },
                                error_info: {
                                  type: SchemaType.STRING,
                                  description:
                                    "Details if the step status is FAIL.",
                                  nullable: true, // Optional field
                                },
                              },
                              required: [
                                "step_number",
                                "description",
                                "status",
                              ],
                            },
                          },
                        },
                        required: ["id", "name", "status", "steps"],
                      },
                    },
                    gathered_data: {
                      type: SchemaType.OBJECT,
                      description:
                        "Key-value store for important information collected during the task. Can be an empty object.",
                      // Note: Using OBJECT allows arbitrary key-value pairs. Explicit properties aren't practical here.
                      // Consider adding `additionalProperties: { type: SchemaType.STRING }` if values are always strings,
                      // but OBJECT provides more flexibility for mixed types.
                    },
                    final_outcome: {
                      type: SchemaType.OBJECT,
                      description:
                        "Object summarizing the final result of the task, populated only when 'done' is called.",
                      nullable: true, // This entire object is null until the task finishes.
                      properties: {
                        status: {
                          type: SchemaType.STRING,
                          description: "Final status of the overall task.",
                          enum: ["PASS", "FAIL"],
                        },
                        message: {
                          type: SchemaType.STRING,
                          description: "Summary message of the final outcome.",
                        },
                        output: {
                          type: SchemaType.STRING,
                          description:
                            "Optional final output data (e.g., order ID, extracted text).",
                          nullable: true,
                        },
                      },
                      required: ["status", "message"],
                    },
                  },
                  required: ["overall_goal", "phases", "gathered_data"], // final_outcome is required to exist but can be null initially
                },
                // --- End of Updated Memory Structure ---
                current_goal: {
                  type: SchemaType.STRING,
                  description:
                    "The immediate goal or next action the AI intends to accomplish.",
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
