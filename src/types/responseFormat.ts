// responseFormat.ts

import { MemoryState } from "./memoryTypes";

/**
 * The AI must always return JSON of this shape:
 *
 * {
 *   "current_state": {
 *     "page_summary": "...",
 *     "evaluation_previous_goal": "Success|Failed|Unknown - ...",
 *     "memory": "...",
 *     "next_goal": "..."
 *   },
 *   "action": [
 *     { "one_action_name": { ... } },
 *     ...
 *   ]
 * }
 */
export interface StepState {
  step_number: string;
  description: string;
  status:
    | "PASS"
    | "FAIL"
    | "PENDING"
    | "IN_PROGRESS"
    | "pass"
    | "passed"
    | "fail"
    | "failed"
    | "pending"
    | "in_progress"
    | "in progress";
}

export interface AgentResponseFormat {
  current_state: AIResponseFormat;
  action: Array<{ [key: string]: any }>;
}
/**
 * The `current_state` portion
 */
export interface AIResponseFormat {
  user_command?: string;
  /**
   * Quick detailed summary of new info from the current page
   * which is not yet in the task history memory. Be specific
   * with details which are important for the task. If all info
   * is already in memory, leave it empty.
   */
  page_summary: string;

  /**
   * "Success|Failed|Unknown" plus short explanation:
   * "Analyze the current elements and the image to check if the previous
   * goals/actions are successful like intended by the task.
   * Ignore the action result. The website is the ground truth.
   * Also mention if something unexpected happened."
   */
  evaluation_previous_goal: string;

  /**
   * "Description of what has been done and what you need to remember.
   * Be very specific. Count always how many times you have done
   * something and how many remain. e.g. '0 out of 10 websites analyzed.'
   * Continue with abc and xyz."
   */
  memory: MemoryState;

  current_goal: string;
}
