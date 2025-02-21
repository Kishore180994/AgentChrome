import { LocalActionType } from "./../types/actionType";
import { AgentActionItem, LocalAction } from "../types/actionType";

export function mapAiItemToLocalAction(item: AgentActionItem): LocalAction {
  const actionName = Object.keys(item)[0];
  const params = (item as any)[actionName] || {};

  let type: LocalActionType = "wait";
  let description = actionName;

  switch (actionName) {
    case "click_element":
      type = "click";
      break;
    case "input_text":
      type = "input_text";
      break;
    case "open_tab":
    case "go_to_url":
    case "navigate":
      type = "navigate";
      break;
    case "extract_content":
      type = "extract";
      break;
    case "submit_form":
      type = "submit_form";
      break;
    case "key_press":
      type = "key_press";
      break;
    case "scroll":
      type = "scroll";
      break;
    case "verify":
      type = "verify";
      break;
    case "done":
      type = "done";
      break;
    default:
      console.warn("[mapAiItemToLocalAction] Unknown action name:", actionName);
      break;
  }

  return {
    id: params.id || "", // Add the id property
    type,
    description,
    data: {
      url: params.url,
      text: params.text,
      index: params.index,
      selector: params.selector,
      key: params.key,
      direction: params.direction,
      offset: params.offset,
    },
  };
}
