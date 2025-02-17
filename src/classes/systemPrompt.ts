/*******************************************************
 * systemPrompt.ts
 *
 * This class, SystemPrompt, generates a system-level
 * instruction (SystemMessage) ensuring the AI responds
 * with the new "AgentResponseFormat" from responseFormat.ts,
 * which includes "current_state" + "action[]", where
 * each item in "action" matches AgentActionItem from
 * actionTypes.ts
 *******************************************************/

import { agentPrompt, inputString } from "../utils/prompts";

/**
 * Minimal example definitions. If you have real ones,
 * keep or remove these placeholders.
 */
export class SystemMessage {
  content: string;

  constructor(content: string) {
    this.content = content;
  }
}

/**
 * The SystemPrompt class references your new response format:
 *
 * - "current_state": { page_summary, evaluation_previous_goal, memory, next_goal }
 * - "action": [ AgentActionItem, ... ]
 *
 * but doesn't redefine them here. Instead, it ensures the AI
 * must produce that structure, referencing actionTypes.ts for
 * valid single-key action objects like "click_element", "input_text", etc.
 */
export class SystemPrompt {
  private defaultActionDescription: string;
  private maxActionsPerStep: number;

  constructor(actionDescription: string, maxActionsPerStep: number = 10) {
    this.defaultActionDescription = actionDescription;
    this.maxActionsPerStep = maxActionsPerStep;
  }

  /**
   * Returns the important rules for the agent,
   * pulled from your "agentPrompt" definition,
   * plus a reminder of the maximum actions.
   */
  public importantRules(): string {
    let text = agentPrompt; // references the multi-line prompt from "../utils/prompts"
    text += `   - use maximum ${this.maxActionsPerStep} actions per sequence`;
    return text;
  }

  /**
   * Additional instructions or format references,
   * referencing your "inputString" definition.
   */
  public inputFormat(): string {
    return inputString;
  }

  /**
   * Composes the final system prompt. This
   * instructs the AI to produce strictly valid JSON
   * matching your "AgentResponseFormat" from responseFormat.ts:
   *
   * {
   *   "current_state": {...},
   *   "action": [... single-key action objects ...]
   * }
   *
   * And references "actionTypes.ts" for valid keys in each item.
   */
  public getSystemMessage(): SystemMessage {
    const AGENT_PROMPT = `${agentPrompt}

${this.inputFormat()}

${this.importantRules()}

Functions:
${this.defaultActionDescription}

Remember: Your responses must be valid JSON in the required format:
- Top-level keys: "current_state" and "action" ONLY.
- "action" is an array of objects, each with exactly one key from the possible set:
  "click_element", "input_text", "open_tab", "go_to_url", "extract_content",
  "scroll", "submit_form", "key_press", "verify", or "done".
- Do not include extra top-level fields like "nextStep" or "errorStep".
- Provide only "current_state" and "action" at the top level.`;

    return new SystemMessage(AGENT_PROMPT);
  }
}
