import React from "react";
import { HotkeyItem } from "./HotkeyItem";

export const HotkeysPanel: React.FC = () => {
  return (
    <div
      className="
        ext-relative ext-bg-gray-800/80 ext-p-6 ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl ext-backdrop-blur-md
      "
    >
      <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200 ext-mb-3">
        Hotkeys
      </h2>
      <div className="ext-space-y-3">
        <HotkeyItem keys={["⌘", "Shift", "L"]} action="Toggle Listening" />
        <HotkeyItem keys={["⌘", "Shift", "W"]} action="Toggle Watching" />
        <HotkeyItem keys={["⌘", "Click"]} action="Perform Action" />
        <HotkeyItem keys={["⌘", "Right Click"]} action="Context Menu" />
      </div>
    </div>
  );
};
