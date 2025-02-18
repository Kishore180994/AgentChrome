import { LocalAction } from "../types/actionType";

export class ActionError extends Error {
  action: LocalAction;
  constructor(action: LocalAction, message: string) {
    super(message);
    this.action = action;
    this.name = "ActionError";
  }
}
