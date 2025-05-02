import { LocalAction } from "../types/actionType";

export class ActionError extends Error {
  action: LocalAction;
  constructor(action: LocalAction, message: string) {
    super(message);
    this.action = action;
    this.name = "ActionError";
  }
}
export class HubspotApiError extends Error {
  status: number;
  category?: string;
  details?: any;
  constructor(
    message: string,
    status: number,
    category?: string,
    details?: any
  ) {
    super(message);
    this.name = "HubspotApiError";
    this.status = status;
    this.category = category;
    this.details = details;
  }
}
