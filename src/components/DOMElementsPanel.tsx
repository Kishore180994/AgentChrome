import React from "react";
import { Eye } from "lucide-react";

import { ControlButton } from "./ControlButton";
import { ReactMessage } from "../types/messages";

interface DOMElementsPanelProps {
  sendToContentScript: (message: ReactMessage) => void;
}

export const DOMElementsPanel: React.FC<DOMElementsPanelProps> = ({
  sendToContentScript,
}) => {
  return (
    <div
      className="
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200 ext-mb-4">
        DOM Elements
      </h2>
      <div className="ext-flex ext-items-center ext-gap-4">
        <ControlButton
          onClick={() =>
            sendToContentScript({
              type: "FROM_REACT_APP",
              action: "SHOW_PAGE_ELEMENTS",
            })
          }
          icon={Eye}
          text="Show Elements"
        />
        <ControlButton
          onClick={() =>
            sendToContentScript({
              type: "FROM_REACT_APP",
              action: "HIDE_PAGE_ELEMENTS",
            })
          }
          icon={Eye}
          text="Hide Elements"
          variant="danger"
        />
      </div>
    </div>
  );
};
