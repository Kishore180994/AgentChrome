// src/types/memoryTypes.ts

export type Status = "PENDING" | "IN_PROGRESS" | "PASS" | "FAIL";

export interface Step {
  step_number: string;
  type?: string | null;
  description: string;
  status: Status;
  rationale?: string | null;
  expected_outcome?: string | null;
  action_details?: Record<string, any> | null; // Or a more specific type if possible
  error_info?: string | null;
}

export interface Phase {
  id: string;
  name: string;
  status: Status;
  steps: Step[];
}

export interface FinalOutcome {
  status: "PASS" | "FAIL";
  message: string;
  output?: string | null;
}

export interface MemoryState {
  overall_goal: string;
  phases: Phase[];
  gathered_data: Record<string, any>; // Or more specific type
  final_outcome: FinalOutcome | null;
}

// Maybe include the whole current_state if needed elsewhere
// export interface CurrentState {
//   page_summary: string;
//   evaluation_previous_goal: string;
//   memory: MemoryState;
//   current_goal: string;
// }
